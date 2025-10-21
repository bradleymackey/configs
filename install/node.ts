#!/usr/bin/env bun

import { $ } from "bun";

const packages = [
  "fixjson",
  "jsonlint",
  "firebase-tools",
  "npm",
  "eslint_d",
  "yarn",
  "neovim",
  "typescript",
  "typescript-language-server",
  "prettier",
  "prettier_d_slim",
  "pyright",
  "markdownlint-cli",
];

/**
 * Install global Node.js packages via pnpm
 */
export async function installNodePackages(): Promise<void> {
  console.log("Installing pnpm global packages");

  try {
    await $`pnpm add -g ${packages}`;
    console.log("Node stuff installed!");
  } catch (error) {
    console.error("Failed to install Node packages:", error);
    throw error;
  }
}

// If run directly as a script
if (import.meta.main) {
  try {
    await installNodePackages();
  } catch (error) {
    process.exit(1);
  }
}
