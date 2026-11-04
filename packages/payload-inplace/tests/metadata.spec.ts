import { expect, it } from "vitest";
import { contentHash, candidateMatches } from "../src/server/review.js";
import { authoredFieldKey } from "../src/state/autosave.js";
import { documentChanges } from "../src/state/document-diff.js";
import { mergePreviewData } from "../src/state/preview-data.js";
it("excludes new private transport intents consistently without dropping nested content IDs", () => {
  const content = {
    title: "Draft",
    layout: [{ id: "row", blockType: "text" }],
  };
  const withIntent = {
    ...content,
    _veRestoreVersion: undefined,
    _veActivation: "private",
    _veReviewToken: "private",
  };
  expect(contentHash(withIntent)).toBe(contentHash(content));
  expect(candidateMatches(withIntent, content)).toBe(true);
  expect(documentChanges(content, withIntent)).toEqual([]);
  expect(
    authoredFieldKey({
      title: { value: "Draft" },
      _veRestoreVersion: { value: "version" },
    }),
  ).toBe(authoredFieldKey({ title: { value: "Draft" } }));
  expect(mergePreviewData({}, withIntent)).not.toHaveProperty("_veActivation");
  expect(mergePreviewData({}, withIntent)).not.toHaveProperty(
    "_veRestoreVersion",
  );
  expect(
    contentHash({ ...content, layout: [{ id: "another", blockType: "text" }] }),
  ).not.toBe(contentHash(content));
});
