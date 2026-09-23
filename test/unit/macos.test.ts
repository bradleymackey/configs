import { afterEach, describe, expect, test } from "bun:test";
import { MACOS_DEFAULTS, setupMacOS } from "../../install/macos/macos.ts";
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
