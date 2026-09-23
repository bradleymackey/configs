#!/usr/bin/env bun

import { existsSync } from "fs";
import { join } from "path";
import type { StepResult, SummaryItem } from "../types.ts";
import type { Context } from "../lib/context.ts";
import { runStandalone } from "../lib/standalone.ts";

const HOMEBREW_INSTALL = `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`;

// Probes must never trigger Homebrew's auto-update (slow, and it mutates the install)
const BREW_ENV = { HOMEBREW_NO_AUTO_UPDATE: "1" };

export type Brewfile = { taps: string[]; formulae: string[]; casks: string[] };

export function parseBrewfile(text: string): Brewfile {
  const result: Brewfile = { taps: [], formulae: [], casks: [] };
  for (const line of text.split("\n")) {
    const match = line.match(/^(tap|brew|cask)\s+"([^"]+)"/);
    if (!match) continue;
    const [, kind, name] = match;
    if (kind === "tap") result.taps.push(name);
    else if (kind === "brew") result.formulae.push(name);
    else result.casks.push(name);
  }
  return result;
}

/** Parses `brew bundle check --verbose` lines like "→ Cask foo needs to be installed." */
export function parseBundleCheck(output: string): string[] {
  const missing: string[] = [];
  for (const line of output.split("\n")) {
    const match = line.match(/^→ \S+(?: \S+)*? (\S+) needs to be /);
    if (match) missing.push(match[1]);
  }
  return missing;
}

export function brewfilePath(ctx: Context): string {
  return join(ctx.configsRoot, "home", "Brewfile");
}

/**
 * Install Homebrew and packages from the Brewfile
 */
export async function installBrew(ctx: Context): Promise<StepResult> {
  const changes: SummaryItem[] = [];
  const { runner } = ctx;

  if (!runner.which("brew")) {
    if (ctx.dryRun) {
      await runner.run(["/bin/bash", "-c", HOMEBREW_INSTALL], { mutates: true });
      changes.push(
        { category: "Package step", name: "Homebrew", status: "planned", detail: "would install" },
        { category: "Package step", name: "Brewfile bundle", status: "planned", detail: "would install everything in the Brewfile" },
      );
      return { ok: true, changes };
    }
    ctx.log.info("Installing Homebrew...");
    // Interactive: without a TTY on stdin the installer goes non-interactive and can't ask for sudo
    const install = await runner.run(["/bin/bash", "-c", HOMEBREW_INSTALL], { mutates: true, stream: true, interactive: true });
    if (install.exitCode !== 0) {
      changes.push({ category: "Package step", name: "Homebrew", status: "failed", detail: "installer returned non-zero" });
      return { ok: false, changes, error: "Homebrew install failed" };
    }
    // Make the fresh install visible to the rest of this run
    ctx.env.PATH = `/opt/homebrew/bin:${ctx.env.PATH ?? ""}`;
    changes.push({ category: "Package step", name: "Homebrew", status: "created" });
  } else {
    changes.push({ category: "Package step", name: "Homebrew", status: "unchanged" });
  }

  const brewfile = brewfilePath(ctx);
  if (!existsSync(brewfile)) {
    ctx.log.warn(`Brewfile not found at ${brewfile}`);
    changes.push({ category: "Package step", name: "Brewfile bundle", status: "failed", detail: `Brewfile missing at ${brewfile}` });
    return { ok: true, changes };
  }

  const check = await runner.run(["brew", "bundle", "check", "--file", brewfile, "--verbose", "--no-upgrade"], {
    mutates: false,
    env: BREW_ENV,
  });
  const missing = check.exitCode === 0 ? [] : parseBundleCheck(check.stdout + check.stderr);

  const bundle = await runner.run(["brew", "bundle", "--file", brewfile], { mutates: true, stream: true });
  if (ctx.dryRun) {
    changes.push(
      missing.length > 0
        ? { category: "Package step", name: "Brewfile bundle", status: "planned", detail: `would install: ${missing.join(", ")}` }
        : { category: "Package step", name: "Brewfile bundle", status: "unchanged", detail: "all dependencies satisfied" },
    );
  } else if (bundle.exitCode !== 0) {
    changes.push({ category: "Package step", name: "Brewfile bundle", status: "failed", detail: "brew bundle returned non-zero" });
  } else {
    changes.push(
      missing.length > 0
        ? { category: "Package step", name: "Brewfile bundle", status: "created", detail: `installed: ${missing.join(", ")}` }
        : { category: "Package step", name: "Brewfile bundle", status: "unchanged" },
    );
  }

  // ~/.fzf.bash is what .bashrc sources; fzf's own install script generates it
  if (existsSync(join(ctx.home, ".fzf.bash"))) {
    changes.push({ category: "Package step", name: "fzf completions", status: "unchanged" });
  } else {
    const prefix = (await runner.run(["brew", "--prefix"], { mutates: false, env: BREW_ENV })).stdout.trim();
    const fzf = await runner.run(
      [join(prefix, "opt", "fzf", "install"), "--key-bindings", "--completion", "--no-update-rc", "--no-zsh", "--no-fish", "--no-nushell"],
      { mutates: true },
    );
    changes.push(
      ctx.dryRun
        ? { category: "Package step", name: "fzf completions", status: "planned", detail: "would install bash key bindings" }
        : fzf.exitCode === 0
          ? { category: "Package step", name: "fzf completions", status: "created" }
          : { category: "Package step", name: "fzf completions", status: "failed", detail: "fzf install returned non-zero" },
    );
  }

  return { ok: true, changes };
}

