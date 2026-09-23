import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, readlinkSync, readdirSync, symlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { fsImpl, lexists, readLink, safeMkdir, safeSymlink, verifySymlink } from "../../install/lib/fs-ops.ts";
import { cleanupTempDirs, makeCtx, snapshotTree, tempDir } from "../helpers.ts";

afterEach(cleanupTempDirs);

function setup(dryRun = false) {
  const ctx = makeCtx({ dryRun });
  const sourceDir = tempDir("configs-src-");
  const source = join(sourceDir, ".bashrc");
  writeFileSync(source, "configs bashrc");
  const target = join(ctx.home, ".bashrc");
  return { ctx, source, target, spec: { source, target } };
}

const backups = (dir: string) => readdirSync(dir).filter((f) => f.includes(".backup."));

describe("lexists / readLink", () => {
  test("lexists sees dangling links that existsSync misses", () => {
    const dir = tempDir();
    const link = join(dir, "dangling");
    symlinkSync(join(dir, "nowhere"), link);
    expect(lexists(link)).toBe(true);
    expect(lexists(join(dir, "absent"))).toBe(false);
  });

  test("readLink returns null for non-links", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "file"), "");
    expect(readLink(join(dir, "file"))).toBeNull();
  });
});

describe("safeMkdir", () => {
  test("leaves existing directories alone (logging only when verbose)", () => {
    const ctx = makeCtx({ verbose: true });
    expect(safeMkdir(ctx, ctx.home)).toBe("unchanged");
    expect(ctx.summary).toEqual([]);
    expect(ctx.logger.text()).toContain("Directory already exists");
  });

  test("creates missing directories recursively", () => {
    const ctx = makeCtx();
    const dir = join(ctx.home, "a", "b");
    expect(safeMkdir(ctx, dir)).toBe("created");
    expect(lexists(dir)).toBe(true);
    expect(ctx.summary).toEqual([{ category: "Directory", name: "~/a/b", status: "created" }]);
  });

  test("dry-run plans the directory once and creates nothing", () => {
    const ctx = makeCtx({ dryRun: true });
    const dir = join(ctx.home, ".config");
    expect(safeMkdir(ctx, dir)).toBe("planned");
    expect(safeMkdir(ctx, dir)).toBe("planned");
    expect(lexists(dir)).toBe(false);
    expect(ctx.summary).toEqual([{ category: "Directory", name: "~/.config", status: "planned", detail: "would create" }]);
  });

  test("reports failures", () => {
    const ctx = makeCtx();
    writeFileSync(join(ctx.home, "file"), "");
    expect(safeMkdir(ctx, join(ctx.home, "file", "sub"))).toBe("failed");
    expect(ctx.summary[0].status).toBe("failed");
  });
});

