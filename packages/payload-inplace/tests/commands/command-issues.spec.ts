import { expect, it } from "vitest";
import { createEditorMessages } from "@payload-inplace/ui/localization/messages";
import { formatCommandIssue } from "../../src/i18n/command-issue";
import {
  commandIssueText,
  type CommandIssue,
} from "../../src/state/command-issue";
import {
  structureIssue,
  structureTransitionIssue,
} from "@payload-inplace/core/policy";
import { applyCommand } from "../../src/adapters/payload-form";
import { StructuralHistory } from "../../src/state/history";
it("formats typed structural reasons in the current UI language without changing the policy", () => {
  const en = createEditorMessages(),
    de = createEditorMessages({ locale: "de" });
  const issue = structureTransitionIssue(
    [{ blockType: "hero" }],
    [{ blockType: "text" }],
    { first: "hero" },
  )!;
  expect(issue).toEqual({ code: "first-section", blockType: "hero" });
  expect(formatCommandIssue(de, issue)).toBe(
    "Der erste Abschnitt muss hero sein.",
  );
  expect(formatCommandIssue(en, issue)).toBe(commandIssueText(issue));
  expect(structureIssue([], { exactlyOne: ["text"] })).toEqual({
    code: "singleton-section",
    blockType: "text",
  });
  for (const code of [
    "read-only",
    "missing-section",
    "nested-controls",
    "different-container",
    "missing-anchor",
    "block-disallowed",
    "duplicate-disallowed",
    "boundary",
    "preparing",
    "removed-container",
    "removed-moved-section",
    "insertion-unavailable",
  ] as const)
    expect(formatCommandIssue(de, { code })).not.toBe(
      commandIssueText({ code }),
    );
  expect(formatCommandIssue(de, { code: "min-sections", count: 2 })).toContain(
    "2",
  );
  expect(formatCommandIssue(de, { code: "max-sections", count: 3 })).toContain(
    "3",
  );
});
it("lets the native command boundary format stable failure reasons instead of parsing default text", () => {
  const reasons: CommandIssue[] = [];
  const result = applyCommand(
    {} as any,
    "layout",
    "pages.layout",
    { type: "add", blockType: "text" },
    {
      disabled: true,
      min: 0,
      allowed: ["text"],
      history: new StructuralHistory("layout"),
      renderIssue: (issue) => {
        reasons.push(issue);
        return `translated:${issue.code}`;
      },
    },
  );
  expect(result).toBe("translated:read-only");
  expect(reasons).toEqual([{ code: "read-only" }]);
});
