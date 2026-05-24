#!/usr/bin/env bun

import { $ } from "bun";
import type { StepResult, SummaryItem } from "./types.ts";

const COMPONENTS = ["rust-src", "clippy", "rustfmt"];
const DEPRECATED_COMPONENTS = ["rls", "rust-analysis"];

async function listInstalledComponents(): Promise<string[]> {
  const result = await $`rustup component list --installed`.nothrow().quiet();
  if (result.exitCode !== 0) return [];
  return result.stdout
    .toString()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Install Rust toolchain and components, removing any deprecated components.
 */
export async function installRust(): Promise<StepResult> {
  const changes: SummaryItem[] = [];
  console.log("Installing rust...");

  try {
    // rustup itself
    const rustupCheck = await $`which rustup`.nothrow().quiet();
    if (rustupCheck.exitCode !== 0) {
      await $`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`;
      changes.push({
        category: "Package step",
        name: "rustup",
        status: "created",
      });
    } else {
      changes.push({
        category: "Package step",
        name: "rustup",
        status: "unchanged",
      });
    }

    console.log("Updating rust stable...");
    await $`rustup update stable`;

    // Remove deprecated components if present
    const installedBefore = await listInstalledComponents();
    const toRemove = DEPRECATED_COMPONENTS.filter((c) =>
      installedBefore.some((line) => line.startsWith(c)),
    );
    for (const name of toRemove) {
      console.log(`Removing deprecated component: ${name}`);
      const remove = await $`rustup component remove ${name}`.nothrow();
      if (remove.exitCode === 0) {
        changes.push({
          category: "Cleanup",
          name,
          status: "replaced",
          detail: "removed deprecated rustup component",
        });
      } else {
        changes.push({
          category: "Cleanup",
          name,
          status: "failed",
          detail: `rustup component remove failed`,
        });
      }
    }

    console.log("Installing rust components...");
    await $`rustup component add ${COMPONENTS}`;

    const installedAfter = await listInstalledComponents();
    for (const c of COMPONENTS) {
      const wasInstalled = installedBefore.some((line) => line.startsWith(c));
      const isInstalled = installedAfter.some((line) => line.startsWith(c));
      if (!isInstalled) {
        changes.push({
          category: "Package step",
          name: c,
          status: "failed",
          detail: "component not present after add",
        });
      } else {
        changes.push({
          category: "Package step",
          name: c,
          status: wasInstalled ? "unchanged" : "created",
        });
      }
    }

    console.log("Installing cargo-edit...");
    const cargoEditCheck = await $`cargo install --list`.nothrow().quiet();
    const alreadyHasCargoEdit = cargoEditCheck.stdout
      .toString()
      .includes("cargo-edit ");
    await $`cargo install cargo-edit`;
    changes.push({
      category: "Package step",
      name: "cargo-edit",
      status: alreadyHasCargoEdit ? "unchanged" : "created",
    });

    console.log("Rust stuff installed!");
    return { ok: true, changes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to install Rust:", error);
    return { ok: false, changes, error: message };
  }
}

if (import.meta.main) {
  const result = await installRust();
  if (!result.ok) process.exit(1);
}
