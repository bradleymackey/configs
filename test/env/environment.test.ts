/**
 * Checks against THIS machine, not fixtures. Opt-in (`bun run test:env`)
 * because results depend on what's installed. Everything here runs in
 * dry-run mode, so nothing can be changed even by mistake.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, readlinkSync } from "fs";
import { join } from "path";
import { createContext } from "../../install/lib/context.ts";
import { auditBrewfile, installBrew } from "../../install/macos/brew.ts";
import { runVerify } from "../../install/verify.ts";
import { captureLogger, REPO_ROOT } from "../helpers.ts";

const enabled = Boolean(process.env.CONFIGS_ENV_TESTS);
const hasBrew = Boolean(Bun.which("brew"));

function realCtx() {
  const log = captureLogger();
  const ctx = createContext({ dryRun: true, verbose: false }, { ...process.env, CONFIGS_ROOT: REPO_ROOT }, { log });
  return { ctx, log };
}

/** True if this machine's dotfiles are linked from this checkout */
function configuredFromThisRepo(): boolean {
  const bashrc = join(process.env.HOME ?? "", ".bashrc");
  try {
    return existsSync(bashrc) && readlinkSync(bashrc) === join(REPO_ROOT, "home", ".bashrc");
  } catch {
    return false;
  }
}

describe.skipIf(!enabled)("this machine", () => {
  test.skipIf(!hasBrew)(
    "Brewfile has no deprecated, disabled or unknown entries",
    async () => {
      const { ctx } = realCtx();
      const result = await auditBrewfile(ctx);
      // "skipped" counts too: an audit that couldn't run proves nothing
      const problems = (result.changes ?? []).filter((c) => c.status !== "unchanged").map((c) => `${c.name}: ${c.detail}`);
      expect(problems).toEqual([]);
    },
    60_000,
  );

  test.skipIf(!hasBrew)(
    "everything in the Brewfile is installed",
    async () => {
      const { ctx } = realCtx();
      const result = await installBrew(ctx);
      expect(result.changes?.find((c) => c.name === "Brewfile bundle")).toMatchObject({ status: "unchanged" });
    },
    180_000,
  );

  test.skipIf(!configuredFromThisRepo())("dotfiles pass --verify", async () => {
    const { ctx, log } = realCtx();
    const code = await runVerify(ctx);
    if (code !== 0) throw new Error(`--verify failed:\n${log.text()}`);
  });
});
