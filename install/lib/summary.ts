/**
 * End-of-run summary table.
 */

import type { ItemStatus, SummaryItem } from "../types.ts";
import { colors } from "./context.ts";

const STATUS_GLYPH: Record<ItemStatus, string> = {
  unchanged: "✓",
  created: "+",
  replaced: "~",
  failed: "!",
  skipped: "·",
  planned: "»",
};

const STATUS_COLOR: Record<ItemStatus, string> = {
  unchanged: colors.green,
  created: colors.green,
  replaced: colors.yellow,
  failed: colors.red,
  skipped: colors.dim,
  planned: colors.blue,
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  unchanged: "Unchanged",
  created: "Created",
  replaced: "Replaced",
  failed: "Needs attention",
  skipped: "Skipped",
  planned: "Would change",
};

// Failures float to the top, no-ops sink to the bottom
const STATUS_ORDER: ItemStatus[] = ["failed", "planned", "replaced", "created", "unchanged", "skipped"];

const COUNT_LABEL: Record<ItemStatus, string> = {
  failed: "needs attention",
  planned: "would change",
  replaced: "replaced",
  created: "created",
  unchanged: "unchanged",
  skipped: "skipped",
};

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + "…";
}

export function renderSummary(items: SummaryItem[]): string {
  const lines = ["", `${colors.blue}Installation Summary${colors.reset}`];

  if (items.length === 0) {
    lines.push("  (nothing to report)");
    return lines.join("\n");
  }

  const sorted = [...items].sort((a, b) => {
    const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (byStatus !== 0) return byStatus;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  const labelWidth = Math.max(...Object.values(STATUS_LABEL).map((s) => s.length));
  const categoryWidth = Math.max(...sorted.map((i) => i.category.length), "Category".length);
  const nameWidth = Math.min(40, Math.max(...sorted.map((i) => i.name.length), "Name".length));
  const divider = "─".repeat(labelWidth + categoryWidth + nameWidth + 48);

  lines.push(divider);
  for (const item of sorted) {
    const label = STATUS_LABEL[item.status].padEnd(labelWidth);
    const category = item.category.padEnd(categoryWidth);
    const name = truncate(item.name, nameWidth).padEnd(nameWidth);
    const detail = item.detail ? `  ${colors.dim}${item.detail}${colors.reset}` : "";
    lines.push(
      `  ${STATUS_COLOR[item.status]}${STATUS_GLYPH[item.status]} ${label}${colors.reset}  ${category}  ${name}${detail}`,
    );
  }
  lines.push(divider);

  const parts: string[] = [];
  for (const status of STATUS_ORDER) {
    const count = items.filter((i) => i.status === status).length;
    if (count === 0) continue;
    const text = `${count} ${COUNT_LABEL[status]}`;
    parts.push(status === "failed" ? `${colors.red}${text}${colors.reset}` : text);
  }
  lines.push(`  ${parts.join(" · ")}`);
  return lines.join("\n");
}

export function hasFailures(items: SummaryItem[]): boolean {
  return items.some((i) => i.status === "failed");
}
