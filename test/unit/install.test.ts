import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { HELP, main, runInstall } from "../../install/install.ts";
import { NODE_PACKAGES } from "../../install/node.ts";
import { getSymlinks } from "../../install/symlinks.ts";
import { cleanupTempDirs, FakeRunner, makeCtx, makeFixtureRoot, snapshotTree, tempDir } from "../helpers.ts";

afterEach(cleanupTempDirs);

/**
 * Every tool present and already up to date, so the package steps are no-ops.
 * `overrides` are registered first so they win over the defaults.
 */
function upToDateMachine(prefix: string, overrides: [string, object][] = []) {
  mkdirSync(join(prefix, "opt", "fzf", "shell"), { recursive: true });
  writeFileSync(join(prefix, "opt", "fzf", "shell", "key-bindings.bash"), "");
  const fake = new FakeRunner(new Set(["brew", "npm", "pnpm", "rustup"]));
  for (const [command, result] of overrides) fake.on(command, result);
  const installed = Object.fromEntries(NODE_PACKAGES.map((p) => [p, {}]));
  return fake
    .on("pnpm list", { stdout: JSON.stringify([{ dependencies: installed }]) })
    .on("brew --prefix", { stdout: prefix })
    .on("brew info --json=v2 --cask", { stdout: JSON.stringify({ casks: [{ token: "ghostty" }] }) })
    .on("brew info --json=v2", { stdout: JSON.stringify({ formulae: [{ full_name: "jq" }] }) })
    .on("defaults read com.apple.dock", { stdout: "left" })
    .on("defaults read NSGlobalDomain InitialKeyRepeat", { stdout: "12" })
    .on("defaults read NSGlobalDomain KeyRepeat", { stdout: "1" })
    .on("rustup component list", { stdout: "rust-src\nclippy-x\nrustfmt-x\n" })
    .on("cargo install --list", { stdout: "cargo-edit v1.0.0:\n" });
}

describe("runInstall", () => {
  test("--skip-packages links everything and runs no package manager", async () => {
    const root = makeFixtureRoot();
    const fake = new FakeRunner();
    const ctx = makeCtx({ configsRoot: root, fake });

    expect(await runInstall(ctx, true)).toBe(0);

    for (const { source, target } of getSymlinks(root, ctx.home, "darwin")) expect(readlinkSync(target)).toBe(source);
    expect(fake.calls).toEqual([]);
    expect(ctx.logger.text()).toContain("Skipping package installations (--skip-packages flag)");
    expect(ctx.logger.text()).toContain("Installation Summary");
  });

  test("runs every package step on macOS", async () => {
    const root = makeFixtureRoot();
    const fake = upToDateMachine(tempDir());
    const ctx = makeCtx({ configsRoot: root, fake });

    expect(await runInstall(ctx, false)).toBe(0);

    const text = ctx.logger.text();
    for (const step of ["macOS system settings", "Homebrew installation", "Brewfile deprecation audit", "Node.js packages", "Rust toolchain"]) {
      expect(text).toContain(`Running: ${step}`);
    }
    expect(fake.mutatingCommands()).toContain(`brew bundle --file ${join(root, "home", "Brewfile")}`);
  });

  test("skips the macOS steps elsewhere", async () => {
    const ctx = makeCtx({ configsRoot: makeFixtureRoot(), fake: upToDateMachine(tempDir()), platform: "linux" });
    await runInstall(ctx, false);
    expect(ctx.logger.text()).not.toContain("macOS system settings");
    expect(ctx.logger.text()).not.toContain("Detected macOS");
    expect(ctx.logger.text()).toContain("Running: Rust toolchain");
  });

  test("full dry-run: every step reports, nothing mutating runs, nothing on disk changes", async () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, ".git"));
    const fake = upToDateMachine(tempDir(), [["defaults read com.apple.dock", { stdout: "bottom" }]]);
    const ctx = makeCtx({ dryRun: true, configsRoot: root, fake });
    const home = snapshotTree(ctx.home);
    const fixture = snapshotTree(root);

    expect(await runInstall(ctx, false)).toBe(0);

    expect(fake.mutatingCommands()).toEqual([]);
    expect(snapshotTree(ctx.home)).toEqual(home);
    expect(snapshotTree(root)).toEqual(fixture);
    const text = ctx.logger.text();
    expect(text).toContain("DRY-RUN MODE");
    expect(text).toContain("Would run: git -C");
    expect(text).toContain("Would run: defaults write com.apple.dock orientation -string left");
    expect(text).toContain("Would run: brew bundle");
    expect(text).toContain("Would run: pnpm add -g");
    expect(text).toContain("Would run: rustup update stable");
    expect(text).toContain("Dry run completed!");
    expect(ctx.summary.some((i) => i.status === "planned")).toBe(true);
  });

  test("updates submodules when the root is a git repo, and warns if that fails", async () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, ".git"));
    const fake = new FakeRunner().on("git -C", { exitCode: 1 });
    const ctx = makeCtx({ configsRoot: root, fake });
    await runInstall(ctx, true);
    expect(fake.mutatingCommands()).toEqual([`git -C ${root} submodule update --init --recursive`]);
    expect(ctx.logger.text()).toContain("Failed to update git submodules (continuing)");
  });

  test("returns 1 when anything fails", async () => {
    const ctx = makeCtx({ configsRoot: tempDir(), fake: new FakeRunner() });
    expect(await runInstall(ctx, true)).toBe(1);
  });
});

describe("main", () => {
  const capture = () => {
    const out = spyOn(console, "log").mockImplementation(() => {});
    const err = spyOn(console, "error").mockImplementation(() => {});
    return {
      text: () => [...out.mock.calls, ...err.mock.calls].flat().join("\n"),
      restore: () => (out.mockRestore(), err.mockRestore()),
    };
  };

  test("--help prints usage", async () => {
    const io = capture();
    try {
      expect(await main(["--help"], {})).toBe(0);
      expect(io.text()).toContain(HELP.trim().split("\n")[0]);
    } finally {
      io.restore();
    }
  });

  test("rejects unknown flags before doing anything", async () => {
    const io = capture();
    try {
      expect(await main(["--nope"], {})).toBe(1);
      expect(io.text()).toContain("Usage:");
    } finally {
      io.restore();
    }
  });

  test("dry-run install against a fixture changes nothing", async () => {
    const io = capture();
    const home = tempDir();
    try {
      const env = { HOME: home, CONFIGS_ROOT: makeFixtureRoot(), PATH: "/usr/bin:/bin" };
      expect(await main(["--dry-run", "--skip-packages"], env)).toBe(0);
      expect(snapshotTree(home)).toEqual([]);
    } finally {
      io.restore();
    }
  });

  test("--verify reports missing links against a fixture", async () => {
    const io = capture();
    try {
      const env = { HOME: tempDir(), CONFIGS_ROOT: makeFixtureRoot(), PATH: "/usr/bin:/bin" };
      expect(await main(["--verify"], env)).toBe(1);
      expect(io.text()).toContain("Not linked:");
    } finally {
      io.restore();
    }
  });
});
