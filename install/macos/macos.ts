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

// A fresh Mac defaults to zsh, which loads none of the bash configs in this repo
export const LOGIN_SHELL = "/bin/bash";

/**
 * Make bash the login shell. Reads the current one from Directory Services
 * first; chsh asks for the user's password, so it runs interactively.
 */
export async function setupLoginShell(ctx: Context, shell: string = LOGIN_SHELL): Promise<StepResult> {
  const name = "Login shell";
  const user = ctx.env.USER;
  if (!user) {
    return { ok: true, changes: [{ category: "Setting", name, status: "skipped", detail: "USER not set" }] };
  }

  const read = await ctx.runner.run(["dscl", ".", "-read", `/Users/${user}`, "UserShell"], { mutates: false });
  const current = (read.exitCode === 0 && read.stdout.match(/^UserShell:\s*(\S+)/m)?.[1]) || null;
  if (current === shell) {
    return { ok: true, changes: [{ category: "Setting", name, status: "unchanged", detail: shell }] };
  }

  const transition = `${current ?? "unknown"} → ${shell}`;
  const change = await ctx.runner.run(["chsh", "-s", shell], { mutates: true, stream: true, interactive: true });
  if (ctx.dryRun) {
    return { ok: true, changes: [{ category: "Setting", name, status: "planned", detail: transition }] };
  }
  if (change.exitCode !== 0) {
    return { ok: false, changes: [{ category: "Setting", name, status: "failed", detail: "chsh returned non-zero" }], error: "chsh failed" };
  }
  return { ok: true, changes: [{ category: "Setting", name, status: "replaced", detail: transition }] };
}

/** `defaults` settings then the login shell, as one step. */
export async function configureMacOS(ctx: Context): Promise<StepResult> {
  const settings = await setupMacOS(ctx);
  const shell = await setupLoginShell(ctx);
  return {
    ok: settings.ok && shell.ok,
    changes: [...(settings.changes ?? []), ...(shell.changes ?? [])],
    error: settings.error ?? shell.error,
  };
}

if (import.meta.main) {
  process.exitCode = await runStandalone("macOS system settings", configureMacOS);
}
