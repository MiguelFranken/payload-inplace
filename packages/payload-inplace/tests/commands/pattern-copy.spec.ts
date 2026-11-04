import { expect, it } from "vitest";
import type { ClientField } from "payload";
import { copyPatternFields } from "../../src/schema/pattern-copy.js";
it("copies declared writable content with fresh nested row identities while keeping asset references", () => {
  let next = 0;
  const fields = [
    { name: "heading", type: "text" },
    { name: "secret", type: "text", admin: { hidden: true } },
    { name: "computed", type: "text", admin: { readOnly: true } },
    { name: "asset", type: "upload", relationTo: "media" },
    {
      name: "related",
      type: "relationship",
      relationTo: ["pages", "products"],
    },
    {
      type: "tabs",
      tabs: [{ name: "settings", fields: [{ name: "caption", type: "text" }] }],
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "label", type: "text" },
        {
          name: "nested",
          type: "array",
          fields: [{ name: "word", type: "text" }],
        },
      ],
    },
  ] as ClientField[];
  const source = {
    id: "old",
    heading: "Copy",
    unknown: "drop",
    secret: "private",
    computed: "readonly",
    asset: { id: 3, secret: "asset metadata" },
    related: { relationTo: "products", value: { id: 4, title: "drop" } },
    settings: { caption: "Named tab" },
    items: [
      {
        id: "old-item",
        label: "One",
        nested: [{ id: "old-child", word: "Nested" }],
      },
    ],
  };
  const copied = copyPatternFields(
    fields,
    source,
    true,
    {},
    () => `new-${++next}`,
  );
  expect(copied).toEqual({
    heading: "Copy",
    asset: 3,
    related: { relationTo: "products", value: 4 },
    settings: { caption: "Named tab" },
    items: [
      { label: "One", nested: [{ word: "Nested", id: "new-1" }], id: "new-2" },
    ],
  });
  expect(source.items[0]!.id).toBe("old-item");
  expect(
    copyPatternFields(
      fields,
      source,
      {
        heading: { update: false },
        items: { read: false },
        settings: { read: false },
        asset: { read: false },
        related: false,
      },
      {},
    ),
  ).toEqual({});
});
it("rejects obsolete nested blocks and schema limits instead of silently producing different content", () => {
  const fields = [
    {
      name: "layout",
      type: "blocks",
      blocks: [{ slug: "text", fields: [{ name: "heading", type: "text" }] }],
    },
    { name: "items", type: "array", maxRows: 1, fields: [] },
  ] as ClientField[];
  expect(() =>
    copyPatternFields(fields, { layout: [{ blockType: "removed" }] }, true, {}),
  ).toThrow("obsolete");
  expect(() =>
    copyPatternFields(fields, { items: [{}, {}] }, true, {}),
  ).toThrow("schema");
  expect(
    copyPatternFields(
      fields,
      { layout: [{ id: "old", blockType: "text", heading: "Nested" }] },
      true,
      {},
      () => "fresh",
    ),
  ).toEqual({
    layout: [{ id: "fresh", blockType: "text", heading: "Nested" }],
  });
  expect(() =>
    copyPatternFields(
      fields,
      { layout: [{ blockType: "text" }] },
      { layout: { blocks: { text: false } } },
      {},
    ),
  ).toThrow("inaccessible");
  expect(() => copyPatternFields([], {}, true, {}, undefined, 25)).toThrow(
    "depth",
  );
});
