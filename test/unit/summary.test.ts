import { describe, expect, test } from "bun:test";
import { hasFailures, renderSummary, truncate } from "../../install/lib/summary.ts";
import type { SummaryItem } from "../../install/types.ts";

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("renderSummary", () => {
  test("says so when there is nothing to report", () => {
    expect(strip(renderSummary([]))).toContain("(nothing to report)");
  });

  test("orders failures first and planned changes before completed ones", () => {
    const items: SummaryItem[] = [
      { category: "Symlink", name: "b", status: "unchanged" },
      { category: "Symlink", name: "a", status: "unchanged" },
      { category: "Symlink", name: "c", status: "planned", detail: "would create" },
      { category: "Audit", name: "d", status: "failed", detail: "deprecated" },
      { category: "Symlink", name: "e", status: "created" },
      { category: "Directory", name: "f", status: "skipped" },
      { category: "Symlink", name: "g", status: "replaced" },
      { category: "Directory", name: "h", status: "unchanged" },
    ];
    const rows = strip(renderSummary(items))
      .split("\n")
      .filter((l) => /^\s+[✓+~!·»] /.test(l))
      .map((l) => l.trim().split(/\s{2,}/)[2]);
    expect(rows).toEqual(["d", "c", "g", "e", "h", "a", "b", "f"]);
  });

  test("labels each status and prints the details", () => {
    const text = strip(
      renderSummary([
        { category: "Symlink", name: "x", status: "planned", detail: "would create" },
        { category: "Audit", name: "y", status: "failed" },
      ]),
    );
    expect(text).toContain("» Would change");
    expect(text).toContain("! Needs attention");
    expect(text).toContain("would create");
  });

  test("prints counts per status", () => {
    const text = strip(
      renderSummary([
        { category: "Symlink", name: "a", status: "unchanged" },
        { category: "Symlink", name: "b", status: "unchanged" },
        { category: "Symlink", name: "c", status: "failed" },
        { category: "Symlink", name: "d", status: "planned" },
      ]),
    );
    expect(text).toContain("1 needs attention · 1 would change · 2 unchanged");
  });

  test("truncates long names", () => {
    const text = strip(renderSummary([{ category: "Symlink", name: "x".repeat(60), status: "created" }]));
    expect(text).toContain("x".repeat(39) + "…");
  });
});

describe("helpers", () => {
  test("truncate keeps short strings and ellipsizes long ones", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("abcdef", 4)).toBe("abc…");
  });

  test("hasFailures", () => {
    expect(hasFailures([{ category: "Symlink", name: "a", status: "planned" }])).toBe(false);
    expect(hasFailures([{ category: "Symlink", name: "a", status: "failed" }])).toBe(true);
  });
});
