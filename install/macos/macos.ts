#!/usr/bin/env bun

import type { StepResult, SummaryItem } from "../types.ts";
import type { Context } from "../lib/context.ts";
import { runStandalone } from "../lib/standalone.ts";

export type DefaultSetting = {
  label: string;
  domain: string;
  key: string;
  type: "string" | "int" | "bool";
  value: string;
};

export const MACOS_DEFAULTS: DefaultSetting[] = [
  { label: "Dock orientation", domain: "com.apple.dock", key: "orientation", type: "string", value: "left" },
  { label: "Initial key repeat", domain: "NSGlobalDomain", key: "InitialKeyRepeat", type: "int", value: "12" },
  { label: "Key repeat", domain: "NSGlobalDomain", key: "KeyRepeat", type: "int", value: "1" },
];

/**
 * Apply macOS system settings. Reads each value first so the summary reports
 * what actually changed (and dry-run shows current -> desired).
 */
export async function setupMacOS(ctx: Context, settings: DefaultSetting[] = MACOS_DEFAULTS): Promise<StepResult> {
  const changes: SummaryItem[] = [];
  let ok = true;

  for (const setting of settings) {
    const { domain, key, type, value, label } = setting;
    const read = await ctx.runner.run(["defaults", "read", domain, key], { mutates: false });
    const current = read.exitCode === 0 ? read.stdout.trim() : null;

    if (current === value) {
      changes.push({ category: "Setting", name: label, status: "unchanged", detail: `${key} = ${value}` });
      continue;
    }

    const write = await ctx.runner.run(["defaults", "write", domain, key, `-${type}`, value], { mutates: true });
    const transition = `${key}: ${current ?? "unset"} → ${value}`;
    if (ctx.dryRun) {
      changes.push({ category: "Setting", name: label, status: "planned", detail: transition });
    } else if (write.exitCode === 0) {
      changes.push({ category: "Setting", name: label, status: current === null ? "created" : "replaced", detail: transition });
    } else {
      ok = false;
      changes.push({ category: "Setting", name: label, status: "failed", detail: `defaults write failed: ${write.stderr.trim()}` });
    }
  }

  return ok ? { ok, changes } : { ok, changes, error: "some macOS settings could not be written" };
}

if (import.meta.main) {
  process.exitCode = await runStandalone("macOS system settings", setupMacOS);
}
