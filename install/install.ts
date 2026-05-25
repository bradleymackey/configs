#!/usr/bin/env bun

/**
 * Main installation script for configs
 * Handles symlinking dotfiles and running package installation scripts
 */

import { parseArgs } from "util";
import { $ } from "bun";
import { existsSync, readlinkSync, mkdirSync, renameSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import type { ItemStatus, SummaryItem, StepResult } from "./types.ts";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  dim: "\x1b[2m",
};

// Configuration
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIGS_ROOT = join(SCRIPT_DIR, "..");
const HOME_PATH = join(CONFIGS_ROOT, "home");
const CONFIG_PATH = join(CONFIGS_ROOT, "home", ".config");
const HOME_DIR = process.env.HOME || "~";

// Parse command line arguments
const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "dry-run": { type: "boolean", short: "d", default: false },
    "skip-packages": { type: "boolean", short: "s", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    verify: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const DRY_RUN = args["dry-run"] as boolean;
const SKIP_PACKAGES = args["skip-packages"] as boolean;
const VERBOSE = args.verbose as boolean;
const VERIFY = args.verify as boolean;

// Accumulated state for the end-of-run summary
const summary: SummaryItem[] = [];

function record(item: SummaryItem) {
  summary.push(item);
}

// Logging functions
function logInfo(message: string) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarn(message: string) {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`);
}

function logError(message: string) {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function logDryRun(message: string) {
  if (DRY_RUN) {
    console.log(`${colors.yellow}[DRY-RUN]${colors.reset} ${message}`);
  }
}

// Helper function to safely create symlinks
async function safeSymlink(
  source: string,
  target: string,
): Promise<ItemStatus> {
  const name = basename(target);

  if (DRY_RUN) {
    logDryRun(`Would create symlink: ${target} -> ${source}`);
    record({ category: "Symlink", name, status: "skipped", detail: "dry-run" });
    return "skipped";
  }

  if (!existsSync(source)) {
    logError(`Source does not exist: ${source}`);
    record({
      category: "Symlink",
      name,
      status: "failed",
      detail: `source missing: ${source}`,
    });
    return "failed";
  }

  if (existsSync(target)) {
    try {
      const linkTarget = readlinkSync(target);
      if (linkTarget === source) {
        logInfo(`Symlink already exists: ${target} -> ${source}`);
        record({ category: "Symlink", name, status: "unchanged" });
        return "unchanged";
      }
    } catch {
      // Not a symlink — fall through to backup path
    }

    const backup = `${target}.backup.${Date.now()}`;
    logWarn(`Target exists, backing up: ${target} -> ${backup}`);
    try {
      renameSync(target, backup);
    } catch (error) {
      logError(`Failed to backup: ${error}`);
      record({
        category: "Symlink",
        name,
        status: "failed",
        detail: `backup failed: ${error}`,
      });
      return "failed";
    }

    try {
      await $`ln -s ${source} ${target}`.quiet();
      logSuccess(`Created symlink: ${target} -> ${source}`);
      record({
        category: "Symlink",
        name,
        status: "replaced",
        detail: `backup: ${basename(backup)}`,
      });
      return "replaced";
    } catch (error) {
      logError(`Failed to create symlink: ${target} -> ${source}`);
      if (VERBOSE) console.error(error);
      record({
        category: "Symlink",
        name,
        status: "failed",
        detail: `${error}`,
      });
      return "failed";
    }
  }

  try {
    await $`ln -s ${source} ${target}`.quiet();
    logSuccess(`Created symlink: ${target} -> ${source}`);
    record({ category: "Symlink", name, status: "created" });
    return "created";
  } catch (error) {
    logError(`Failed to create symlink: ${target} -> ${source}`);
    if (VERBOSE) console.error(error);
    record({ category: "Symlink", name, status: "failed", detail: `${error}` });
    return "failed";
  }
}

// Helper function to safely create directory
function safeMkdir(dir: string): ItemStatus {
  const name = dir.replace(HOME_DIR, "~");

  if (DRY_RUN) {
    if (!existsSync(dir)) {
      logDryRun(`Would create directory: ${dir}`);
      record({
        category: "Directory",
        name,
        status: "skipped",
        detail: "dry-run",
      });
    } else {
      record({ category: "Directory", name, status: "unchanged" });
    }
    return existsSync(dir) ? "unchanged" : "skipped";
  }

  if (existsSync(dir)) {
    logInfo(`Directory already exists: ${dir}`);
    record({ category: "Directory", name, status: "unchanged" });
    return "unchanged";
  }

  try {
    mkdirSync(dir, { recursive: true });
    logSuccess(`Created directory: ${dir}`);
    record({ category: "Directory", name, status: "created" });
    return "created";
  } catch (error) {
    logError(`Failed to create directory: ${dir}`);
    record({
      category: "Directory",
      name,
      status: "failed",
      detail: `${error}`,
    });
    return "failed";
  }
}

// Run a package-step function and fold its StepResult into the summary
async function runInstallStep(
  installFn: () => Promise<StepResult>,
  description: string,
): Promise<StepResult> {
  if (DRY_RUN) {
    logDryRun(`Would run: ${description}`);
    record({
      category: "Package step",
      name: description,
      status: "skipped",
      detail: "dry-run",
    });
    return { ok: true, changes: [] };
  }

  logInfo(`Running: ${description}`);

  try {
    const result = await installFn();
    if (result.changes && result.changes.length > 0) {
      for (const change of result.changes) summary.push(change);
    }
    if (result.ok) {
      logSuccess(`${description} completed`);
      // Only record the umbrella line if no granular changes were reported
      if (!result.changes || result.changes.length === 0) {
        record({
          category: "Package step",
          name: description,
          status: "unchanged",
        });
      }
    } else {
      logWarn(`${description} failed (continuing)`);
      record({
        category: "Package step",
        name: description,
        status: "failed",
        detail: result.error,
      });
    }
    return result;
  } catch (error) {
    logWarn(`${description} failed (continuing)`);
    if (VERBOSE) console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    record({
      category: "Package step",
      name: description,
      status: "failed",
      detail: message,
    });
    return { ok: false, error: message };
  }
}

// Verification mode - check status of symlinks without making changes
function verifySymlink(
  source: string,
  target: string,
): {
  status: "ok" | "missing" | "wrong" | "not-symlink" | "source-missing";
  message: string;
} {
  if (!existsSync(source)) {
    return {
      status: "source-missing",
      message: `Source does not exist: ${source}`,
    };
  }

  if (!existsSync(target)) {
    return {
      status: "missing",
      message: `Not linked: ${target} -> ${source}`,
    };
  }

  try {
    const linkTarget = readlinkSync(target);
    if (linkTarget === source) {
      return {
        status: "ok",
        message: `OK: ${target} -> ${source}`,
      };
    } else {
      return {
        status: "wrong",
        message: `Wrong target: ${target} -> ${linkTarget} (expected: ${source})`,
      };
    }
  } catch {
    return {
      status: "not-symlink",
      message: `Not a symlink: ${target} (file/directory exists)`,
    };
  }
}

// --- Summary table renderer -------------------------------------------------

const STATUS_GLYPH: Record<ItemStatus, string> = {
  unchanged: "✓",
  created: "+",
  replaced: "~",
  failed: "!",
  skipped: "·",
};

const STATUS_COLOR: Record<ItemStatus, string> = {
  unchanged: colors.green,
  created: colors.green,
  replaced: colors.yellow,
  failed: colors.red,
  skipped: colors.dim,
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  unchanged: "Unchanged",
  created: "Created",
  replaced: "Replaced",
  failed: "Needs attention",
  skipped: "Skipped",
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + "…";
}

function printSummary(items: SummaryItem[]) {
  console.log("");
  console.log(`${colors.blue}Installation Summary${colors.reset}`);

  if (items.length === 0) {
    console.log("  (nothing to report)");
    return;
  }

  // Stable status ordering so failures float to the bottom
  const order: ItemStatus[] = [
    "failed",
    "replaced",
    "created",
    "unchanged",
    "skipped",
  ];
  const sorted = [...items].sort((a, b) => {
    const oa = order.indexOf(a.status);
    const ob = order.indexOf(b.status);
    if (oa !== ob) return oa - ob;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  const labelWidth = Math.max(
    ...Object.values(STATUS_LABEL).map((s) => s.length),
  );
  const categoryWidth = Math.max(
    ...sorted.map((i) => i.category.length),
    "Category".length,
  );
  const nameWidth = Math.min(
    40,
    Math.max(...sorted.map((i) => i.name.length), "Name".length),
  );

  const divider = "─".repeat(
    labelWidth + categoryWidth + nameWidth + 40 + 8,
  );
  console.log(divider);

  for (const item of sorted) {
    const color = STATUS_COLOR[item.status];
    const glyph = STATUS_GLYPH[item.status];
    const label = STATUS_LABEL[item.status].padEnd(labelWidth);
    const cat = item.category.padEnd(categoryWidth);
    const name = truncate(item.name, nameWidth).padEnd(nameWidth);
    const detail = item.detail ? `  ${colors.dim}${item.detail}${colors.reset}` : "";
    console.log(`  ${color}${glyph} ${label}${colors.reset}  ${cat}  ${name}${detail}`);
  }

  console.log(divider);

  const counts: Record<ItemStatus, number> = {
    unchanged: 0,
    created: 0,
    replaced: 0,
    failed: 0,
    skipped: 0,
  };
  for (const item of items) counts[item.status]++;

  const parts: string[] = [];
  if (counts.unchanged) parts.push(`${counts.unchanged} unchanged`);
  if (counts.created) parts.push(`${counts.created} created`);
  if (counts.replaced) parts.push(`${counts.replaced} replaced`);
  if (counts.failed)
    parts.push(`${colors.red}${counts.failed} needs attention${colors.reset}`);
  if (counts.skipped) parts.push(`${counts.skipped} skipped`);
  console.log(`  ${parts.join(" · ")}`);
}

// Show usage information
function showHelp() {
  console.log(`
Usage: bun install/install.ts [OPTIONS]

Install and configure dotfiles and development environment.

OPTIONS:
    -d, --dry-run       Show what would be done without making changes
    -s, --skip-packages Skip package installation (only create symlinks)
    -v, --verbose       Show detailed output
    --verify            Check status of symlinks without making changes
    -h, --help          Show this help message

EXAMPLES:
    # Preview what would be installed
    bun install/install.ts --dry-run

    # Check status of all symlinks
    bun install/install.ts --verify

    # Install only dotfile symlinks (skip brew, rust, etc.)
    bun install/install.ts --skip-packages

    # Install with verbose output
    bun install/install.ts --verbose
`);
}

// Main installation function
async function main() {
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Verification mode - check all symlinks and exit
  if (VERIFY) {
    logInfo("Running verification mode...");
    logInfo(`Configs root: ${CONFIGS_ROOT}`);

    const results = {
      ok: 0,
      missing: 0,
      wrong: 0,
      notSymlink: 0,
      sourceMissing: 0,
    };

    const homeSymlinks = [
      [join(HOME_PATH, ".tmux.conf"), join(HOME_DIR, ".tmux.conf")],
      [join(HOME_PATH, ".my_scripts"), join(HOME_DIR, ".my_scripts")],
      [join(HOME_PATH, ".bash_profile"), join(HOME_DIR, ".bash_profile")],
      [join(HOME_PATH, ".bashrc"), join(HOME_DIR, ".bashrc")],
      [join(HOME_PATH, ".vimrc"), join(HOME_DIR, ".vimrc")],
      [join(HOME_PATH, ".lldbinit"), join(HOME_DIR, ".lldbinit")],
      [join(HOME_PATH, ".gitconfig"), join(HOME_DIR, ".gitconfig")],
      [join(HOME_PATH, ".gitignore"), join(HOME_DIR, ".gitignore")],
    ];

    const configSymlinks = [
      [join(CONFIG_PATH, "nvim"), join(HOME_DIR, ".config", "nvim")],
      [join(CONFIG_PATH, "nvim", "vimdid"), join(HOME_DIR, ".vimdid")],
      [
        join(CONFIG_PATH, "base16-shell"),
        join(HOME_DIR, ".config", "base16-shell"),
      ],
      [join(CONFIG_PATH, "helix"), join(HOME_DIR, ".config", "helix")],
      [join(CONFIG_PATH, "swift_po"), join(HOME_DIR, ".config", "swift_po")],
      [
        join(CONFIG_PATH, "starship.toml"),
        join(HOME_DIR, ".config", "starship.toml"),
      ],
    ];

    const allSymlinks = [...homeSymlinks, ...configSymlinks];

    if (process.platform === "darwin") {
      allSymlinks.push(
        [
          join(HOME_PATH, "config.nu"),
          join(
            HOME_DIR,
            "Library",
            "Application Support",
            "nushell",
            "config.nu",
          ),
        ],
        [
          join(HOME_PATH, "env.nu"),
          join(HOME_DIR, "Library", "Application Support", "nushell", "env.nu"),
        ],
      );
    }

    console.log("");
    for (const [source, target] of allSymlinks) {
      const result = verifySymlink(source, target);

      switch (result.status) {
        case "ok":
          console.log(`${colors.green}✓${colors.reset} ${result.message}`);
          results.ok++;
          break;
        case "missing":
          console.log(`${colors.yellow}✗${colors.reset} ${result.message}`);
          results.missing++;
          break;
        case "wrong":
          console.log(`${colors.red}✗${colors.reset} ${result.message}`);
          results.wrong++;
          break;
        case "not-symlink":
          console.log(`${colors.red}✗${colors.reset} ${result.message}`);
          results.notSymlink++;
          break;
        case "source-missing":
          console.log(`${colors.red}✗${colors.reset} ${result.message}`);
          results.sourceMissing++;
          break;
      }
    }

    console.log("");
    logInfo("Checking environment...");
    console.log("");

    let envIssues = 0;

    if (process.env.TMUX) {
      console.log(`${colors.green}✓${colors.reset} OK: Inside tmux session`);
    } else {
      console.log(`${colors.yellow}✗${colors.reset} Not inside tmux`);
      envIssues++;
    }

    const currentShell = process.env.SHELL || "";
    if (currentShell.endsWith("/bash")) {
      console.log(
        `${colors.green}✓${colors.reset} OK: Default shell is bash (${currentShell})`,
      );
    } else {
      console.log(
        `${colors.yellow}✗${colors.reset} Default shell is not bash (${currentShell || "unknown"})`,
      );
      envIssues++;
    }

    try {
      const remoteUrl =
        await $`git -C ${CONFIGS_ROOT} remote get-url origin`.text();
      const url = remoteUrl.trim();
      if (url.startsWith("git@")) {
        console.log(
          `${colors.green}✓${colors.reset} OK: Git remote uses SSH (${url})`,
        );
      } else {
        console.log(
          `${colors.yellow}✗${colors.reset} Git remote uses HTTPS, not SSH (${url})`,
        );
        envIssues++;
      }
    } catch {
      console.log(
        `${colors.yellow}✗${colors.reset} Could not determine git remote URL`,
      );
      envIssues++;
    }

    const requiredTools = [
      "brew",
      "nvim",
      "tmux",
      "git",
      "rg",
      "fzf",
      "starship",
      "lazygit",
      "fnm",
      "node",
      "pnpm",
      "deno",
      "bun",
      "rustup",
      "cargo",
      "rustc",
      "pyenv",
    ];

    for (const tool of requiredTools) {
      const check = await $`which ${tool}`.nothrow().quiet();
      if (check.exitCode === 0) {
        console.log(
          `${colors.green}✓${colors.reset} OK: ${tool} is installed`,
        );
      } else {
        console.log(
          `${colors.yellow}✗${colors.reset} ${tool} is not installed`,
        );
        envIssues++;
      }
    }

    try {
      const fzfPrefix = (await $`brew --prefix`.nothrow().quiet().text()).trim();
      const fzfInstallDir = join(fzfPrefix, "opt", "fzf");
      if (existsSync(join(fzfInstallDir, "shell", "key-bindings.bash"))) {
        console.log(
          `${colors.green}✓${colors.reset} OK: fzf shell completions installed`,
        );
      } else {
        console.log(
          `${colors.yellow}✗${colors.reset} fzf shell completions not installed (run: $(brew --prefix)/opt/fzf/install)`,
        );
        envIssues++;
      }
    } catch {
      // Skip if brew not available
    }

    console.log("");
    console.log("Symlinks:");
    console.log(`  ${colors.green}${results.ok} OK${colors.reset}`);
    if (results.missing > 0) {
      console.log(
        `  ${colors.yellow}${results.missing} Missing${colors.reset}`,
      );
    }
    if (results.wrong > 0) {
      console.log(
        `  ${colors.red}${results.wrong} Wrong target${colors.reset}`,
      );
    }
    if (results.notSymlink > 0) {
      console.log(
        `  ${colors.red}${results.notSymlink} Not a symlink${colors.reset}`,
      );
    }
    if (results.sourceMissing > 0) {
      console.log(
        `  ${colors.red}${results.sourceMissing} Source missing${colors.reset}`,
      );
    }

    console.log("");
    console.log("Environment:");
    if (envIssues > 0) {
      console.log(
        `  ${colors.yellow}${envIssues} issue${envIssues === 1 ? "" : "s"}${colors.reset}`,
      );
    } else {
      console.log(`  ${colors.green}All checks passed${colors.reset}`);
    }

    const symlinkIssues =
      results.missing +
        results.wrong +
        results.notSymlink +
        results.sourceMissing >
      0;
    if (symlinkIssues) {
      console.log("");
      logInfo(
        "Run 'bun install/install.ts' to fix missing or incorrect symlinks",
      );
      process.exit(1);
    } else if (envIssues > 0) {
      console.log("");
      logSuccess("All symlinks are correctly configured!");
      process.exit(0);
    } else {
      console.log("");
      logSuccess("All checks passed!");
      process.exit(0);
    }
  }

  logInfo("Starting installation script...");

  if (DRY_RUN) {
    logWarn("DRY-RUN MODE: No changes will be made");
  }

  logInfo(`Configs root: ${CONFIGS_ROOT}`);

  safeMkdir(join(HOME_DIR, ".config"));

  if (existsSync(join(CONFIGS_ROOT, ".git"))) {
    if (DRY_RUN) {
      logDryRun("Would fetch git submodules");
    } else {
      try {
        logInfo("Fetching git submodules...");
        await $`git -C ${CONFIGS_ROOT} submodule update --init --recursive`.quiet();
        logSuccess("Git submodules updated");
      } catch (error) {
        logWarn("Failed to update git submodules (continuing)");
      }
    }
  } else {
    logWarn("Not a git repository, skipping submodule update");
  }

  logInfo("Setting up shell and editor configurations...");

  const homeSymlinks = [
    [join(HOME_PATH, ".tmux.conf"), join(HOME_DIR, ".tmux.conf")],
    [join(HOME_PATH, ".my_scripts"), join(HOME_DIR, ".my_scripts")],
    [join(HOME_PATH, ".bash_profile"), join(HOME_DIR, ".bash_profile")],
    [join(HOME_PATH, ".bashrc"), join(HOME_DIR, ".bashrc")],
    [join(HOME_PATH, ".vimrc"), join(HOME_DIR, ".vimrc")],
    [join(HOME_PATH, ".lldbinit"), join(HOME_DIR, ".lldbinit")],
    [join(HOME_PATH, ".gitconfig"), join(HOME_DIR, ".gitconfig")],
    [join(HOME_PATH, ".gitignore"), join(HOME_DIR, ".gitignore")],
  ];

  for (const [source, target] of homeSymlinks) {
    await safeSymlink(source, target);
  }

  const configSymlinks = [
    [join(CONFIG_PATH, "nvim"), join(HOME_DIR, ".config", "nvim")],
    [join(CONFIG_PATH, "nvim", "vimdid"), join(HOME_DIR, ".vimdid")],
    [
      join(CONFIG_PATH, "base16-shell"),
      join(HOME_DIR, ".config", "base16-shell"),
    ],
    [join(CONFIG_PATH, "helix"), join(HOME_DIR, ".config", "helix")],
    [join(CONFIG_PATH, "swift_po"), join(HOME_DIR, ".config", "swift_po")],
    [
      join(CONFIG_PATH, "starship.toml"),
      join(HOME_DIR, ".config", "starship.toml"),
    ],
  ];

  for (const [source, target] of configSymlinks) {
    await safeSymlink(source, target);
  }

  if (process.platform === "darwin") {
    logInfo("Detected macOS, setting up macOS-specific configurations...");

    const nushellDir = join(
      HOME_DIR,
      "Library",
      "Application Support",
      "nushell",
    );
    safeMkdir(nushellDir);
    await safeSymlink(
      join(HOME_PATH, "config.nu"),
      join(nushellDir, "config.nu"),
    );
    await safeSymlink(join(HOME_PATH, "env.nu"), join(nushellDir, "env.nu"));

    if (!SKIP_PACKAGES) {
      const { setupMacOS } = await import("./macos/macos.ts");
      const { installBrew, auditBrewfile } = await import("./macos/brew.ts");

      await runInstallStep(() => setupMacOS(), "macOS system settings");
      await runInstallStep(
        () => installBrew(CONFIGS_ROOT),
        "Homebrew installation",
      );
      await runInstallStep(
        () => auditBrewfile(CONFIGS_ROOT),
        "Brewfile deprecation audit",
      );
    }
  }

  if (!SKIP_PACKAGES) {
    const { installNodePackages, auditNodePackages } = await import("./node.ts");
    const { installRust } = await import("./rust.ts");

    await runInstallStep(() => auditNodePackages(), "pnpm globals audit");
    await runInstallStep(() => installNodePackages(), "Node.js packages");
    await runInstallStep(() => installRust(), "Rust toolchain");
  } else {
    logInfo("Skipping package installations (--skip-packages flag)");
  }

  logSuccess("Installation completed!");

  if (!DRY_RUN) {
    logInfo("You may need to restart your shell or run: source ~/.bashrc");
  }

  printSummary(summary);

  const hasFailures = summary.some((i) => i.status === "failed");
  if (hasFailures) process.exit(1);
}

main().catch((error) => {
  logError(`Installation failed: ${error.message}`);
  if (VERBOSE) {
    console.error(error);
  }
  process.exit(1);
});
