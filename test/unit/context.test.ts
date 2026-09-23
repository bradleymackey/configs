import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { join } from "path";
import {
  createConsoleLogger,
  createContext,
  defaultConfigsRoot,
  displayPath,
  parseCliArgs,
  record,
} from "../../install/lib/context.ts";
import { cleanupTempDirs, FakeRunner, REPO_ROOT } from "../helpers.ts";

afterEach(cleanupTempDirs);

describe("parseCliArgs", () => {
  test("defaults every flag to false", () => {
    expect(parseCliArgs([])).toEqual({ dryRun: false, skipPackages: false, verbose: false, verify: false, help: false });
  });

  test("parses long flags", () => {
    expect(parseCliArgs(["--dry-run", "--skip-packages", "--verbose", "--verify", "--help"])).toEqual({
      dryRun: true,
      skipPackages: true,
      verbose: true,
      verify: true,
      help: true,
    });
  });

  test("parses short flags", () => {
    expect(parseCliArgs(["-d", "-s", "-v", "-h"])).toMatchObject({ dryRun: true, skipPackages: true, verbose: true, help: true });
  });

  test("rejects unknown flags so typos never fall through to a real install", () => {
    expect(() => parseCliArgs(["--dryrun"])).toThrow();
  });
});

describe("createContext", () => {
  test("takes HOME and CONFIGS_ROOT from the env", () => {
    const ctx = createContext({ dryRun: false, verbose: true }, { HOME: "/h", CONFIGS_ROOT: "/c" }, { runner: new FakeRunner() });
    expect(ctx.home).toBe("/h");
    expect(ctx.configsRoot).toBe("/c");
    expect(ctx.verbose).toBe(true);
    expect(ctx.summary).toEqual([]);
  });

  test("defaults the configs root to this repo and the platform to the host", () => {
    const ctx = createContext({ dryRun: false, verbose: false }, {}, { runner: new FakeRunner() });
    expect(ctx.configsRoot).toBe(REPO_ROOT);
    expect(ctx.home).toBe("~");
    expect(ctx.platform).toBe(process.platform);
    expect(defaultConfigsRoot({})).toBe(REPO_ROOT);
  });

  test("wraps the runner in dry-run mode so mutating commands never reach it", async () => {
    const fake = new FakeRunner();
    const ctx = createContext({ dryRun: true, verbose: false }, { HOME: "/h" }, { runner: fake, log: createConsoleLogger() });
    const log = spyOn(console, "log").mockImplementation(() => {});
    try {
      await ctx.runner.run(["pnpm", "add", "-g", "x"], { mutates: true });
    } finally {
      log.mockRestore();
    }
    expect(fake.calls).toHaveLength(0);
  });

  test("uses the real runner outside dry-run", async () => {
    const fake = new FakeRunner();
    const ctx = createContext({ dryRun: false, verbose: false }, {}, { runner: fake });
    await ctx.runner.run(["pnpm", "add", "-g", "x"], { mutates: true });
    expect(fake.commands()).toEqual(["pnpm add -g x"]);
  });

  test("builds a shell runner when none is given", () => {
    const ctx = createContext({ dryRun: false, verbose: false }, { PATH: "/usr/bin:/bin" });
    expect(ctx.runner.which("sh")).toBe("/bin/sh");
  });
});

describe("createConsoleLogger", () => {
  test("prefixes each level and routes errors to stderr", () => {
    const out = spyOn(console, "log").mockImplementation(() => {});
    const err = spyOn(console, "error").mockImplementation(() => {});
    try {
      const log = createConsoleLogger();
      log.info("i");
      log.success("s");
      log.warn("w");
      log.dryRun("d");
      log.plain("p");
      log.error("e");
      const printed = out.mock.calls.map((c) => String(c[0]));
      expect(printed[0]).toContain("[INFO]");
      expect(printed[1]).toContain("[SUCCESS]");
      expect(printed[2]).toContain("[WARN]");
      expect(printed[3]).toContain("[DRY-RUN]");
      expect(printed[4]).toBe("p");
      expect(String(err.mock.calls[0][0])).toContain("[ERROR]");
    } finally {
      out.mockRestore();
      err.mockRestore();
    }
  });
});

describe("helpers", () => {
  test("displayPath abbreviates HOME", () => {
    const ctx = createContext({ dryRun: false, verbose: false }, { HOME: "/Users/me" }, { runner: new FakeRunner() });
    expect(displayPath(ctx, join("/Users/me", ".bashrc"))).toBe("~/.bashrc");
    expect(displayPath(ctx, "/Users/meow/.bashrc")).toBe("/Users/meow/.bashrc");
  });

  test("record appends to the summary", () => {
    const ctx = createContext({ dryRun: false, verbose: false }, {}, { runner: new FakeRunner() });
    record(ctx, { category: "Symlink", name: "x", status: "created" });
    expect(ctx.summary).toEqual([{ category: "Symlink", name: "x", status: "created" }]);
  });
});
