#!/usr/bin/env bun

import { $ } from "bun";

console.log("Installing pnpm global packages");

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
];

try {
  await $`pnpm add -g ${packages}`;
  console.log("Node stuff installed!");
} catch (error) {
  console.error("Failed to install Node packages:", error);
  process.exit(1);
}
