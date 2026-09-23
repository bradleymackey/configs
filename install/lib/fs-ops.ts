/**
 * Filesystem operations for dotfile symlinks. Uses lstat/symlinkSync rather
 * than existsSync/`ln -s`: existsSync misses dangling links, and `ln -s` into
 * an existing directory symlink writes the new link *inside* that directory.
 */

import { lstatSync, mkdirSync, readlinkSync, renameSync, symlinkSync } from "fs";
import { basename, dirname } from "path";
import type { ItemStatus } from "../types.ts";
import { displayPath, record, type Context } from "./context.ts";

export type SymlinkSpec = { source: string; target: string };

/** Mutating fs calls go through here so tests can simulate races and I/O errors. */
export const fsImpl = { mkdirSync, renameSync, symlinkSync };

export type VerifyStatus = "ok" | "missing" | "wrong" | "not-symlink" | "source-missing";

export function lexists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export function readLink(path: string): string | null {
  try {
    return readlinkSync(path);
  } catch {
    return null;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function safeMkdir(ctx: Context, dir: string): ItemStatus {
  const name = displayPath(ctx, dir);

  if (lexists(dir)) {
    if (ctx.verbose) ctx.log.info(`Directory already exists: ${dir}`);
    return "unchanged";
  }

  if (ctx.dryRun) {
    // Several links can share a missing parent; report it once
    if (!ctx.summary.some((i) => i.category === "Directory" && i.name === name)) {
      ctx.log.dryRun(`Would create directory: ${dir}`);
      record(ctx, { category: "Directory", name, status: "planned", detail: "would create" });
    }
    return "planned";
  }

  try {
    fsImpl.mkdirSync(dir, { recursive: true });
    ctx.log.success(`Created directory: ${dir}`);
    record(ctx, { category: "Directory", name, status: "created" });
    return "created";
  } catch (error) {
    ctx.log.error(`Failed to create directory: ${dir}`);
    record(ctx, { category: "Directory", name, status: "failed", detail: errorMessage(error) });
    return "failed";
  }
}

function createLink(ctx: Context, { source, target }: SymlinkSpec, name: string, onCreated: ItemStatus, detail?: string): ItemStatus {
  try {
    fsImpl.symlinkSync(source, target);
  } catch (error) {
    // A concurrent run may have created the same link between our check and now
    if ((error as NodeJS.ErrnoException).code === "EEXIST" && readLink(target) === source) {
      ctx.log.info(`Symlink already exists: ${target} -> ${source}`);
      record(ctx, { category: "Symlink", name, status: "unchanged" });
      return "unchanged";
    }
    ctx.log.error(`Failed to create symlink: ${target} -> ${source}`);
    record(ctx, { category: "Symlink", name, status: "failed", detail: errorMessage(error) });
    return "failed";
  }
  ctx.log.success(`Created symlink: ${target} -> ${source}`);
  record(ctx, { category: "Symlink", name, status: onCreated, detail });
  return onCreated;
}

export function safeSymlink(ctx: Context, spec: SymlinkSpec): ItemStatus {
  const { source, target } = spec;
  const name = displayPath(ctx, target);

  if (!lexists(source)) {
    ctx.log.error(`Source does not exist: ${source}`);
    record(ctx, { category: "Symlink", name, status: "failed", detail: `source missing: ${source}` });
    return "failed";
  }

  if (lexists(target) && readLink(target) === source) {
    ctx.log.info(`Symlink already exists: ${target} -> ${source}`);
    record(ctx, { category: "Symlink", name, status: "unchanged" });
    return "unchanged";
  }

  if (safeMkdir(ctx, dirname(target)) === "failed") {
    record(ctx, { category: "Symlink", name, status: "failed", detail: "parent directory missing" });
    return "failed";
  }

  if (!lexists(target)) {
    if (ctx.dryRun) {
      ctx.log.dryRun(`Would create symlink: ${target} -> ${source}`);
      record(ctx, { category: "Symlink", name, status: "planned", detail: "would create" });
      return "planned";
    }
    return createLink(ctx, spec, name, "created");
  }

  // Target exists but isn't our link (regular file, directory, wrong or dangling link)
  const backup = `${target}.backup.${Date.now()}`;
  if (ctx.dryRun) {
    ctx.log.dryRun(`Would back up ${target} -> ${backup} and create symlink -> ${source}`);
    record(ctx, { category: "Symlink", name, status: "planned", detail: "would back up and replace" });
    return "planned";
  }

  ctx.log.warn(`Target exists, backing up: ${target} -> ${backup}`);
  try {
    fsImpl.renameSync(target, backup);
  } catch (error) {
    ctx.log.error(`Failed to backup: ${errorMessage(error)}`);
    record(ctx, { category: "Symlink", name, status: "failed", detail: `backup failed: ${errorMessage(error)}` });
    return "failed";
  }
  return createLink(ctx, spec, name, "replaced", `backup: ${basename(backup)}`);
}

export function verifySymlink({ source, target }: SymlinkSpec): { status: VerifyStatus; message: string } {
  if (!lexists(source)) {
    return { status: "source-missing", message: `Source does not exist: ${source}` };
  }
  if (!lexists(target)) {
    return { status: "missing", message: `Not linked: ${target} -> ${source}` };
  }
  const linkTarget = readLink(target);
  if (linkTarget === null) {
    return { status: "not-symlink", message: `Not a symlink: ${target} (file/directory exists)` };
  }
  if (linkTarget === source) {
    return { status: "ok", message: `OK: ${target} -> ${source}` };
  }
  return { status: "wrong", message: `Wrong target: ${target} -> ${linkTarget} (expected: ${source})` };
}
