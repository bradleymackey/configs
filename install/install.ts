#!/usr/bin/env bun

/**
 * Main installation script for configs
 * Handles symlinking dotfiles and running package installation scripts
 */

import { existsSync } from "fs";
import { join } from "path";
import { createContext, parseCliArgs, type Context } from "./lib/context.ts";
import { safeSymlink } from "./lib/fs-ops.ts";
import type { Env } from "./lib/runner.ts";
import { runStep } from "./lib/step.ts";
import { hasFailures, renderSummary } from "./lib/summary.ts";
import { getSymlinks } from "./symlinks.ts";
import { runVerify } from "./verify.ts";
import { configureMacOS } from "./macos/macos.ts";
import { auditBrewfile, installBrew } from "./macos/brew.ts";
import { syncNodePackages } from "./node.ts";
import { installRust } from "./rust.ts";

export { parseCliArgs } from "./lib/context.ts";
export { runVerify } from "./verify.ts";

export const HELP = `
Usage: bun install/install.ts [OPTIONS]

Install and configure dotfiles and development environment.

OPTIONS:
    -d, --dry-run       Show what would be done without making changes
    -s, --skip-packages Skip package installation (only create symlinks)
    -v, --verbose       Show detailed output
    --verify            Check status of symlinks without making changes
    -h, --help          Show this help message

EXAMPLES:
    # Preview what would be installed (every step, nothing is changed)
    bun run dry-run

    # Check status of all symlinks
    bun run verify

    # Install only dotfile symlinks (skip brew, rust, etc.)
    bun run setup:dotfiles

    # Install everything
    bun run setup
`;

/** Returns the process exit code: 1 if anything failed (or would fail), else 0. */
export async function runInstall(ctx: Context, skipPackages: boolean): Promise<number> {
  const { log } = ctx;
  log.info("Starting installation script...");
  if (ctx.dryRun) log.warn("DRY-RUN MODE: No changes will be made");
  log.info(`Configs root: ${ctx.configsRoot}`);

  if (existsSync(join(ctx.configsRoot, ".git"))) {
    log.info("Fetching git submodules...");
    const submodules = await ctx.runner.run(
      ["git", "-C", ctx.configsRoot, "submodule", "update", "--init", "--recursive"],
      { mutates: true },
    );
    if (submodules.exitCode !== 0) log.warn("Failed to update git submodules (continuing)");
  } else {
    log.warn("Not a git repository, skipping submodule update");
  }

  log.info("Setting up shell and editor configurations...");
  if (ctx.platform === "darwin") log.info("Detected macOS, including macOS-specific configurations...");
  for (const link of getSymlinks(ctx.configsRoot, ctx.home, ctx.platform)) {
    safeSymlink(ctx, link);
  }

  if (skipPackages) {
    log.info("Skipping package installations (--skip-packages flag)");
  } else {
    if (ctx.platform === "darwin") {
      await runStep(ctx, "macOS system settings", () => configureMacOS(ctx));
      await runStep(ctx, "Homebrew installation", () => installBrew(ctx));
      await runStep(ctx, "Brewfile deprecation audit", () => auditBrewfile(ctx));
    }
    await runStep(ctx, "Node.js packages", () => syncNodePackages(ctx));
    await runStep(ctx, "Rust toolchain", () => installRust(ctx));
  }

  log.success(ctx.dryRun ? "Dry run completed!" : "Installation completed!");
  if (!ctx.dryRun) log.info("You may need to restart your shell or run: source ~/.bashrc");

  log.plain(renderSummary(ctx.summary));
  return hasFailures(ctx.summary) ? 1 : 0;
}

export async function main(argv: string[], env: Env): Promise<number> {
  let options;
  try {
    options = parseCliArgs(argv);
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : error}\n${HELP}`);
    return 1;
  }

  if (options.help) {
    console.log(HELP);
    return 0;
  }

  const ctx = createContext(options, env);
  return options.verify ? runVerify(ctx) : runInstall(ctx, options.skipPackages);
}

if (import.meta.main) {
  // Copy env so steps that extend PATH never touch this process's environment
  process.exitCode = await main(process.argv.slice(2), { ...process.env });
}
