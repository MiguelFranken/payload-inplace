import { expect, it } from "vitest";
import { projectInsertion } from "@payload-inplace/core/projection";
import { previewExample } from "../../src/schema/example-preview";
import { projectCatalogue } from "../../src/server/catalogue";
import type { ClientField, ClientBlock, BlocksFieldClientProps } from "payload";
it("projects stable neighbor insertion without mutating native values or retaining stale positions", () => {
  const doc = {
    layout: [
      { id: "a", blockType: "text", heading: "A" },
      { id: "b", blockType: "text", heading: "B" },
    ],
  };
  const delta = {
    target: {
      kind: "adjacent" as const,
      identity: { root: "layout", blockId: "a" },
      side: "after" as const,
    },
    row: { id: "preview", blockType: "text" },
  };
  expect(projectInsertion(doc, delta).layout.map((row) => row.id)).toEqual([
    "a",
    "preview",
    "b",
  ]);
  expect(doc.layout.map((row) => row.id)).toEqual(["a", "b"]);
  expect(
    projectInsertion(
      { ...doc, layout: [...doc.layout].reverse() },
      delta,
    ).layout.map((row) => row.id),
  ).toEqual(["b", "a", "preview"]);
  const gone = { layout: [doc.layout[1]] };
  expect(projectInsertion(gone, delta)).toBe(gone);
  expect(projectInsertion(doc, undefined)).toBe(doc);
});
it("projects empty/nested stable row lists and rejects forged paths and ambiguous IDs", () => {
  const doc = {
    layout: [
      { id: "a", blockType: "text", rows: [{ id: "with.dots", children: [] }] },
    ],
  };
  const delta = {
    target: {
      kind: "list" as const,
      root: "layout",
      identity: { root: "layout", blockId: "a" },
      field: "rows.@with%2Edots.children",
    },
    row: { id: "new" },
  };
  expect(projectInsertion(doc, delta).layout[0].rows[0].children).toEqual([
    { id: "new" },
  ]);
  expect(doc.layout[0].rows[0].children).toEqual([]);
  expect(
    projectInsertion(doc, {
      ...delta,
      target: { ...delta.target, field: "__proto__.children" },
    }),
  ).toBe(doc);
  const ambiguous = {
    layout: [
      {
        ...doc.layout[0],
        rows: [...doc.layout[0].rows, ...doc.layout[0].rows],
      },
    ],
  };
  expect(projectInsertion(ambiguous, delta)).toBe(ambiguous);
});
it("redacts hidden/denied example content before transport and regenerates nested preview IDs", () => {
  const fields = [
    { type: "text", name: "heading" },
    { type: "text", name: "secret", admin: { hidden: true } },
    { type: "text", name: "restricted" },
    { type: "array", name: "rows", fields: [{ type: "text", name: "title" }] },
  ] as ClientField[];
  const original = {
    id: "old",
    heading: "Public",
    secret: "hidden",
    restricted: "denied",
    unknown: "drop",
    rows: [{ id: "row", title: "One" }],
  };
  const result = previewExample(
    fields,
    original,
    { heading: true, restricted: { read: false }, rows: true },
    {},
    () => "preview",
  );
  expect(result).toEqual({
    heading: "Public",
    rows: [{ id: "preview", title: "One" }],
  });
  expect(original.rows[0].id).toBe("row");
  const block = { slug: "text", fields } as ClientBlock;
  const catalogue = projectCatalogue(
    { text: { example: original, group: "Content" } },
    {
      type: "blocks",
      name: "layout",
      blocks: [block],
    } as BlocksFieldClientProps["field"],
    {
      blocks: { text: { fields: { restricted: { read: false }, rows: true } } },
    },
    { text: block },
  );
  expect(catalogue.text.example).not.toHaveProperty("restricted");
  expect(catalogue.text.example).not.toHaveProperty("secret");
});
