#!/usr/bin/env bun

import { $ } from "bun";

/**
 * Apply macOS system settings
 */
export async function setupMacOS(): Promise<void> {
  console.log("Setting up macOS...");
  
  try {
    console.log("Setup Dock");
    await $`defaults write com.apple.dock orientation left`;

    console.log("Reducing key repeat");
    await $`defaults write -g InitialKeyRepeat -int 12`;
    await $`defaults write -g KeyRepeat -int 1`;

    console.log("macOS settings applied!");
  } catch (error) {
    console.error("Failed to apply macOS settings:", error);
    throw error;
  }
}

// If run directly as a script
if (import.meta.main) {
  try {
    await setupMacOS();
  } catch (error) {
    process.exit(1);
  }
}
