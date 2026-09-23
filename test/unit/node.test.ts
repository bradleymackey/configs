import { afterEach, describe, expect, test } from "bun:test";
import {
  auditNodePackages,
  checkDeprecated,
  ensurePnpmHome,
  installNodePackages,
  listGlobalPackages,
  NODE_PACKAGES,
  syncNodePackages,
} from "../../install/node.ts";
import { cleanupTempDirs, FakeRunner, makeCtx } from "../helpers.ts";

afterEach(cleanupTempDirs);

const installed = (...names: string[]) => ({
  stdout: JSON.stringify([{ dependencies: Object.fromEntries(names.map((n) => [n, { version: "1.0.0" }])) }]),
});

const tools = (...bins: string[]) => new FakeRunner(new Set(bins));

describe("NODE_PACKAGES", () => {
  test("leaves pyright to Homebrew", () => {
    expect(NODE_PACKAGES).not.toContain("pyright");
  });
});

describe("listGlobalPackages", () => {
  test("parses pnpm's array output", async () => {
    const fake = tools().on("pnpm list", installed("a", "b"));
    expect([...(await listGlobalPackages(makeCtx({ fake })))]).toEqual(["a", "b"]);
  });

  test("accepts a single object and entries without dependencies", async () => {
    const fake = tools().on("pnpm list", { stdout: JSON.stringify({ dependencies: { a: {} } }) });
    expect([...(await listGlobalPackages(makeCtx({ fake })))]).toEqual(["a"]);
    const empty = tools().on("pnpm list", { stdout: JSON.stringify([{}]) });
    expect((await listGlobalPackages(makeCtx({ fake: empty }))).size).toBe(0);
  });

  test("returns an empty set on errors or garbage", async () => {
    expect((await listGlobalPackages(makeCtx({ fake: tools().on("pnpm", { exitCode: 1 }) }))).size).toBe(0);
    expect((await listGlobalPackages(makeCtx({ fake: tools().on("pnpm", { stdout: "not json" }) }))).size).toBe(0);
  });
});

describe("checkDeprecated", () => {
  const check = (result: object) => checkDeprecated(makeCtx({ fake: tools().on("npm view", result) }), "pkg");

  test("returns the deprecation message", async () => {
    expect(await check({ stdout: '"use something else"\n' })).toBe("use something else");
  });

  test("accepts bare (unquoted) messages", async () => {
    expect(await check({ stdout: "use something else" })).toBe("use something else");
  });

  test("returns null when not deprecated or on errors", async () => {
    expect(await check({ stdout: "" })).toBeNull();
    expect(await check({ stdout: "undefined" })).toBeNull();
    expect(await check({ stdout: '""' })).toBeNull();
    expect(await check({ stdout: "false" })).toBeNull();
    expect(await check({ exitCode: 1 })).toBeNull();
  });
});

describe("auditNodePackages", () => {
  test("skips when npm is not available", async () => {
    const result = await auditNodePackages(makeCtx({ fake: tools() }), ["a"]);
    expect(result.packages).toEqual(["a"]);
    expect(result.changes?.[0]).toMatchObject({ status: "skipped" });
  });

  test("keeps everything when nothing is deprecated", async () => {
    const result = await auditNodePackages(makeCtx({ fake: tools("npm") }), ["a", "b"]);
    expect(result.packages).toEqual(["a", "b"]);
    expect(result.changes).toEqual([{ category: "Audit", name: "2 pnpm globals", status: "unchanged", detail: "no deprecated packages" }]);
  });

  test("drops deprecated packages and uninstalls the installed ones", async () => {
    const fake = tools("npm")
      .on("pnpm list", installed("old-installed"))
      .on("npm view old-", { stdout: '"gone"' });
    const result = await auditNodePackages(makeCtx({ fake }), ["keep", "old-installed", "old-absent"]);

    expect(result.packages).toEqual(["keep"]);
    expect(fake.mutatingCommands()).toEqual(["pnpm rm -g old-installed"]);
    expect(result.changes).toEqual([
      { category: "Cleanup", name: "old-installed", status: "replaced", detail: "deprecated: gone" },
      { category: "Cleanup", name: "old-absent", status: "replaced", detail: "deprecated, dropped from install list" },
    ]);
  });

  test("reports a failed uninstall", async () => {
    const fake = tools("npm").on("pnpm list", installed("old")).on("npm view", { stdout: '"gone"' }).on("pnpm rm", { exitCode: 1 });
    const result = await auditNodePackages(makeCtx({ fake }), ["old"]);
    expect(result.changes?.[0]).toMatchObject({ status: "failed", detail: "deprecated, removal failed" });
  });

  test("dry-run plans the cleanup without uninstalling", async () => {
    const fake = tools("npm").on("pnpm list", installed("old")).on("npm view", { stdout: '"gone"' });
    const ctx = makeCtx({ dryRun: true, fake });
    const result = await auditNodePackages(ctx, ["old", "old-absent"]);
    expect(fake.mutatingCommands()).toEqual([]);
    expect(result.changes?.map((c) => [c.status, c.detail])).toEqual([
      ["planned", "deprecated, would uninstall: gone"],
      ["planned", "deprecated, would drop from install list"],
    ]);
  });

  test("defaults to the configured package list", async () => {
    const result = await auditNodePackages(makeCtx({ fake: tools() }));
    expect(result.packages).toEqual(NODE_PACKAGES);
  });
});

