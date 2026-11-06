import {
  structuralIssueText,
  type StructuralIssue,
} from "../../../core/src/policy.js";

/** Stable command failures carry only structural metadata, never native document values or credentials. */
export type CommandIssue =
  | StructuralIssue
  | { code: "min-sections" | "max-sections"; count: number }
  | {
      code:
        | "read-only"
        | "missing-section"
        | "nested-controls"
        | "different-container"
        | "missing-anchor"
        | "block-disallowed"
        | "duplicate-disallowed"
        | "boundary"
        | "preparing"
        | "removed-container"
        | "removed-moved-section"
        | "insertion-unavailable";
    };

/** Existing non-UI callers retain English defaults; active controls inject a typed translator. */
export function commandIssueText(issue: CommandIssue): string {
  if ("blockType" in issue) return structuralIssueText(issue);
  if (issue.code === "min-sections")
    return `At least ${issue.count} sections are required.`;
  if (issue.code === "max-sections")
    return `At most ${issue.count} sections are allowed.`;
  const text = {
    "read-only": "This document is read-only or saving.",
    "missing-section":
      "The selected section moved or is unavailable. Select it again.",
    "nested-controls": "Use the native nested field controls for this section.",
    "different-container":
      "Sections can only be reordered within the same block field.",
    "missing-anchor":
      "The insertion point moved or was removed. Choose its current section again.",
    "block-disallowed": "This block is not allowed.",
    "duplicate-disallowed":
      "This block cannot be duplicated with the current field options.",
    boundary: "The section is already at the boundary.",
    preparing:
      "The previous section change is still being prepared. Try again in a moment.",
    "removed-container":
      "The section containing this change was removed. Your current working copy is unchanged.",
    "removed-moved-section":
      "The moved section was removed. Your current working copy is unchanged.",
    "insertion-unavailable": "This insertion point is no longer available.",
  };
  return text[issue.code];
}
