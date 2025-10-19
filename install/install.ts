#!/usr/bin/env bun

/**
 * Main installation script for configs
 * Handles symlinking dotfiles and running package installation scripts
 */

import { parseArgs } from "util";
import { $ } from "bun";
import { existsSync, readlinkSync, mkdirSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
};

// Configuration
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIGS_ROOT = join(SCRIPT_DIR, "..");
const HOME_PATH = join(CONFIGS_ROOT, "home");
const CONFIG_PATH = join(CONFIGS_ROOT, "home", ".config");
const INSTALL_PATH = join(CONFIGS_ROOT, "install");
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
async function safeSymlink(source: string, target: string): Promise<boolean> {
  if (DRY_RUN) {
    logDryRun(`Would create symlink: ${target} -> ${source}`);
    return true;
  }

  // Check if source exists
  if (!existsSync(source)) {
    logError(`Source does not exist: ${source}`);
    return false;
  }

  // If target already exists
  if (existsSync(target)) {
    try {
      // If it's already a symlink to the correct location, skip
      const linkTarget = readlinkSync(target);
      if (linkTarget === source) {
        logInfo(`Symlink already exists: ${target} -> ${source}`);
        return true;
      }
    } catch {
      // Not a symlink, continue to backup
    }

    // Backup existing file/directory
    const backup = `${target}.backup.${Date.now()}`;
    logWarn(`Target exists, backing up: ${target} -> ${backup}`);
    try {
      renameSync(target, backup);
    } catch (error) {
      logError(`Failed to backup: ${error}`);
      return false;
    }
  }

  // Create the symlink
  try {
    await $`ln -s ${source} ${target}`.quiet();
    logSuccess(`Created symlink: ${target} -> ${source}`);
    return true;
  } catch (error) {
    logError(`Failed to create symlink: ${target} -> ${source}`);
    if (VERBOSE) {
      console.error(error);
    }
    return false;
  }
}

// Helper function to safely create directory
function safeMkdir(dir: string): boolean {
  if (DRY_RUN) {
    if (!existsSync(dir)) {
      logDryRun(`Would create directory: ${dir}`);
    }
    return true;
  }

  if (existsSync(dir)) {
    logInfo(`Directory already exists: ${dir}`);
    return true;
  }

  try {
    mkdirSync(dir, { recursive: true });
    logSuccess(`Created directory: ${dir}`);
    return true;
  } catch (error) {
    logError(`Failed to create directory: ${dir}`);
    return false;
  }
}

// Helper function to run external script
async function runScript(
  scriptPath: string,
  description: string
): Promise<boolean> {
  if (!existsSync(scriptPath)) {
    logError(`Script not found: ${scriptPath}`);
    return false;
  }

  if (DRY_RUN) {
    logDryRun(`Would run: ${description} (${scriptPath})`);
    return true;
  }

  logInfo(`Running: ${description}`);
  
  try {
    const result = VERBOSE
      ? await $`bun ${scriptPath}`.nothrow()
      : await $`bun ${scriptPath}`.quiet().nothrow();

    if (result.exitCode === 0) {
      logSuccess(`${description} completed`);
      return true;
    } else {
      logWarn(`${description} failed (continuing)`);
      return false;
    }
  } catch (error) {
    logWarn(`${description} failed (continuing)`);
    if (VERBOSE) {
      console.error(error);
    }
    return false;
  }
}