describe("installNodePackages", () => {
  test("does nothing for an empty list", async () => {
    const fake = tools("pnpm");
    const result = await installNodePackages(makeCtx({ fake }), []);
    expect(fake.calls).toEqual([]);
    expect(result.changes?.[0]).toMatchObject({ status: "unchanged", detail: "no packages to install" });
  });

  test("fails when pnpm is missing, or plans it in dry-run", async () => {
    expect(await installNodePackages(makeCtx({ fake: tools() }), ["a"])).toEqual({ ok: false, error: "pnpm not installed" });
    const dry = await installNodePackages(makeCtx({ dryRun: true, fake: tools() }), ["a"]);
    expect(dry.changes?.[0]).toMatchObject({ status: "planned" });
  });

  test("installs and reports each package's before/after state", async () => {
    let listed = 0;
    const fake = tools("pnpm").on("pnpm list", () => (listed++ === 0 ? installed("a") : installed("a", "b")));
    const result = await installNodePackages(makeCtx({ fake }), ["a", "b", "c"]);

    expect(fake.mutatingCommands()).toEqual(["pnpm add -g a b c"]);
    expect(result.changes?.map((c) => [c.name, c.status])).toEqual([
      ["a", "unchanged"],
      ["b", "created"],
      ["c", "failed"],
    ]);
  });

  test("reports a failing pnpm add", async () => {
    const fake = tools("pnpm").on("pnpm add", { exitCode: 1 });
    expect(await installNodePackages(makeCtx({ fake }), ["a"])).toEqual({ ok: false, error: "pnpm add -g returned non-zero" });
  });

  test("dry-run lists missing packages without installing", async () => {
    const fake = tools("pnpm").on("pnpm list", installed("a"));
    const ctx = makeCtx({ dryRun: true, fake });
    const result = await installNodePackages(ctx, ["a", "b"]);
    expect(fake.mutatingCommands()).toEqual([]);
    expect(result.changes?.map((c) => [c.name, c.status])).toEqual([
      ["a", "unchanged"],
      ["b", "planned"],
    ]);
    expect(ctx.logger.text()).toContain("Would run: pnpm add -g a b");
  });
});

describe("ensurePnpmHome", () => {
  test("sets PNPM_HOME like .bashrc does and puts it on PATH", () => {
    const ctx = makeCtx({ env: { PATH: "/usr/bin" } });
    ensurePnpmHome(ctx);
    expect(ctx.env.PNPM_HOME).toBe(`${ctx.home}/Library/pnpm`);
    expect(ctx.env.PATH).toBe(`${ctx.home}/Library/pnpm:/usr/bin`);
  });

  test("handles an unset PATH", () => {
    const ctx = makeCtx({ env: { PATH: undefined } });
    ensurePnpmHome(ctx);
    expect(ctx.env.PATH).toBe(`${ctx.home}/Library/pnpm:`);
  });

  test("leaves an existing PNPM_HOME alone", () => {
    const ctx = makeCtx({ env: { PNPM_HOME: "/custom/pnpm", PATH: "/usr/bin" } });
    ensurePnpmHome(ctx);
    expect(ctx.env.PNPM_HOME).toBe("/custom/pnpm");
    expect(ctx.env.PATH).toBe("/usr/bin");
  });
});

describe("syncNodePackages", () => {
  test("sets PNPM_HOME before running pnpm (setup may be launched from zsh)", async () => {
    const ctx = makeCtx({ fake: tools("pnpm") });
    await syncNodePackages(ctx, ["a"]);
    expect(ctx.env.PNPM_HOME).toBe(`${ctx.home}/Library/pnpm`);
  });

  test("installs only what survives the audit", async () => {
    const fake = tools("npm", "pnpm").on("npm view old", { stdout: '"gone"' });
    const result = await syncNodePackages(makeCtx({ fake }), ["old", "new"]);
    expect(result.ok).toBe(true);
    expect(fake.mutatingCommands()).toEqual(["pnpm add -g new"]);
    expect(result.changes?.map((c) => c.name)).toEqual(["old", "new"]);
  });

  test("propagates install failures", async () => {
    const result = await syncNodePackages(makeCtx({ fake: tools() }), ["a"]);
    expect(result).toMatchObject({ ok: false, error: "pnpm not installed" });
  });
});