describe("safeSymlink", () => {
  test("fails when the source is missing, without touching the target", () => {
    const { ctx, target } = setup();
    expect(safeSymlink(ctx, { source: join(ctx.home, "missing"), target })).toBe("failed");
    expect(lexists(target)).toBe(false);
    expect(ctx.summary[0].detail).toContain("source missing");
  });

  test("creates the link", () => {
    const { ctx, spec, source, target } = setup();
    expect(safeSymlink(ctx, spec)).toBe("created");
    expect(readlinkSync(target)).toBe(source);
  });

  test("creates missing parent directories", () => {
    const { ctx, source } = setup();
    const target = join(ctx.home, "Library", "Application Support", "nushell", "config.nu");
    expect(safeSymlink(ctx, { source, target })).toBe("created");
    expect(readlinkSync(target)).toBe(source);
  });

  test("fails cleanly when the parent directory can't be created", () => {
    const { ctx, source } = setup();
    writeFileSync(join(ctx.home, "blocker"), "");
    expect(safeSymlink(ctx, { source, target: join(ctx.home, "blocker", "sub", "x") })).toBe("failed");
    expect(ctx.summary.at(-1)?.detail).toBe("parent directory missing");
  });

  test("leaves a correct link untouched", () => {
    const { ctx, spec, source, target } = setup();
    symlinkSync(source, target);
    expect(safeSymlink(ctx, spec)).toBe("unchanged");
    expect(ctx.logger.text()).toContain("Symlink already exists");
  });

  test("does not write into a directory the target already links to", () => {
    const { ctx } = setup();
    const sourceDir = tempDir("configs-srcdir-");
    const target = join(ctx.home, "nvim");
    symlinkSync(sourceDir, target);
    expect(safeSymlink(ctx, { source: sourceDir, target })).toBe("unchanged");
    expect(readdirSync(sourceDir)).toEqual([]);
  });

  test.each([
    ["regular file", (t: string) => writeFileSync(t, "user data")],
    ["directory", (t: string) => mkdirSync(t)],
    ["link elsewhere", (t: string) => symlinkSync("/elsewhere", t)],
    ["dangling link", (t: string) => symlinkSync("/nonexistent/path", t)],
  ])("backs up and replaces a %s", (_, create) => {
    const { ctx, spec, source, target } = setup();
    create(target);

    expect(safeSymlink(ctx, spec)).toBe("replaced");

    expect(readlinkSync(target)).toBe(source);
    expect(backups(ctx.home)).toHaveLength(1);
    expect(ctx.summary.at(-1)?.detail).toStartWith("backup: .bashrc.backup.");
  });

  test("backup keeps the original content", () => {
    const { ctx, spec, target } = setup();
    writeFileSync(target, "user data");
    safeSymlink(ctx, spec);
    expect(readFileSync(join(ctx.home, backups(ctx.home)[0]), "utf8")).toBe("user data");
  });

  test("dry-run plans a create and writes nothing", () => {
    const { ctx, spec } = setup(true);
    const before = snapshotTree(ctx.home);
    expect(safeSymlink(ctx, spec)).toBe("planned");
    expect(snapshotTree(ctx.home)).toEqual(before);
    expect(ctx.summary).toEqual([{ category: "Symlink", name: "~/.bashrc", status: "planned", detail: "would create" }]);
  });

  test("dry-run plans a replace and leaves the existing file", () => {
    const { ctx, spec, target } = setup(true);
    writeFileSync(target, "user data");
    const before = snapshotTree(ctx.home);
    expect(safeSymlink(ctx, spec)).toBe("planned");
    expect(snapshotTree(ctx.home)).toEqual(before);
    expect(ctx.summary.at(-1)?.detail).toBe("would back up and replace");
  });

  test("dry-run plans the missing parent directory too", () => {
    const { ctx, source } = setup(true);
    safeSymlink(ctx, { source, target: join(ctx.home, ".config", "x") });
    expect(ctx.summary.map((i) => i.category)).toEqual(["Directory", "Symlink"]);
  });

  test("treats a concurrent run creating the same link as unchanged", () => {
    const { ctx, spec, source, target } = setup();
    const spy = spyOn(fsImpl, "symlinkSync").mockImplementationOnce((s, t) => {
      symlinkSync(s, t); // the other run wins the race
      throw Object.assign(new Error("EEXIST: file already exists"), { code: "EEXIST" });
    });
    try {
      expect(safeSymlink(ctx, spec)).toBe("unchanged");
    } finally {
      spy.mockRestore();
    }
    expect(readlinkSync(target)).toBe(source);
  });

  test("reports symlink failures", () => {
    const { ctx, spec } = setup();
    const spy = spyOn(fsImpl, "symlinkSync").mockImplementationOnce(() => {
      throw new Error("EACCES: permission denied");
    });
    try {
      expect(safeSymlink(ctx, spec)).toBe("failed");
    } finally {
      spy.mockRestore();
    }
    expect(ctx.summary.at(-1)?.detail).toContain("EACCES");
  });

  test("reports backup failures and leaves the target in place", () => {
    const { ctx, spec, target } = setup();
    writeFileSync(target, "user data");
    const spy = spyOn(fsImpl, "renameSync").mockImplementationOnce(() => {
      throw new Error("EBUSY");
    });
    try {
      expect(safeSymlink(ctx, spec)).toBe("failed");
    } finally {
      spy.mockRestore();
    }
    expect(readFileSync(target, "utf8")).toBe("user data");
    expect(ctx.summary.at(-1)?.detail).toBe("backup failed: EBUSY");
  });

  test("stringifies non-Error failures", () => {
    const { ctx, spec } = setup();
    const spy = spyOn(fsImpl, "symlinkSync").mockImplementationOnce(() => {
      throw "boom";
    });
    try {
      safeSymlink(ctx, spec);
    } finally {
      spy.mockRestore();
    }
    expect(ctx.summary.at(-1)?.detail).toBe("boom");
  });
});

describe("verifySymlink", () => {
  test("classifies every state", () => {
    const { source, target } = setup();
    const missingSource = join(tempDir(), "nope");

    expect(verifySymlink({ source: missingSource, target }).status).toBe("source-missing");
    expect(verifySymlink({ source, target }).status).toBe("missing");

    writeFileSync(target, "x");
    expect(verifySymlink({ source, target }).status).toBe("not-symlink");

    const other = { source, target: target + "2" };
    symlinkSync("/nonexistent", other.target);
    expect(verifySymlink(other).status).toBe("wrong");
    expect(verifySymlink(other).message).toContain("expected: " + source);

    const good = { source, target: target + "3" };
    symlinkSync(source, good.target);
    expect(verifySymlink(good)).toEqual({ status: "ok", message: `OK: ${good.target} -> ${source}` });
  });
});
