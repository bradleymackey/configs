#!/usr/bin/env bun

import { $ } from "bun";
import type { StepResult, SummaryItem } from "./types.ts";

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

async function listGlobalPackages(): Promise<Set<string>> {
  // pnpm list --json prints an array of objects; each has a `dependencies` map
  const result = await $`pnpm list -g --depth 0 --json`.nothrow().quiet();
  if (result.exitCode !== 0) return new Set();
  try {
    const parsed = JSON.parse(result.stdout.toString());
    const names = new Set<string>();
    for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
      const deps = entry?.dependencies ?? {};
      for (const name of Object.keys(deps)) names.add(name);
    }
    return names;
  } catch {
    return new Set();
  }
}

async function isDeprecated(pkg: string): Promise<string | null> {
  // `npm view <pkg> deprecated --json` prints "string" or empty.
  // Use npm view rather than pnpm — works without auth, parseable output.
  const result = await $`npm view ${pkg} deprecated --json`.nothrow().quiet();
  if (result.exitCode !== 0) return null;
  const raw = result.stdout.toString().trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string" && parsed.length > 0) return parsed;
  } catch {
    // Some versions print the bare string (no JSON quotes) — accept that too
    if (raw && raw !== "undefined") return raw;
  }
  return null;
}

/**
 * Audit pnpm global packages for deprecation warnings.
 * Deprecated packages are removed from the install list AND uninstalled.
 * Mutates `packages` in-place so installNodePackages won't re-add them.
 */
export async function auditNodePackages(): Promise<StepResult> {
  const changes: SummaryItem[] = [];
  const installed = await listGlobalPackages();

  const npmCheck = await $`which npm`.nothrow().quiet();
  if (npmCheck.exitCode !== 0) {
    return {
      ok: true,
      changes: [
        {
          category: "Audit",
          name: "pnpm globals",
          status: "skipped",
          detail: "npm not available for registry lookup",
        },
      ],
    };
  }

  const deprecated: string[] = [];
  for (const pkg of [...packages]) {
    const message = await isDeprecated(pkg);
    if (message) {
      deprecated.push(pkg);
      const isInstalled = installed.has(pkg);
      // Drop from the install list so we don't re-add it below
      const idx = packages.indexOf(pkg);
      if (idx >= 0) packages.splice(idx, 1);

      if (isInstalled) {
        const remove = await $`pnpm rm -g ${pkg}`.nothrow();
        changes.push({
          category: "Cleanup",
          name: pkg,
          status: remove.exitCode === 0 ? "replaced" : "failed",
          detail:
            remove.exitCode === 0
              ? `deprecated: ${message}`
              : `deprecated, removal failed`,
        });
      } else {
        changes.push({
          category: "Cleanup",
          name: pkg,
          status: "replaced",
          detail: `deprecated, dropped from install list`,
        });
      }
    }
  }

  if (deprecated.length === 0) {
    changes.push({
      category: "Audit",
      name: `${packages.length} pnpm globals`,
      status: "unchanged",
      detail: "no deprecated packages",
    });
  }

  return { ok: true, changes };
}

/**
 * Install global Node.js packages via pnpm
 */
export async function installNodePackages(): Promise<StepResult> {
  if (packages.length === 0) {
    return {
      ok: true,
      changes: [
        {
          category: "Package step",
          name: "pnpm globals",
          status: "unchanged",
          detail: "no packages to install",
        },
      ],
    };
  }

  const before = await listGlobalPackages();

  try {
    await $`pnpm add -g ${packages}`;
    const after = await listGlobalPackages();
    const changes: SummaryItem[] = packages.map((pkg) => ({
      category: "Package step",
      name: pkg,
      status: before.has(pkg)
        ? "unchanged"
        : after.has(pkg)
          ? "created"
          : "failed",
    }));
    return { ok: true, changes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to install Node packages:", error);
    return { ok: false, error: message };
  }
}

if (import.meta.main) {
  // Standalone path: just run the install. The audit is orchestrated by
  // install.ts because it needs to coordinate with the install step.
  const install = await installNodePackages();
  if (!install.ok) process.exit(1);
}
