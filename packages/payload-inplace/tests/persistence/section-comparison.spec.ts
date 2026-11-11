import { expect, it } from "vitest";
import type { BlocksFieldClientProps, ClientBlock } from "payload";
import {
  comparisonBindings,
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

  const report = compareSections(
    { revision: 1, draft, published },
    field,
    {},
    "en",
  );
  expect(report.sections).toMatchObject([
    { id: "added", kind: "added" },
    { id: "a.b", kind: "changed" },
    { id: "removed", kind: "removed" },
  ]);
  expect(report.fields).toMatchObject([
    { path: "sections.@a%2Eb.chapters.@c.title", before: "Old", after: "New" },
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
  ).toEqual({ sections: [], fields: [], unmapped: true });
});

it("resolves nested block and array bindings against the displayed side", () => {
  const card: ClientBlock = {
    slug: "card",
    fields: [{ name: "title", type: "text" }],
  };
  const group: ClientBlock = {
    slug: "group",
    fields: [
      {
        type: "array",
        name: "chapters",
        fields: [{ name: "cards", type: "blocks", blocks: [card] }],
      },
    ],
  };
  const chapters = [
    { id: "old", cards: [] },
    { id: "a.b", cards: [{ id: "item", blockType: "card", title: "Title" }] },
  ];
  const resolve = comparisonBindings(
    [{ id: "outer", blockType: "group", chapters }],
    { ...field, blocks: [group] },
    {},
  );
  expect(resolve(["outer"], "chapters.1")).toBe(
    "sections.@outer.chapters.@a%2Eb",
  );
  expect(resolve(["outer", "a.b", "item"], "title")).toBe(
    "sections.@outer.chapters.@a%2Eb.cards.@item.title",
  );
  expect(resolve(["outer", "old", "item"], "title")).toBeUndefined();
  expect(resolve(["outer"], "chapters.@missing.title")).toBeUndefined();
});

it("reads only the configured root through own fields", () => {
  const layout = [row("a")];
  expect(
    comparisonRows({ main: { layout }, other: [row("b")] }, "main.layout"),
  ).toBe(layout);
  expect(comparisonRows(Object.create({ layout }), "layout")).toEqual([]);
});
