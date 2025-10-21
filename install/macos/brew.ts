#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const HOME = process.env.HOME || "~";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIGS_ROOT = join(SCRIPT_DIR, "..", "..");
const HOME_PATH = join(CONFIGS_ROOT, "home");

console.log("Installing brew (requires xcode command line)...");

try {
  // Check if brew is already installed
  const brewInstalled = await $`which brew`.nothrow().quiet();
  
  if (brewInstalled.exitCode !== 0) {
    console.log("Installing Homebrew...");
    await $`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`;
  } else {
    console.log("Homebrew already installed");
  }

  // Ensure brew is in PATH for this session
  process.env.PATH = `/opt/homebrew/bin:${process.env.PATH}`;

  console.log("Installing brew dependencies...");
  const brewfilePath = join(HOME_PATH, "Brewfile");
  
  if (existsSync(brewfilePath)) {
    await $`brew bundle --file ${brewfilePath}`;
  } else {
    console.warn(`Brewfile not found at ${brewfilePath}`);
  }

  // Install fzf completions
  console.log("Installing fzf completions...");
  const fzfPath = await $`brew --prefix`.text();
  await $`${fzfPath.trim()}/opt/fzf/install --key-bindings --completion --no-update-rc`;

  console.log("Brew stuff installed!");
} catch (error) {
  console.error("Failed to install Homebrew packages:", error);
  process.exit(1);
}
