import { afterEach, describe, expect, test } from "bun:test";
import { configureMacOS, LOGIN_SHELL, MACOS_DEFAULTS, setupLoginShell, setupMacOS } from "../../install/macos/macos.ts";
import { cleanupTempDirs, FakeRunner, makeCtx } from "../helpers.ts";

afterEach(cleanupTempDirs);

/** Fake `defaults` that answers reads from `current` (missing keys exit 1, like the real one) */
function fakeDefaults(current: Record<string, string>) {
  return new FakeRunner().on("defaults read", (cmd) => {
    const value = current[cmd[3]];
    return value === undefined ? { exitCode: 1, stderr: "does not exist" } : { stdout: `${value}\n` };
  });
}

describe("setupMacOS", () => {
  test("declares the dock and key repeat settings", () => {
    expect(MACOS_DEFAULTS.map((s) => `${s.domain} ${s.key}=${s.value}`)).toEqual([
      "com.apple.dock orientation=left",
      "NSGlobalDomain InitialKeyRepeat=12",
      "NSGlobalDomain KeyRepeat=1",
    ]);
  });

  test("writes nothing when every setting already matches", async () => {
    const fake = fakeDefaults({ orientation: "left", InitialKeyRepeat: "12", KeyRepeat: "1" });
    const result = await setupMacOS(makeCtx({ fake }));
    expect(result.ok).toBe(true);
    expect(fake.mutatingCommands()).toEqual([]);
    expect(result.changes?.every((c) => c.status === "unchanged")).toBe(true);
  });

  test("writes only the settings that differ and reports what changed", async () => {
    const fake = fakeDefaults({ orientation: "bottom", InitialKeyRepeat: "12" });
    const result = await setupMacOS(makeCtx({ fake }));
    expect(fake.mutatingCommands()).toEqual([
      "defaults write com.apple.dock orientation -string left",
      "defaults write NSGlobalDomain KeyRepeat -int 1",
    ]);
    expect(result.changes?.map((c) => [c.name, c.status, c.detail])).toEqual([
      ["Dock orientation", "replaced", "orientation: bottom → left"],
      ["Initial key repeat", "unchanged", "InitialKeyRepeat = 12"],
      ["Key repeat", "created", "KeyRepeat: unset → 1"],
    ]);
  });

  test("dry-run shows current → desired without writing", async () => {
    const fake = fakeDefaults({ orientation: "bottom", InitialKeyRepeat: "15", KeyRepeat: "2" });
    const ctx = makeCtx({ dryRun: true, fake });
    const result = await setupMacOS(ctx);
    expect(fake.mutatingCommands()).toEqual([]);
    expect(result.changes?.map((c) => c.status)).toEqual(["planned", "planned", "planned"]);
    expect(result.changes?.[0].detail).toBe("orientation: bottom → left");
    expect(ctx.logger.text()).toContain("Would run: defaults write com.apple.dock orientation -string left");
  });

  test("reports write failures", async () => {
    const fake = fakeDefaults({}).on("defaults write", { exitCode: 1, stderr: "Could not write\n" });
    const result = await setupMacOS(makeCtx({ fake }), [MACOS_DEFAULTS[0]]);
    expect(result).toMatchObject({ ok: false, error: "some macOS settings could not be written" });
    expect(result.changes?.[0]).toMatchObject({ status: "failed", detail: "defaults write failed: Could not write" });
  });
});

describe("setupLoginShell", () => {
  const withShell = (shell: string) => new FakeRunner().on("dscl . -read /Users/tester UserShell", { stdout: `UserShell: ${shell}\n` });
  const ctxFor = (fake: FakeRunner, dryRun = false) => makeCtx({ dryRun, fake, env: { USER: "tester" } });

  test("targets the system bash", () => {
    expect(LOGIN_SHELL).toBe("/bin/bash");
  });

  test("leaves bash alone", async () => {
    const fake = withShell("/bin/bash");
    const result = await setupLoginShell(ctxFor(fake));
    expect(fake.mutatingCommands()).toEqual([]);
    expect(result).toEqual({ ok: true, changes: [{ category: "Setting", name: "Login shell", status: "unchanged", detail: "/bin/bash" }] });
  });

  test("switches a fresh Mac's zsh to bash, interactively (chsh asks for a password)", async () => {
    const fake = withShell("/bin/zsh");
    const result = await setupLoginShell(ctxFor(fake));
    expect(fake.mutatingCommands()).toEqual(["chsh -s /bin/bash"]);
    expect(fake.calls.at(-1)?.opts).toMatchObject({ mutates: true, interactive: true, stream: true });
    expect(result.changes?.[0]).toMatchObject({ status: "replaced", detail: "/bin/zsh → /bin/bash" });
  });

  test("dry-run plans the switch without running chsh", async () => {
    const fake = withShell("/bin/zsh");
    const ctx = ctxFor(fake, true);
    const result = await setupLoginShell(ctx);
    expect(fake.mutatingCommands()).toEqual([]);
    expect(result.changes?.[0]).toMatchObject({ status: "planned", detail: "/bin/zsh → /bin/bash" });
    expect(ctx.logger.text()).toContain("Would run: chsh -s /bin/bash");
  });

  test("treats an unreadable shell as unknown and still switches", async () => {
    const fake = new FakeRunner().on("dscl", { exitCode: 1 });
    const result = await setupLoginShell(ctxFor(fake));
    expect(fake.mutatingCommands()).toEqual(["chsh -s /bin/bash"]);
    expect(result.changes?.[0]).toMatchObject({ status: "replaced", detail: "unknown → /bin/bash" });
  });

  test("reports a failed chsh", async () => {
    const fake = withShell("/bin/zsh").on("chsh", { exitCode: 1 });
    const result = await setupLoginShell(ctxFor(fake));
    expect(result).toMatchObject({ ok: false, error: "chsh failed" });
    expect(result.changes?.[0]).toMatchObject({ status: "failed" });
  });

  test("skips without USER", async () => {
    const fake = new FakeRunner();
    const result = await setupLoginShell(makeCtx({ fake }));
    expect(fake.calls).toEqual([]);
    expect(result.changes?.[0]).toMatchObject({ status: "skipped", detail: "USER not set" });
  });
});

describe("configureMacOS", () => {
  test("applies the defaults then the login shell", async () => {
    const fake = fakeDefaults({ orientation: "left", InitialKeyRepeat: "12", KeyRepeat: "1" }).on("dscl", { stdout: "UserShell: /bin/bash\n" });
    const result = await configureMacOS(makeCtx({ fake, env: { USER: "tester" } }));
    expect(result.ok).toBe(true);
    expect(result.changes?.map((c) => c.name)).toEqual(["Dock orientation", "Initial key repeat", "Key repeat", "Login shell"]);
  });

  test("fails if either part fails, keeping the first error", async () => {
    const fake = fakeDefaults({}).on("defaults write", { exitCode: 1 }).on("dscl", { stdout: "UserShell: /bin/zsh\n" }).on("chsh", { exitCode: 1 });
    const result = await configureMacOS(makeCtx({ fake, env: { USER: "tester" } }));
    expect(result).toMatchObject({ ok: false, error: "some macOS settings could not be written" });

    const shellOnly = fakeDefaults({ orientation: "left", InitialKeyRepeat: "12", KeyRepeat: "1" }).on("dscl", { exitCode: 1 }).on("chsh", { exitCode: 1 });
    expect(await configureMacOS(makeCtx({ fake: shellOnly, env: { USER: "tester" } }))).toMatchObject({ ok: false, error: "chsh failed" });
  });
});
