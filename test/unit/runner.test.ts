import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, writeFileSync } from "fs";
import { join } from "path";
import { createDryRunRunner, createShellRunner, formatCommand } from "../../install/lib/runner.ts";
import { cleanupTempDirs, FakeRunner, tempDir } from "../helpers.ts";

afterEach(cleanupTempDirs);

const SYSTEM_PATH = "/usr/bin:/bin";

describe("formatCommand", () => {
  test("leaves plain arguments bare and quotes anything with spaces or shell characters", () => {
    expect(formatCommand(["brew", "bundle", "--file", "/a/Brewfile"])).toBe("brew bundle --file /a/Brewfile");
    expect(formatCommand(["sh", "-c", "echo hi | cat"])).toBe('sh -c "echo hi | cat"');
  });
});

describe("createShellRunner", () => {
  test("captures stdout, stderr and exit code", async () => {
    const runner = createShellRunner({ PATH: SYSTEM_PATH });
    const result = await runner.run(["sh", "-c", "echo out; echo err >&2; exit 3"], { mutates: false });
    expect(result).toEqual({ exitCode: 3, stdout: "out\n", stderr: "err\n" });
  });

  test("passes per-command env on top of the base env", async () => {
    const runner = createShellRunner({ PATH: SYSTEM_PATH, BASE: "base" });
    const result = await runner.run(["sh", "-c", "echo $BASE-$EXTRA"], { mutates: false, env: { EXTRA: "extra" } });
    expect(result.stdout).toBe("base-extra\n");
  });

  test("returns 127 without spawning when the command is not on PATH", async () => {
    const runner = createShellRunner({ PATH: SYSTEM_PATH });
    const result = await runner.run(["definitely-not-a-command-xyz"], { mutates: false });
    expect(result.exitCode).toBe(127);
    expect(result.stderr).toContain("command not found");
  });

  test("returns 127 instead of throwing for a missing absolute path", async () => {
    const runner = createShellRunner({ PATH: SYSTEM_PATH });
    const result = await runner.run(["/nonexistent/opt/fzf/install", "--key-bindings"], { mutates: true });
    expect(result.exitCode).toBe(127);
    expect(result.stderr).not.toBe("");
  });

  test("runs absolute paths directly", async () => {
    const runner = createShellRunner({ PATH: "" });
    expect((await runner.run(["/bin/sh", "-c", "exit 0"], { mutates: false })).exitCode).toBe(0);
  });

  test("stream mode inherits output and returns empty strings", async () => {
    const runner = createShellRunner({ PATH: SYSTEM_PATH });
    const result = await runner.run(["true"], { mutates: true, stream: true });
    expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });

  test("sees PATH changes made after creation (e.g. after installing Homebrew)", async () => {
    const env = { PATH: SYSTEM_PATH };
    const runner = createShellRunner(env);
    const bin = tempDir();
    const tool = join(bin, "late-tool");
    writeFileSync(tool, "#!/bin/sh\necho late\n");
    chmodSync(tool, 0o755);

    expect(runner.which("late-tool")).toBeNull();
    env.PATH = `${bin}:${SYSTEM_PATH}`;
    expect(runner.which("late-tool")).toBe(tool);
    expect((await runner.run(["late-tool"], { mutates: false })).stdout).toBe("late\n");
  });

  test("tolerates a missing PATH", () => {
    expect(createShellRunner({}).which("sh")).toBeNull();
  });
});

describe("createDryRunRunner", () => {
  test("never executes mutating commands, only reports them", async () => {
    const inner = new FakeRunner();
    const reported: string[] = [];
    const runner = createDryRunRunner(inner, (m) => reported.push(m));

    const result = await runner.run(["brew", "bundle", "--file", "x"], { mutates: true });

    expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    expect(inner.calls).toHaveLength(0);
    expect(reported).toEqual(["Would run: brew bundle --file x"]);
  });

  test("passes read-only probes through to the real runner", async () => {
    const inner = new FakeRunner().on("defaults read", { stdout: "left\n" });
    const runner = createDryRunRunner(inner, () => {});

    const result = await runner.run(["defaults", "read", "com.apple.dock", "orientation"], { mutates: false });

    expect(result.stdout).toBe("left\n");
    expect(inner.commands()).toEqual(["defaults read com.apple.dock orientation"]);
  });

  test("delegates which()", () => {
    const runner = createDryRunRunner(new FakeRunner(new Set(["brew"])), () => {});
    expect(runner.which("brew")).toBe("/fake/bin/brew");
    expect(runner.which("pnpm")).toBeNull();
  });
});