type BrewInfoEntry = {
  full_name?: string;
  token?: string;
  deprecated?: boolean;
  disabled?: boolean;
  deprecation_replacement?: string;
  disable_replacement?: string;
};

/**
 * Audit Brewfile for deprecated, disabled, or missing formulae/casks.
 * Read-only: surfaces issues in the summary so the user can decide.
 */
export async function auditBrewfile(ctx: Context): Promise<StepResult> {
  const changes: SummaryItem[] = [];
  const brewfile = brewfilePath(ctx);

  if (!existsSync(brewfile)) {
    return { ok: true, changes: [{ category: "Audit", name: "Brewfile", status: "skipped", detail: "Brewfile not found" }] };
  }
  if (!ctx.runner.which("brew")) {
    return { ok: true, changes: [{ category: "Audit", name: "Brewfile", status: "skipped", detail: "brew not available" }] };
  }

  const { formulae, casks } = parseBrewfile(await Bun.file(brewfile).text());
  let problems = 0;

  async function brewInfo(items: string[], kind: "formula" | "cask"): Promise<BrewInfoEntry[] | { error: string }> {
    const cmd = kind === "formula" ? ["brew", "info", "--json=v2", ...items] : ["brew", "info", "--json=v2", "--cask", ...items];
    const result = await ctx.runner.run(cmd, { mutates: false, env: BREW_ENV });
    try {
      const parsed: { formulae?: BrewInfoEntry[]; casks?: BrewInfoEntry[] } = JSON.parse(result.stdout);
      return (kind === "formula" ? parsed.formulae : parsed.casks) ?? [];
    } catch {
      return { error: result.stderr.trim().split("\n")[0] || "brew info returned no JSON" };
    }
  }

  async function checkBatch(items: string[], kind: "formula" | "cask"): Promise<void> {
    if (items.length === 0) return;
    const seen = new Set<string>();
    const entries: BrewInfoEntry[] = [];

    const batch = await brewInfo(items, kind);
    if (Array.isArray(batch)) {
      entries.push(...batch);
    } else {
      // One bad entry (unknown, untrusted tap, ...) fails the whole batch; check each on its own
      for (const item of items) {
        const single = items.length > 1 ? await brewInfo([item], kind) : batch;
        if (Array.isArray(single)) {
          entries.push(...single);
        } else {
          changes.push({ category: "Audit", name: item, status: "failed", detail: single.error });
          problems++;
          seen.add(item);
        }
      }
    }

    for (const entry of entries) {
      const name = (kind === "formula" ? entry.full_name : entry.token) ?? "?";
      seen.add(name);
      const state = entry.disabled ? "disabled" : entry.deprecated ? "deprecated" : null;
      if (!state) continue;
      const replacement = entry.deprecation_replacement || entry.disable_replacement;
      changes.push({
        category: "Audit",
        name,
        status: "failed",
        detail: replacement ? `${state} — replacement: ${replacement}` : state,
      });
      problems++;
    }
    for (const requested of items) {
      if (!seen.has(requested)) {
        changes.push({ category: "Audit", name: requested, status: "failed", detail: `${kind} not found in Homebrew` });
        problems++;
      }
    }
  }

  await checkBatch(formulae, "formula");
  await checkBatch(casks, "cask");

  if (problems === 0) {
    changes.push({
      category: "Audit",
      name: `${formulae.length} formulae · ${casks.length} casks`,
      status: "unchanged",
      detail: "all healthy",
    });
  }

  return { ok: true, changes };
}

if (import.meta.main) {
  process.exitCode = await runStandalone("Homebrew installation", installBrew);
}
