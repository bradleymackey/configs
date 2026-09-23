/**
 * Shared entry point so each install step can also be run on its own:
 *   bun install/rust.ts [--dry-run] [--verbose]
 */

import type { StepResult } from "../types.ts";
import { createContext, parseCliArgs, type Context } from "./context.ts";
import type { Env } from "./runner.ts";
import { hasFailures, renderSummary } from "./summary.ts";
import { runStep } from "./step.ts";

export async function runStandalone(
  description: string,
  step: (ctx: Context) => Promise<StepResult>,
  argv: string[] = process.argv.slice(2),
  env: Env = { ...process.env },
): Promise<number> {
  let options;
  try {
    options = parseCliArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
  const ctx = createContext(options, env);
  if (ctx.dryRun) ctx.log.warn("DRY-RUN MODE: No changes will be made");
  const result = await runStep(ctx, description, () => step(ctx));
  ctx.log.plain(renderSummary(ctx.summary));
  return !result.ok || hasFailures(ctx.summary) ? 1 : 0;
}
