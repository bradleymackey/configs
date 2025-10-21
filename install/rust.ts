#!/usr/bin/env bun

import { $ } from "bun";

/**
 * Install Rust toolchain and components
 */
export async function installRust(): Promise<void> {
  console.log("Installing rust...");

  try {
    // Install rustup
    await $`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`;

    console.log("Updating rust stable...");
    await $`rustup update stable`;

    console.log("Installing rust components...");
    await $`rustup component add rls rust-analysis rust-src clippy rustfmt`;

    console.log("Installing cargo-edit...");
    await $`cargo install cargo-edit`;

    console.log("Rust stuff installed!");
  } catch (error) {
    console.error("Failed to install Rust:", error);
    throw error;
  }
}

// If run directly as a script
if (import.meta.main) {
  try {
    await installRust();
  } catch (error) {
    process.exit(1);
  }
}
