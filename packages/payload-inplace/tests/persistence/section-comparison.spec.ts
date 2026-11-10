import { expect, it } from "vitest";
import type { BlocksFieldClientProps } from "payload";
import {
  compareSections,
  comparisonRows,
} from "../../src/state/section-comparison";

const field: BlocksFieldClientProps["field"] = {
  name: "layout",
  type: "blocks",
  blocks: [],
};
const row = (id: string) => ({ id, blockType: "text" });

it("keeps dotted stable IDs and nested edits on the owning section", () => {
  const edited = { ...row("a.b"), chapters: [{ id: "c", title: "Old" }] };
  const draft = [
    row("added"),
    { ...edited, chapters: [{ id: "c", title: "New" }] },
    row("unchanged"),
  ];
  const published = [edited, row("removed"), row("unchanged")];

  expect(
    compareSections({ revision: 1, draft, published }, field, {}, "en")
      .sections,
  ).toMatchObject([
    { id: "added", kind: "added" },
    { id: "a.b", kind: "changed" },
    { id: "removed", kind: "removed" },
  ]);
});

it("recognizes moves, unpublished drafts and ambiguous row IDs", () => {
  const draft = [row("a"), row("b")];
  expect(
    compareSections(
      { revision: 1, draft, published: [...draft].reverse() },
      field,
      {},
      "en",
    ).sections.map((change) => change.kind),
  ).toEqual(["moved", "moved"]);
  expect(
    compareSections(
      { revision: 1, draft, published: null },
      field,
      {},
      "en",
    ).sections.map((change) => change.kind),
  ).toEqual(["added", "added"]);
  expect(
    compareSections(
      { revision: 1, draft: [row("a"), row("a")], published: draft },
      field,
      {},
      "en",
    ),
  ).toEqual({ sections: [], unmapped: true });
});

it("reads only the configured root through own fields", () => {
  const layout = [row("a")];
  expect(
    comparisonRows({ main: { layout }, other: [row("b")] }, "main.layout"),
  ).toBe(layout);
  expect(comparisonRows(Object.create({ layout }), "layout")).toEqual([]);
});
