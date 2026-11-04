import type { CommandIssue } from "../state/command-issue.js";
import type { EditorMessages } from "./messages.js";
/** Translate stable reasons at the UI boundary; domain decisions and saved/native errors do not depend on language. */
export function formatCommandIssue(
  messages: EditorMessages,
  issue: CommandIssue,
): string {
  const { t } = messages;
  if (issue.code === "first-section")
    return t("commandFirstSection", { type: issue.blockType });
  if (issue.code === "singleton-section")
    return t("commandSingleton", { type: issue.blockType });
  if (issue.code === "min-sections")
    return t("commandMinimum", { count: issue.count });
  if (issue.code === "max-sections")
    return t("commandMaximum", { count: issue.count });
  const keys = {
    "read-only": "commandReadOnly",
    "missing-section": "commandMissingSection",
    "nested-controls": "commandNestedControls",
    "different-container": "commandDifferentContainer",
    "missing-anchor": "commandMissingAnchor",
    "block-disallowed": "commandBlockDisallowed",
    "duplicate-disallowed": "commandDuplicateDisallowed",
    boundary: "commandBoundary",
    preparing: "commandPreparing",
    "removed-container": "commandRemovedContainer",
    "removed-moved-section": "commandRemovedMovedSection",
    "insertion-unavailable": "commandInsertionUnavailable",
  } as const;
  return t(keys[issue.code]);
}
