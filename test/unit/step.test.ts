import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { runStep } from "../../install/lib/step.ts";
import { runStandalone } from "../../install/lib/standalone.ts";
import { cleanupTempDirs, makeCtx, tempDir } from "../helpers.ts";

afterEach(cleanupTempDirs);

describe("runStep", () => {
  test("adds the step's changes to the summary", async () => {
    const ctx = makeCtx();
    const result = await runStep(ctx, "Thing", async () => ({
      ok: true,
      changes: [{ category: "Package step", name: "x", status: "created" }],
    }));
    expect(result.ok).toBe(true);
    expect(ctx.summary).toEqual([{ category: "Package step", name: "x", status: "created" }]);
    expect(ctx.logger.text()).toContain("[INFO] Running: Thing");
    expect(ctx.logger.text()).toContain("Thing completed");
  });

  test("records an umbrella line when the step reports no changes", async () => {
    const ctx = makeCtx();
    await runStep(ctx, "Thing", async () => ({ ok: true }));
    expect(ctx.summary).toEqual([{ category: "Package step", name: "Thing", status: "unchanged" }]);
  });

  test("records failures with the step's error", async () => {
    const ctx = makeCtx();
    await runStep(ctx, "Thing", async () => ({ ok: false, error: "nope" }));
    expect(ctx.summary).toEqual([{ category: "Package step", name: "Thing", status: "failed", detail: "nope" }]);
  });

  test("turns a thrown error into a failure instead of aborting the install", async () => {
    const ctx = makeCtx({ verbose: true });
    const result = await runStep(ctx, "Thing", async () => {
      throw new Error("kaboom");
    });
    expect(result).toEqual({ ok: false, error: "kaboom" });
    expect(ctx.summary[0]).toMatchObject({ status: "failed", detail: "kaboom" });
    expect(ctx.logger.text()).toContain("[ERROR] Error: kaboom");
  });

  test("handles non-Error throws", async () => {
    const ctx = makeCtx();
    const result = await runStep(ctx, "Thing", async () => {
      throw "plain";
    });
    expect(result.error).toBe("plain");
  });

  test("uses dry-run wording", async () => {
    const ctx = makeCtx({ dryRun: true });
    await runStep(ctx, "Thing", async () => ({ ok: true }));
    expect(ctx.logger.text()).toContain("Checking: Thing");
    expect(ctx.logger.text()).toContain("Thing checked");
  });
});

describe("runStandalone", () => {
  const quiet = () => {
    const spies = [spyOn(console, "log").mockImplementation(() => {}), spyOn(console, "error").mockImplementation(() => {})];
    return () => spies.forEach((s) => s.mockRestore());
  };

  test("returns 0 on success and prints a summary", async () => {
    const restore = quiet();
    try {
      const code = await runStandalone(
        "Thing",
        async (ctx) => ({ ok: true, changes: [{ category: "Package step", name: ctx.home, status: "unchanged" }] }),
        [],
        { HOME: "/h" },
      );
      expect(code).toBe(0);
      expect((console.log as any).mock.calls.flat().join("\n")).toContain("Installation Summary");
    } finally {
      restore();
    }
  });

  test("returns 1 when the step fails", async () => {
    const restore = quiet();
    try {
      expect(await runStandalone("Thing", async () => ({ ok: false, error: "x" }), [], {})).toBe(1);
    } finally {
      restore();
    }
  });

  test("returns 1 when the step reports a failed item", async () => {
    const restore = quiet();
    try {
      const code = await runStandalone(
        "Thing",
        async () => ({ ok: true, changes: [{ category: "Package step", name: "x", status: "failed" }] }),
        [],
        {},
      );
      expect(code).toBe(1);
    } finally {
      restore();
    }
  });

  test("supports --dry-run", async () => {
    const restore = quiet();
    try {
      let sawDryRun = false;
      await runStandalone("Thing", async (ctx) => ((sawDryRun = ctx.dryRun), { ok: true }), ["--dry-run"], { HOME: tempDir() });
      expect(sawDryRun).toBe(true);
      expect((console.log as any).mock.calls.flat().join("\n")).toContain("DRY-RUN MODE");
    } finally {
      restore();
    }
  });

  test("rejects unknown flags without running the step", async () => {
    const restore = quiet();
    try {
      let ran = false;
      expect(await runStandalone("Thing", async () => ((ran = true), { ok: true }), ["--nope"], {})).toBe(1);
      expect(ran).toBe(false);
    } finally {
      restore();
    }
  });

  test("uses process argv and env by default", async () => {
    const restore = quiet();
    const argv = process.argv;
    process.argv = [argv[0], "script.ts"];
    try {
      let home: string | undefined;
      await runStandalone("Thing", async (ctx) => ((home = ctx.home), { ok: true }));
      expect(home).toBe(process.env.HOME);
    } finally {
      process.argv = argv;
      restore();
    }
  });
});
