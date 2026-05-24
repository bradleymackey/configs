/**
 * Shared types for the install scripts.
 */

export type ItemStatus =
  | "unchanged"
  | "created"
  | "replaced"
  | "failed"
  | "skipped";

export type SummaryCategory =
  | "Symlink"
  | "Directory"
  | "Package step"
  | "Cleanup"
  | "Audit";

export type SummaryItem = {
  category: SummaryCategory;
  name: string;
  status: ItemStatus;
  detail?: string;
};

export type StepResult = {
  ok: boolean;
  changes?: SummaryItem[];
  error?: string;
};
