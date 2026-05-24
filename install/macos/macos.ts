#!/usr/bin/env bun

import { $ } from "bun";
import type { StepResult } from "../types.ts";

/**
 * Apply macOS system settings
 */
export async function setupMacOS(): Promise<StepResult> {
  console.log("Setting up macOS...");

  try {
    console.log("Setup Dock");
    await $`defaults write com.apple.dock orientation left`;

    console.log("Reducing key repeat");
    await $`defaults write -g InitialKeyRepeat -int 12`;
    await $`defaults write -g KeyRepeat -int 1`;

    console.log("macOS settings applied!");
    return {
      ok: true,
      changes: [
        {
          category: "Package step",
          name: "macOS defaults (dock, key repeat)",
          status: "unchanged",
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to apply macOS settings:", error);
    return { ok: false, error: message };
  }
}

if (import.meta.main) {
  const result = await setupMacOS();
  if (!result.ok) process.exit(1);
}
