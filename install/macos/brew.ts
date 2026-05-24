#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { StepResult, SummaryItem } from "../types.ts";

/**
 * Install Homebrew and packages from Brewfile
 */
export async function installBrew(configsRoot?: string): Promise<StepResult> {
  console.log("Installing brew (requires xcode command line)...");
  const changes: SummaryItem[] = [];

  const CONFIGS_ROOT =
    configsRoot || join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const HOME_PATH = join(CONFIGS_ROOT, "home");

  try {
    const brewInstalled = await $`which brew`.nothrow().quiet();

    if (brewInstalled.exitCode !== 0) {
      console.log("Installing Homebrew...");
      await $`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`;
      changes.push({
        category: "Package step",
        name: "Homebrew",
        status: "created",
      });
    } else {
      console.log("Homebrew already installed");
      changes.push({
        category: "Package step",
        name: "Homebrew",
        status: "unchanged",
      });
    }

    process.env.PATH = `/opt/homebrew/bin:${process.env.PATH}`;

    console.log("Installing brew dependencies...");
    const brewfilePath = join(HOME_PATH, "Brewfile");

    if (existsSync(brewfilePath)) {
      const bundle = await $`brew bundle --file ${brewfilePath}`.nothrow();
      changes.push({
        category: "Package step",
        name: "Brewfile bundle",
        status: bundle.exitCode === 0 ? "unchanged" : "failed",
        detail:
          bundle.exitCode === 0 ? undefined : "brew bundle returned non-zero",
      });
    } else {
      console.warn(`Brewfile not found at ${brewfilePath}`);
      changes.push({
        category: "Package step",
        name: "Brewfile bundle",
        status: "failed",
        detail: `Brewfile missing at ${brewfilePath}`,
      });
    }

    console.log("Installing fzf completions...");
    const fzfPath = await $`brew --prefix`.text();
    await $`${fzfPath.trim()}/opt/fzf/install --key-bindings --completion --no-update-rc`;
    changes.push({
      category: "Package step",
      name: "fzf completions",
      status: "unchanged",
    });

    console.log("Brew stuff installed!");
    return { ok: true, changes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to install Homebrew packages:", error);
    return { ok: false, changes, error: message };
  }
}

/**
 * Audit Brewfile for deprecated or disabled formulae/casks.
 * Does NOT modify the Brewfile — surfaces issues in the summary so the user
 * can decide what to do.
 */
export async function auditBrewfile(configsRoot?: string): Promise<StepResult> {
  console.log("Auditing Brewfile for deprecations...");
  const changes: SummaryItem[] = [];

  const CONFIGS_ROOT =
    configsRoot || join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const brewfilePath = join(CONFIGS_ROOT, "home", "Brewfile");

  if (!existsSync(brewfilePath)) {
    return {
      ok: true,
      changes: [
        {
          category: "Audit",
          name: "Brewfile",
          status: "skipped",
          detail: "Brewfile not found",
        },
      ],
    };
  }

  const brewCheck = await $`which brew`.nothrow().quiet();
  if (brewCheck.exitCode !== 0) {
    return {
      ok: true,
      changes: [
        {
          category: "Audit",
          name: "Brewfile",
          status: "skipped",
          detail: "brew not available",
        },
      ],
    };
  }

  const content = await Bun.file(brewfilePath).text();
  const formulae: string[] = [];
  const casks: string[] = [];
  for (const line of content.split("\n")) {
    const brewMatch = line.match(/^brew\s+"([^"]+)"/);
    if (brewMatch) formulae.push(brewMatch[1]);
    const caskMatch = line.match(/^cask\s+"([^"]+)"/);
    if (caskMatch) casks.push(caskMatch[1]);
  }

  let problemCount = 0;

  async function checkBatch(
    items: string[],
    kind: "formula" | "cask",
  ): Promise<void> {
    if (items.length === 0) return;
    const result =
      kind === "formula"
        ? await $`brew info --json=v2 ${items}`.nothrow()
        : await $`brew info --json=v2 --cask ${items}`.nothrow();

    let parsed: any = null;
    try {
      parsed = JSON.parse(result.stdout.toString());
    } catch {
      changes.push({
        category: "Audit",
        name: `Brewfile ${kind}s`,
        status: "skipped",
        detail: "brew info JSON unparseable",
      });
      return;
    }

    const entries = kind === "formula" ? parsed.formulae : parsed.casks;
    const seen = new Set<string>();
    for (const entry of entries ?? []) {
      const name = kind === "formula" ? entry.full_name : entry.token;
      seen.add(name);
      const replacement =
        entry.deprecation_replacement || entry.disable_replacement;
      if (entry.disabled) {
        changes.push({
          category: "Audit",
          name,
          status: "failed",
          detail: replacement
            ? `disabled — replacement: ${replacement}`
            : "disabled",
        });
        problemCount++;
      } else if (entry.deprecated) {
        changes.push({
          category: "Audit",
          name,
          status: "failed",
          detail: replacement
            ? `deprecated — replacement: ${replacement}`
            : "deprecated",
        });
        problemCount++;
      }
    }
    for (const requested of items) {
      if (!seen.has(requested)) {
        changes.push({
          category: "Audit",
          name: requested,
          status: "failed",
          detail: `${kind} not found in Homebrew`,
        });
        problemCount++;
      }
    }
  }

  await checkBatch(formulae, "formula");
  await checkBatch(casks, "cask");

  if (problemCount === 0) {
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
  const result = await installBrew();
  if (!result.ok) process.exit(1);
}
