/**
 * Everything an install step needs, passed explicitly so steps can be unit
 * tested with a fake runner, a temp HOME, and a captured log.
 */

import { parseArgs } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { SummaryItem } from "../types.ts";
import { createDryRunRunner, createShellRunner, type Env, type Runner } from "./runner.ts";

export const colors = {
  reset: "\x1b[0m",
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  dim: "\x1b[2m",
};

export type Logger = {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  dryRun(message: string): void;
  plain(message: string): void;
};

export type Context = {
  dryRun: boolean;
  verbose: boolean;
  home: string;
  configsRoot: string;
  platform: NodeJS.Platform;
  env: Env;
  runner: Runner;
  log: Logger;
  summary: SummaryItem[];
};

export type CliOptions = {
  dryRun: boolean;
  skipPackages: boolean;
  verbose: boolean;
  verify: boolean;
  help: boolean;
};

/** Throws on unknown flags so typos never silently fall through to a real install. */
export function parseCliArgs(argv: string[]): CliOptions {
  const { values } = parseArgs({
    args: argv,
    options: {
      "dry-run": { type: "boolean", short: "d", default: false },
      "skip-packages": { type: "boolean", short: "s", default: false },
      verbose: { type: "boolean", short: "v", default: false },
      verify: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  return {
    dryRun: values["dry-run"] as boolean,
    skipPackages: values["skip-packages"] as boolean,
    verbose: values.verbose as boolean,
    verify: values.verify as boolean,
    help: values.help as boolean,
  };
}

export function createConsoleLogger(): Logger {
  return {
    info: (m) => console.log(`${colors.blue}[INFO]${colors.reset} ${m}`),
    success: (m) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${m}`),
    warn: (m) => console.log(`${colors.yellow}[WARN]${colors.reset} ${m}`),
    error: (m) => console.error(`${colors.red}[ERROR]${colors.reset} ${m}`),
    dryRun: (m) => console.log(`${colors.yellow}[DRY-RUN]${colors.reset} ${m}`),
    plain: (m) => console.log(m),
  };
}

/** Repo root, overridable with CONFIGS_ROOT so tests can point at a fixture copy. */
export function defaultConfigsRoot(env: Env): string {
  return env.CONFIGS_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function createContext(
  options: Pick<CliOptions, "dryRun" | "verbose">,
  env: Env,
  overrides: Partial<Pick<Context, "runner" | "log" | "platform">> = {},
): Context {
  const log = overrides.log ?? createConsoleLogger();
  const baseRunner = overrides.runner ?? createShellRunner(env);
  return {
    dryRun: options.dryRun,
    verbose: options.verbose,
    home: env.HOME || "~",
    configsRoot: defaultConfigsRoot(env),
    platform: overrides.platform ?? process.platform,
    env,
    runner: options.dryRun ? createDryRunRunner(baseRunner, log.dryRun) : baseRunner,
    log,
    summary: [],
  };
}

export function record(ctx: Context, item: SummaryItem): void {
  ctx.summary.push(item);
}

/** `~`-relative display path */
export function displayPath(ctx: Context, path: string): string {
  return path.startsWith(ctx.home + "/") ? "~" + path.slice(ctx.home.length) : path;
}
