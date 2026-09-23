/**
 * Shared test utilities. Everything here works in throwaway temp dirs; no test
 * may touch the real HOME, the real repo tree, or run real package managers.
 */

import { mkdirSync, mkdtempSync, readdirSync, readlinkSync, lstatSync, rmSync, writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { createContext, type Context, type Logger } from "../install/lib/context.ts";
import type { Env, RunOptions, RunResult, Runner } from "../install/lib/runner.ts";
import { getSymlinks } from "../install/symlinks.ts";

export const REPO_ROOT = join(import.meta.dir, "..");
export const INSTALL_SCRIPT = join(REPO_ROOT, "install", "install.ts");

// --- temp dirs --------------------------------------------------------------

const tempDirs: string[] = [];

export function tempDir(prefix = "configs-test-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** Register in each test file: `afterEach(cleanupTempDirs)` */
export function cleanupTempDirs(): void {
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true });
}

// --- fake runner ------------------------------------------------------------

export type Call = { cmd: string[]; opts: RunOptions };
type Handler = { prefix: string; result: Partial<RunResult> | ((cmd: string[]) => Partial<RunResult>) };

/**
 * Records every command and answers from scripted handlers, matched by
 * command-line prefix (first match wins). Unmatched commands succeed silently.
 */
export class FakeRunner implements Runner {
  calls: Call[] = [];
  private handlers: Handler[] = [];

  constructor(public available: Set<string> = new Set()) {}

  on(prefix: string, result: Handler["result"]): this {
    this.handlers.push({ prefix, result });
    return this;
  }

  which(bin: string): string | null {
    return this.available.has(bin) ? `/fake/bin/${bin}` : null;
  }

  async run(cmd: string[], opts: RunOptions): Promise<RunResult> {
    this.calls.push({ cmd, opts });
    const line = cmd.join(" ");
    const handler = this.handlers.find((h) => line.startsWith(h.prefix));
    const result = typeof handler?.result === "function" ? handler.result(cmd) : handler?.result;
    return { exitCode: 0, stdout: "", stderr: "", ...result };
  }

  commands(): string[] {
    return this.calls.map((c) => c.cmd.join(" "));
  }

  mutatingCommands(): string[] {
    return this.calls.filter((c) => c.opts.mutates).map((c) => c.cmd.join(" "));
  }
}

// --- logger / context -------------------------------------------------------

export type CapturedLogger = Logger & { lines: string[]; text(): string };

export function captureLogger(): CapturedLogger {
  const lines: string[] = [];
  const push = (prefix: string) => (m: string) => lines.push(`${prefix}${m}`);
  return {
    lines,
    text: () => lines.join("\n"),
    info: push("[INFO] "),
    success: push("[SUCCESS] "),
    warn: push("[WARN] "),
    error: push("[ERROR] "),
    dryRun: push("[DRY-RUN] "),
    plain: push(""),
  };
}

export type TestContext = Context & { fake: FakeRunner; logger: CapturedLogger };

export function makeCtx(
  options: { dryRun?: boolean; verbose?: boolean; home?: string; configsRoot?: string; platform?: NodeJS.Platform; env?: Env; fake?: FakeRunner } = {},
): TestContext {
  const fake = options.fake ?? new FakeRunner();
  const logger = captureLogger();
  const env: Env = {
    HOME: options.home ?? tempDir("configs-home-"),
    CONFIGS_ROOT: options.configsRoot ?? tempDir("configs-root-"),
    PATH: "/fake/bin",
    ...options.env,
  };
  const ctx = createContext({ dryRun: options.dryRun ?? false, verbose: options.verbose ?? false }, env, {
    runner: fake,
    log: logger,
    platform: options.platform ?? "darwin",
  });
  return Object.assign(ctx, { fake, logger });
}

// --- fixture configs root -----------------------------------------------------

// Manifest sources that are directories in the real repo
const DIRECTORY_SOURCES = [".my_scripts", "nvim", "vimdid", "base16-shell", "helix", "swift_po"];

/**
 * Builds a minimal configs root containing every manifest source (plus a
 * Brewfile), so installs can run against it without touching the real repo.
 */
export function makeFixtureRoot(): string {
  const root = tempDir("configs-fixture-");
  const sources = getSymlinks(root, "/unused-home", "darwin").map((l) => l.source);
  // Parents first so nested sources (nvim/vimdid) land inside their directory
  for (const source of sources.sort((a, b) => a.length - b.length)) {
    const name = source.split("/").pop()!;
    if (DIRECTORY_SOURCES.includes(name)) {
      mkdirSync(source, { recursive: true });
      writeFileSync(join(source, ".keep"), name);
    } else {
      mkdirSync(dirname(source), { recursive: true });
      writeFileSync(source, `# fixture ${name}\n`);
    }
  }
  writeFileSync(join(root, "home", "Brewfile"), 'tap "oven-sh/bun"\nbrew "jq"\ncask "ghostty"\n');
  return root;
}

// --- tree snapshots -------------------------------------------------------------

/** Every path under `dir` with its type, link target or content, for before/after diffs. */
export function snapshotTree(dir: string): string[] {
  const out: string[] = [];
  const walk = (path: string) => {
    for (const entry of readdirSync(path).sort()) {
      const full = join(path, entry);
      const rel = full.slice(dir.length);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) out.push(`L ${rel} -> ${readlinkSync(full)}`);
      else if (stat.isDirectory()) {
        out.push(`D ${rel}`);
        walk(full);
      } else out.push(`F ${rel} ${readFileSync(full, "utf8")}`);
    }
  };
  walk(dir);
  return out;
}

/** Symlinks found anywhere under `dir` */
export function findSymlinks(dir: string): string[] {
  return snapshotTree(dir).filter((l) => l.startsWith("L "));
}

// --- running the CLI --------------------------------------------------------------

export type CliResult = { exitCode: number; stdout: string; stderr: string; output: string };

/**
 * Runs install.ts as a subprocess with an isolated environment. Bun's
 * transpiler cache is disabled so it doesn't write into the fake HOME.
 */
export async function runCli(args: string[], env: Env): Promise<CliResult> {
  const proc = Bun.spawn([process.execPath, INSTALL_SCRIPT, ...args], {
    env: { PATH: process.env.PATH, BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0", NO_COLOR: "1", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr, output: stdout + stderr };
}
