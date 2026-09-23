/**
 * Runs one package step and folds its result into the summary. Steps are
 * dry-run aware themselves (via ctx.runner), so this runs them in both modes.
 */

import type { StepResult } from "../types.ts";
import { record, type Context } from "./context.ts";

export async function runStep(
  ctx: Context,
  description: string,
  step: () => Promise<StepResult>,
): Promise<StepResult> {
  ctx.log.info(`${ctx.dryRun ? "Checking" : "Running"}: ${description}`);

  try {
    const result = await step();
    const changes = result.changes ?? [];
    ctx.summary.push(...changes);
    if (result.ok) {
      ctx.log.success(`${description} ${ctx.dryRun ? "checked" : "completed"}`);
      // Only record the umbrella line if no granular changes were reported
      if (changes.length === 0) {
        record(ctx, { category: "Package step", name: description, status: "unchanged" });
      }
    } else {
      ctx.log.warn(`${description} failed (continuing)`);
      record(ctx, { category: "Package step", name: description, status: "failed", detail: result.error });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.log.warn(`${description} failed (continuing)`);
    if (ctx.verbose) ctx.log.error(String(error));
    record(ctx, { category: "Package step", name: description, status: "failed", detail: message });
    return { ok: false, error: message };
  }
}
