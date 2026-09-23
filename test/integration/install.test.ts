/**
 * End-to-end CLI tests: runs install/install.ts as a subprocess against a
 * throwaway HOME and a fixture configs root (CONFIGS_ROOT), never the real ones.
 * --skip-packages keeps package managers out of these tests; the full
 * package path is covered by dry-run-safety.test.ts and the unit tests.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { getSymlinks } from "../../install/symlinks.ts";
import { cleanupTempDirs, findSymlinks, makeFixtureRoot, runCli, snapshotTree, tempDir } from "../helpers.ts";

let home: string;
let root: string;
let env: Record<string, string>;

beforeEach(() => {
  home = tempDir("configs-home-");
  root = makeFixtureRoot();
  env = { HOME: home, CONFIGS_ROOT: root };
});

afterEach(cleanupTempDirs);

const links = () => getSymlinks(root, home, process.platform);
const bashrc = () => ({ source: join(root, "home", ".bashrc"), target: join(home, ".bashrc") });
const backupsOf = (name: string) => readdirSync(home).filter((f) => f.startsWith(`${name}.backup.`));

describe("CLI", () => {
  test("--help prints usage and exits 0", async () => {
    const result = await runCli(["--help"], env);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("--dry-run");
    expect(result.stdout).toContain("--skip-packages");
  });

  test("rejects unknown flags with a non-zero exit and makes no changes", async () => {
    const result = await runCli(["--invalid-flag"], env);
    expect(result.exitCode).toBe(1);
    expect(readdirSync(home)).toEqual([]);
  });

  test("accepts short and combined flags", async () => {
    const result = await runCli(["-d", "-s", "-v"], env);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("DRY-RUN MODE");
    expect(result.output).toContain("Skipping package installations");
    expect(result.output).toContain("Configs root:");
  });
});

describe("dry-run", () => {
  test("reports every planned symlink and changes nothing", async () => {
    const before = snapshotTree(home);
    const fixtureBefore = snapshotTree(root);

    const result = await runCli(["--dry-run", "--skip-packages"], env);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("DRY-RUN MODE");
    for (const { target } of links()) expect(result.output).toContain(`Would create symlink: ${target}`);
    expect(snapshotTree(home)).toEqual(before);
    expect(snapshotTree(root)).toEqual(fixtureBefore);
  });

  test("plans a backup for files that would be replaced, without touching them", async () => {
    writeFileSync(bashrc().target, "user content");
    const result = await runCli(["--dry-run", "--skip-packages"], env);
    expect(result.output).toContain(`Would back up ${bashrc().target}`);
    expect(readFileSync(bashrc().target, "utf8")).toBe("user content");
    expect(backupsOf(".bashrc")).toEqual([]);
  });

  test("plans the submodule update instead of running it", async () => {
    mkdirSync(join(root, ".git"));
    const result = await runCli(["--dry-run", "--skip-packages"], env);
    expect(result.output).toContain(`Would run: git -C ${root} submodule update --init --recursive`);
  });
});

describe("install --skip-packages", () => {
  test("creates every manifest symlink, including missing parent directories", async () => {
    rmSync(home, { recursive: true });
    mkdirSync(home);

    const result = await runCli(["--skip-packages"], env);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Skipping package installations");
    for (const { source, target } of links()) expect(readlinkSync(target)).toBe(source);
    expect(existsSync(join(home, ".config"))).toBe(true);
  });

  test("is idempotent: a second run leaves every link untouched", async () => {
    await runCli(["--skip-packages"], env);
    const inodes = links().map((l) => lstatSync(l.target).ino);

    const second = await runCli(["--skip-packages"], env);

    expect(second.exitCode).toBe(0);
    expect(second.output).toContain("Symlink already exists");
    expect(second.output).not.toContain("Created symlink");
    expect(second.output).toContain(`${links().length} unchanged`);
    // lstat, not stat: the link itself must not have been recreated
    expect(links().map((l) => lstatSync(l.target).ino)).toEqual(inodes);
  });

  test("backs up a regular file before replacing it, preserving its content", async () => {
    writeFileSync(bashrc().target, "important user data");

    const result = await runCli(["--skip-packages"], env);

    expect(result.output).toContain("Replaced");
    const [backup] = backupsOf(".bashrc");
    expect(readFileSync(join(home, backup), "utf8")).toBe("important user data");
    expect(readlinkSync(bashrc().target)).toBe(bashrc().source);
  });

  test("backs up and replaces a directory in the way", async () => {
    mkdirSync(bashrc().target);
    await runCli(["--skip-packages"], env);
    const [backup] = backupsOf(".bashrc");
    expect(lstatSync(join(home, backup)).isDirectory()).toBe(true);
    expect(readlinkSync(bashrc().target)).toBe(bashrc().source);
  });

  test("replaces a symlink pointing elsewhere, keeping it as a backup", async () => {
    const elsewhere = join(home, "elsewhere");
    writeFileSync(elsewhere, "other");
    symlinkSync(elsewhere, bashrc().target);

    await runCli(["--skip-packages"], env);

    const [backup] = backupsOf(".bashrc");
    expect(readlinkSync(join(home, backup))).toBe(elsewhere);
    expect(readlinkSync(bashrc().target)).toBe(bashrc().source);
  });

  test("replaces a dangling symlink (previously failed with EEXIST)", async () => {
    symlinkSync(join(home, "gone"), bashrc().target);

    const result = await runCli(["--skip-packages"], env);

    expect(result.exitCode).toBe(0);
    expect(readlinkSync(bashrc().target)).toBe(bashrc().source);
  });

  test("backs up a symlink chain as-is instead of following it", async () => {
    const final = join(home, "final");
    const intermediate = join(home, "intermediate");
    writeFileSync(final, "final content");
    symlinkSync(final, intermediate);
    symlinkSync(intermediate, bashrc().target);

    await runCli(["--skip-packages"], env);

    const [backup] = backupsOf(".bashrc");
    expect(readlinkSync(join(home, backup))).toBe(intermediate);
    expect(readFileSync(final, "utf8")).toBe("final content");
  });

  test("keeps one backup per replaced version across runs", async () => {
    writeFileSync(bashrc().target, "first");
    await runCli(["--skip-packages"], env);
    rmSync(bashrc().target);
    writeFileSync(bashrc().target, "second");
    await runCli(["--skip-packages"], env);

    const contents = backupsOf(".bashrc").map((b) => readFileSync(join(home, b), "utf8"));
    expect(contents.sort()).toEqual(["first", "second"]);
  });

  test("exits 1 and flags the item when a source is missing, still linking the rest", async () => {
    rmSync(bashrc().source);

    const result = await runCli(["--skip-packages"], env);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("needs attention");
    expect(result.output).toContain(`Source does not exist: ${bashrc().source}`);
    expect(existsSync(bashrc().target)).toBe(false);
    const vimrc = join(home, ".vimrc");
    expect(readlinkSync(vimrc)).toBe(join(root, "home", ".vimrc"));
  });

  test("handles spaces in HOME", async () => {
    const spaced = join(home, "with space");
    mkdirSync(spaced);
    const result = await runCli(["--skip-packages"], { ...env, HOME: spaced });
    expect(result.exitCode).toBe(0);
    expect(readlinkSync(join(spaced, ".bashrc"))).toBe(bashrc().source);
  });

  test("concurrent runs both succeed and never write links inside the configs tree", async () => {
    const [a, b] = await Promise.all([runCli(["--skip-packages"], env), runCli(["--skip-packages"], env)]);

    expect([a.exitCode, b.exitCode]).toEqual([0, 0]);
    for (const { source, target } of links()) expect(readlinkSync(target)).toBe(source);
    // The old `ln -s` implementation created e.g. home/.config/nvim/nvim here
    expect(findSymlinks(root)).toEqual([]);
  });

  test("warns and continues when the configs root is not a git repo", async () => {
    const result = await runCli(["--skip-packages"], env);
    expect(result.output).toContain("Not a git repository, skipping submodule update");
  });
});

describe("--verify", () => {
  test("reports missing links and exits 1 when nothing is installed", async () => {
    const result = await runCli(["--verify"], env);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Not linked:");
    expect(result.output).toContain(`${links().length} Missing`);
    expect(result.output).toContain("Run 'bun run setup' to fix");
  });

  test("passes after an install and checks every manifest entry", async () => {
    await runCli(["--skip-packages"], env);
    const result = await runCli(["--verify"], env);

    expect(result.exitCode).toBe(0);
    for (const { target } of links()) expect(result.output).toContain(`OK: ${target}`);
    expect(result.output).toContain(`${links().length} OK`);
    expect(result.output).toContain("Environment:");
  });

  test("detects wrong targets, regular files, and missing sources", async () => {
    await runCli(["--skip-packages"], env);
    rmSync(bashrc().target);
    symlinkSync(join(home, "wrong"), bashrc().target);
    const vimrc = join(home, ".vimrc");
    rmSync(vimrc);
    writeFileSync(vimrc, "regular");
    rmSync(join(root, "home", ".lldbinit"));

    const result = await runCli(["--verify"], env);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(`Wrong target: ${bashrc().target}`);
    expect(result.output).toContain(`Not a symlink: ${vimrc}`);
    expect(result.output).toContain("Source does not exist:");
    expect(result.output).toContain("OK:");
  });

  test("reports stale links left behind by removed configs", async () => {
    await runCli(["--skip-packages"], env);
    symlinkSync(join(root, "home", ".config", "old-terminal"), join(home, ".config", "old-terminal"));

    const result = await runCli(["--verify"], env);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(`Stale link: ${join(home, ".config", "old-terminal")}`);
    expect(result.output).toContain("1 Stale link");
  });

  test("never changes anything", async () => {
    writeFileSync(bashrc().target, "original");
    const before = snapshotTree(home);
    await runCli(["--verify"], env);
    expect(snapshotTree(home)).toEqual(before);
  });
});
