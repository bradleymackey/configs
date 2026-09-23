#!/usr/bin/env bun

import type { StepResult, SummaryItem } from "./types.ts";
import type { Context } from "./lib/context.ts";
import { runStandalone } from "./lib/standalone.ts";

// pyright is installed by Homebrew (see home/Brewfile), not here
export const NODE_PACKAGES = [
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
  "markdownlint-cli",
];

export type NodeAuditResult = StepResult & { packages: string[] };

export async function listGlobalPackages(ctx: Context): Promise<Set<string>> {
  // pnpm list --json prints an array of objects; each has a `dependencies` map
  const result = await ctx.runner.run(["pnpm", "list", "-g", "--depth", "0", "--json"], { mutates: false });
  if (result.exitCode !== 0) return new Set();
  try {
    const parsed = JSON.parse(result.stdout);
    const names = new Set<string>();
    for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
      for (const name of Object.keys(entry?.dependencies ?? {})) names.add(name);
    }
    return names;
  } catch {
    return new Set();
  }
}

export async function checkDeprecated(ctx: Context, pkg: string): Promise<string | null> {
  // `npm view <pkg> deprecated --json` prints a JSON string or nothing.
  // Use npm view rather than pnpm — works without auth, parseable output.
  const result = await ctx.runner.run(["npm", "view", pkg, "deprecated", "--json"], { mutates: false });
  if (result.exitCode !== 0) return null;
  const raw = result.stdout.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" && parsed.length > 0 ? parsed : null;
  } catch {
    // Some versions print the bare string (no JSON quotes) — accept that too
    return raw !== "undefined" ? raw : null;
  }
}

/**
 * Audit pnpm global packages for deprecation warnings. Deprecated packages
 * are dropped from the returned install list and uninstalled if present.
 */
export async function auditNodePackages(ctx: Context, packages: string[] = NODE_PACKAGES): Promise<NodeAuditResult> {
  if (!ctx.runner.which("npm")) {
    return {
      ok: true,
      packages,
      changes: [{ category: "Audit", name: "pnpm globals", status: "skipped", detail: "npm not available for registry lookup" }],
    };
  }

  const changes: SummaryItem[] = [];
  const installed = await listGlobalPackages(ctx);
  const keep: string[] = [];

  for (const pkg of packages) {
    const message = await checkDeprecated(ctx, pkg);
    if (!message) {
      keep.push(pkg);
      continue;
    }
    if (!installed.has(pkg)) {
      changes.push({
        category: "Cleanup",
        name: pkg,
        status: ctx.dryRun ? "planned" : "replaced",
        detail: `deprecated, ${ctx.dryRun ? "would drop" : "dropped"} from install list`,
      });
      continue;
    }
    const remove = await ctx.runner.run(["pnpm", "rm", "-g", pkg], { mutates: true });
    changes.push(
      ctx.dryRun
        ? { category: "Cleanup", name: pkg, status: "planned", detail: `deprecated, would uninstall: ${message}` }
        : remove.exitCode === 0
          ? { category: "Cleanup", name: pkg, status: "replaced", detail: `deprecated: ${message}` }
          : { category: "Cleanup", name: pkg, status: "failed", detail: "deprecated, removal failed" },
    );
  }

  if (keep.length === packages.length) {
    changes.push({ category: "Audit", name: `${packages.length} pnpm globals`, status: "unchanged", detail: "no deprecated packages" });
  }

  return { ok: true, changes, packages: keep };
}

/**
 * Install global Node.js packages via pnpm
 */
export async function installNodePackages(ctx: Context, packages: string[] = NODE_PACKAGES): Promise<StepResult> {
  if (packages.length === 0) {
    return {
      ok: true,
      changes: [{ category: "Package step", name: "pnpm globals", status: "unchanged", detail: "no packages to install" }],
    };
  }

  if (!ctx.runner.which("pnpm")) {
    if (ctx.dryRun) {
      return {
        ok: true,
        changes: [{ category: "Package step", name: "pnpm globals", status: "planned", detail: "pnpm not installed yet (Brewfile provides it)" }],
      };
    }
    return { ok: false, error: "pnpm not installed" };
  }

  const before = await listGlobalPackages(ctx);
  const add = await ctx.runner.run(["pnpm", "add", "-g", ...packages], { mutates: true, stream: true });

  if (ctx.dryRun) {
    return {
      ok: true,
      changes: packages.map((pkg) =>
        before.has(pkg)
          ? { category: "Package step", name: pkg, status: "unchanged" }
          : { category: "Package step", name: pkg, status: "planned", detail: "would install" },
      ),
    };
  }

  if (add.exitCode !== 0) {
    return { ok: false, error: "pnpm add -g returned non-zero" };
  }

  const after = await listGlobalPackages(ctx);
  return {
    ok: true,
    changes: packages.map((pkg) => ({
      category: "Package step",
      name: pkg,
      status: before.has(pkg) ? "unchanged" : after.has(pkg) ? "created" : "failed",
    })),
  };
}

/** Audit then install, as one step (the install list depends on the audit). */
export async function syncNodePackages(ctx: Context, packages: string[] = NODE_PACKAGES): Promise<StepResult> {
  const audit = await auditNodePackages(ctx, packages);
  const install = await installNodePackages(ctx, audit.packages);
  return {
    ok: audit.ok && install.ok,
    changes: [...(audit.changes ?? []), ...(install.changes ?? [])],
    error: install.error,
  };
}

if (import.meta.main) {
  process.exitCode = await runStandalone("Node.js packages", syncNodePackages);
}
