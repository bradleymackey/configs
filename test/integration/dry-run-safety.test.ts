/**
 * Proves `--dry-run` is safe for EVERY step, end to end: the real CLI runs
 * with stub brew/pnpm/npm/rustup/cargo/defaults/curl/git binaries first on
 * PATH. The stubs log every invocation; the test fails if anything other than
 * a read-only probe was executed, or if HOME / the configs tree changed.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { cleanupTempDirs, makeFixtureRoot, REPO_ROOT, snapshotTree, tempDir, type CliResult } from "../helpers.ts";

/** Every command a dry run may execute. Anything else is a mutation. */
const READ_ONLY = [
  /^brew bundle check /,
  /^brew --prefix$/,
  /^brew info --json=v2 /,
  /^pnpm list -g --depth 0 --json$/,
  /^npm view \S+ deprecated --json$/,
  /^rustup component list --installed$/,
  /^cargo install --list$/,
  /^defaults read \S+ \S+$/,
];

const STUB = `#!/bin/sh
echo "$(basename "$0") $*" >> "$STUB_LOG"
case "$(basename "$0") $1 $2" in
  "brew bundle check") echo "→ Formula jq needs to be installed or updated."; exit 1 ;;
  "brew --prefix "*) echo "$STUB_PREFIX" ;;
  "brew info "*)
    shift; kind=formulae; key=full_name; items=""
    for a in "$@"; do
      case "$a" in --cask) kind=casks; key=token ;; --*) ;; *) items="$items{\\"$key\\":\\"$a\\"}," ;; esac
    done
    printf '{"%s":[%s]}' "$kind" "\${items%,}" ;;
  "pnpm list "*) echo '[{"dependencies":{"npm":{}}}]' ;;
  "rustup component "*) printf 'rust-src\\nrls-aarch64-apple-darwin\\n' ;;
  "defaults read "*) echo "bottom" ;;
esac
exit 0
`;

let home: string;
let root: string;
let stubs: string;
let log: string;

beforeEach(() => {
  home = tempDir("configs-home-");
  root = makeFixtureRoot();
  mkdirSync(join(root, ".git")); // exercise the submodule step too
  stubs = tempDir("configs-stubs-");
  log = join(stubs, "calls.log");
  writeFileSync(log, "");
  for (const bin of ["brew", "pnpm", "npm", "rustup", "cargo", "defaults", "curl", "git"]) {
    writeFileSync(join(stubs, bin), STUB);
    chmodSync(join(stubs, bin), 0o755);
  }
});

afterEach(cleanupTempDirs);

async function run(script: string, args: string[]): Promise<CliResult> {
  const proc = Bun.spawn([process.execPath, join(REPO_ROOT, "install", script), ...args], {
    env: {
      HOME: home,
      CONFIGS_ROOT: root,
      PATH: `${stubs}:/usr/bin:/bin`,
      STUB_LOG: log,
      STUB_PREFIX: tempDir("brew-prefix-"),
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { exitCode, stdout, stderr, output: stdout + stderr };
}

function executedCommands(): string[] {
  return readFileSync(log, "utf8").split("\n").filter(Boolean);
}

function expectOnlyReadOnly() {
  const commands = executedCommands();
  expect(commands.length).toBeGreaterThan(0);
  expect(commands.filter((c) => !READ_ONLY.some((re) => re.test(c)))).toEqual([]);
}

describe("full --dry-run (no --skip-packages)", () => {
  test("executes only read-only probes and changes nothing on disk", async () => {
    const homeBefore = snapshotTree(home);
    const rootBefore = snapshotTree(root);

    const result = await run("install.ts", ["--dry-run"]);

    expect(result.exitCode).toBe(0);
    expectOnlyReadOnly();
    expect(snapshotTree(home)).toEqual(homeBefore);
    expect(snapshotTree(root)).toEqual(rootBefore);
  });

  test("reports what every step would do", async () => {
    const { output } = await run("install.ts", ["--dry-run"]);

    expect(output).toContain(`Would run: git -C ${root} submodule update --init --recursive`);
    expect(output).toContain("Would create symlink:");
    expect(output).toContain("Would run: pnpm add -g");
    expect(output).toContain("Would run: rustup update stable");
    expect(output).toContain("Would run: rustup component remove rls");
    expect(output).toContain("Would run: cargo install cargo-edit");
    if (process.platform === "darwin") {
      expect(output).toContain("Would run: defaults write com.apple.dock orientation -string left");
      expect(output).toContain("Would run: brew bundle --file");
      expect(output).toContain("would install: jq");
      expect(output).toContain("--no-zsh --no-fish");
    }
    expect(output).toContain("Would change");
  });

  test("still plans the bootstrap installers on a machine with nothing installed", async () => {
    // No stubs on PATH: brew, pnpm and rustup are all missing
    const proc = Bun.spawn([process.execPath, join(REPO_ROOT, "install", "install.ts"), "--dry-run"], {
      env: { HOME: home, CONFIGS_ROOT: root, PATH: "/usr/bin:/bin", BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" },
      stdout: "pipe",
    });
    const output = await new Response(proc.stdout).text();

    expect(await proc.exited).toBe(0);
    if (process.platform === "darwin") expect(output).toContain("Would run: /bin/bash -c");
    expect(output).toContain("Would run: /bin/sh -c \"curl --proto");
    expect(snapshotTree(home)).toEqual([]);
  });
});

describe("standalone scripts support --dry-run", () => {
  test.each([["node.ts"], ["rust.ts"], ["macos/brew.ts"], ["macos/macos.ts"]])("%s --dry-run executes only probes", async (script) => {
    const result = await run(script, ["--dry-run"]);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("DRY-RUN MODE");
    expect(result.output).toContain("Installation Summary");
    expectOnlyReadOnly();
    expect(snapshotTree(home)).toEqual([]);
  });

  test("standalone scripts reject unknown flags", async () => {
    const result = await run("rust.ts", ["--nope"]);
    expect(result.exitCode).not.toBe(0);
    expect(existsSync(log) && executedCommands()).toEqual([]);
  });
});
