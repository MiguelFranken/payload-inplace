import { expect, it } from "vitest";
import { projectInsertion } from "@payload-inplace/core/projection";

it("does not create missing parents for an optional list", () => {
  const document = { group: {} };
  expect(
    projectInsertion(document, {
      target: { kind: "list", root: "group.missing.layout", field: "" },
      row: { id: "preview", blockType: "text" },
    }),
  ).toBe(document);
});

it.each([
  { label: "removed", rows: [] },
  { label: "ambiguous", rows: [{ id: "row" }, { id: "row" }] },
])("keeps optional nested lists under $label rows ineligible", ({ rows }) => {
  const document = { layout: [{ id: "section", blockType: "hero", rows }] };
  expect(
    projectInsertion(document, {
      target: {
        kind: "list",
        root: "layout",
        identity: { root: "layout", blockId: "section" },
        field: "rows.@row.children",
      },
      row: { id: "preview", blockType: "text" },
    }),
  ).toBe(document);
});
