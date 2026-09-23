#!/usr/bin/env bun

import { join } from "path";
import type { StepResult, SummaryItem } from "./types.ts";
import type { Context } from "./lib/context.ts";
import { runStandalone } from "./lib/standalone.ts";

export const RUST_COMPONENTS = ["rust-src", "clippy", "rustfmt"];
export const DEPRECATED_COMPONENTS = ["rls", "rust-analysis"];
export const CARGO_TOOLS = ["cargo-edit"];

const RUSTUP_INSTALL = "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y";

export async function listInstalledComponents(ctx: Context): Promise<string[]> {
  const result = await ctx.runner.run(["rustup", "component", "list", "--installed"], { mutates: false });
  if (result.exitCode !== 0) return [];
  return result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function listCargoTools(ctx: Context): Promise<Set<string>> {
  const result = await ctx.runner.run(["cargo", "install", "--list"], { mutates: false });
  const names = new Set<string>();
  // Lines look like "cargo-edit v0.13.10:"; binaries are indented beneath
  for (const line of result.stdout.split("\n")) {
    const match = line.match(/^(\S+) v\S+:$/);
    if (match) names.add(match[1]);
  }
  return names;
}

const hasComponent = (installed: string[], name: string) => installed.some((line) => line.startsWith(name));

/**
 * Install Rust toolchain and components, removing any deprecated components.
 */
export async function installRust(ctx: Context): Promise<StepResult> {
  const changes: SummaryItem[] = [];
  const { runner } = ctx;

  if (!runner.which("rustup")) {
    const install = await runner.run(["/bin/sh", "-c", RUSTUP_INSTALL], { mutates: true, stream: true });
    if (ctx.dryRun) {
      changes.push({ category: "Package step", name: "rustup", status: "planned", detail: "would install" });
      for (const c of [...RUST_COMPONENTS, ...CARGO_TOOLS]) {
        changes.push({ category: "Package step", name: c, status: "planned", detail: "would install" });
      }
      return { ok: true, changes };
    }
    if (install.exitCode !== 0) {
      changes.push({ category: "Package step", name: "rustup", status: "failed", detail: "installer returned non-zero" });
      return { ok: false, changes, error: "rustup install failed" };
    }
    // rustup installs into ~/.cargo/bin; make it visible to the rest of this run
    ctx.env.PATH = `${join(ctx.home, ".cargo", "bin")}:${ctx.env.PATH ?? ""}`;
    changes.push({ category: "Package step", name: "rustup", status: "created" });
  } else {
    changes.push({ category: "Package step", name: "rustup", status: "unchanged" });
  }

  const update = await runner.run(["rustup", "update", "stable"], { mutates: true, stream: true });
  if (update.exitCode !== 0) {
    changes.push({ category: "Package step", name: "rust stable", status: "failed", detail: "rustup update returned non-zero" });
    return { ok: false, changes, error: "rustup update stable failed" };
  }

  const installedBefore = await listInstalledComponents(ctx);

  for (const name of DEPRECATED_COMPONENTS.filter((c) => hasComponent(installedBefore, c))) {
    const remove = await runner.run(["rustup", "component", "remove", name], { mutates: true });
    changes.push(
      ctx.dryRun
        ? { category: "Cleanup", name, status: "planned", detail: "would remove deprecated rustup component" }
        : remove.exitCode === 0
          ? { category: "Cleanup", name, status: "replaced", detail: "removed deprecated rustup component" }
          : { category: "Cleanup", name, status: "failed", detail: "rustup component remove failed" },
    );
  }

  const add = await runner.run(["rustup", "component", "add", ...RUST_COMPONENTS], { mutates: true, stream: true });
  const installedAfter = ctx.dryRun ? installedBefore : await listInstalledComponents(ctx);
  for (const c of RUST_COMPONENTS) {
    if (hasComponent(installedBefore, c)) {
      changes.push({ category: "Package step", name: c, status: "unchanged" });
    } else if (ctx.dryRun) {
      changes.push({ category: "Package step", name: c, status: "planned", detail: "would install" });
    } else if (add.exitCode === 0 && hasComponent(installedAfter, c)) {
      changes.push({ category: "Package step", name: c, status: "created" });
    } else {
      changes.push({ category: "Package step", name: c, status: "failed", detail: "component not present after add" });
    }
  }

  const cargoTools = await listCargoTools(ctx);
  for (const tool of CARGO_TOOLS) {
    if (cargoTools.has(tool)) {
      changes.push({ category: "Package step", name: tool, status: "unchanged" });
      continue;
    }
    const install = await runner.run(["cargo", "install", tool], { mutates: true, stream: true });
    changes.push(
      ctx.dryRun
        ? { category: "Package step", name: tool, status: "planned", detail: "would cargo install" }
        : install.exitCode === 0
          ? { category: "Package step", name: tool, status: "created" }
          : { category: "Package step", name: tool, status: "failed", detail: "cargo install returned non-zero" },
    );
  }

  return { ok: true, changes };
}

if (import.meta.main) {
  process.exitCode = await runStandalone("Rust toolchain", installRust);
}