// Verification mode - check status of symlinks without making changes
function verifySymlink(source: string, target: string): {
  status: "ok" | "missing" | "wrong" | "not-symlink" | "source-missing";
  message: string;
} {
  // Check if source exists
  if (!existsSync(source)) {
    return {
      status: "source-missing",
      message: `Source does not exist: ${source}`,
    };
  }

  // Check if target exists
  if (!existsSync(target)) {
    return {
      status: "missing",
      message: `Not linked: ${target} -> ${source}`,
    };
  }

  // Check if target is a symlink
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

    // Home directory dotfiles
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

    // .config directory items
    const configSymlinks = [
      [join(CONFIG_PATH, "nvim"), join(HOME_DIR, ".config", "nvim")],
      [join(CONFIG_PATH, "nvim", "vimdid"), join(HOME_DIR, ".vimdid")],
      [join(CONFIG_PATH, "base16-shell"), join(HOME_DIR, ".config", "base16-shell")],
      [join(CONFIG_PATH, "kitty"), join(HOME_DIR, ".config", "kitty")],
      [join(CONFIG_PATH, "alacritty"), join(HOME_DIR, ".config", "alacritty")],
      [join(CONFIG_PATH, "helix"), join(HOME_DIR, ".config", "helix")],
      [join(CONFIG_PATH, "swift_po"), join(HOME_DIR, ".config", "swift_po")],
    ];

    const allSymlinks = [...homeSymlinks, ...configSymlinks];

    // macOS specific
    if (process.platform === "darwin") {
      allSymlinks.push(
        [join(HOME_PATH, "config.nu"), join(HOME_DIR, "Library", "Application Support", "nushell", "config.nu")],
        [join(HOME_PATH, "env.nu"), join(HOME_DIR, "Library", "Application Support", "nushell", "env.nu")]
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
    console.log("Summary:");
    console.log(`  ${colors.green}${results.ok} OK${colors.reset}`);
    if (results.missing > 0) {
      console.log(`  ${colors.yellow}${results.missing} Missing${colors.reset}`);
    }
    if (results.wrong > 0) {
      console.log(`  ${colors.red}${results.wrong} Wrong target${colors.reset}`);
    }
    if (results.notSymlink > 0) {
      console.log(`  ${colors.red}${results.notSymlink} Not a symlink${colors.reset}`);
    }
    if (results.sourceMissing > 0) {
      console.log(`  ${colors.red}${results.sourceMissing} Source missing${colors.reset}`);
    }

    const hasIssues = results.missing + results.wrong + results.notSymlink + results.sourceMissing > 0;
    if (hasIssues) {
      console.log("");
      logInfo("Run 'bun install/install.ts' to fix missing or incorrect symlinks");
      process.exit(1);
    } else {
      console.log("");
      logSuccess("All symlinks are correctly configured!");
      process.exit(0);
    }
  }

  logInfo("Starting installation script...");

  if (DRY_RUN) {
    logWarn("DRY-RUN MODE: No changes will be made");
  }

  logInfo(`Configs root: ${CONFIGS_ROOT}`);

  // Create necessary directories
  safeMkdir(join(HOME_DIR, ".config"));

  // Fetch submodules if this is a git repo
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

  // Shell and editor symlinks
  logInfo("Setting up shell and editor configurations...");

  // Home directory dotfiles
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

  // .config directory items
  const configSymlinks = [
    [join(CONFIG_PATH, "nvim"), join(HOME_DIR, ".config", "nvim")],
    [join(CONFIG_PATH, "nvim", "vimdid"), join(HOME_DIR, ".vimdid")],
    [join(CONFIG_PATH, "base16-shell"), join(HOME_DIR, ".config", "base16-shell")],
    [join(CONFIG_PATH, "kitty"), join(HOME_DIR, ".config", "kitty")],
    [join(CONFIG_PATH, "alacritty"), join(HOME_DIR, ".config", "alacritty")],
    [join(CONFIG_PATH, "helix"), join(HOME_DIR, ".config", "helix")],
    [join(CONFIG_PATH, "swift_po"), join(HOME_DIR, ".config", "swift_po")],
  ];

  for (const [source, target] of configSymlinks) {
    await safeSymlink(source, target);
  }

  // macOS specific
  if (process.platform === "darwin") {
    logInfo("Detected macOS, setting up macOS-specific configurations...");

    // Nushell configuration
    const nushellDir = join(HOME_DIR, "Library", "Application Support", "nushell");
    safeMkdir(nushellDir);
    await safeSymlink(join(HOME_PATH, "config.nu"), join(nushellDir, "config.nu"));
    await safeSymlink(join(HOME_PATH, "env.nu"), join(nushellDir, "env.nu"));

    if (!SKIP_PACKAGES) {
      await runScript(join(INSTALL_PATH, "macos", "macos.ts"), "macOS system settings");
      await runScript(join(INSTALL_PATH, "macos", "brew.ts"), "Homebrew installation");
    }
  }

  // Package installations
  if (!SKIP_PACKAGES) {
    await runScript(join(INSTALL_PATH, "node.ts"), "Node.js packages");
    await runScript(join(INSTALL_PATH, "rust.ts"), "Rust toolchain");
  } else {
    logInfo("Skipping package installations (--skip-packages flag)");
  }

  // Set git credential helper
  if (!DRY_RUN) {
    try {
      logInfo("Configuring git credential helper...");
      await $`git config --global credential.helper store`.quiet();
      logSuccess("Git credential helper configured");
    } catch {
      logWarn("Failed to set git credential helper");
    }
  }

  logSuccess("Installation completed!");

  if (!DRY_RUN) {
    logInfo("You may need to restart your shell or run: source ~/.bashrc");
  }
}

// Run main function
main().catch((error) => {
  logError(`Installation failed: ${error.message}`);
  if (VERBOSE) {
    console.error(error);
  }
  process.exit(1);
});
