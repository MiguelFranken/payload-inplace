import { expect, it } from "vitest";
import { collectSections } from "../../src/schema/tree.js";
const leaf = { slug: "copy", fields: [{ name: "heading", type: "text" }] };
const field: any = {
  name: "layout",
  type: "blocks",
  blocks: [
    {
      slug: "container",
      fields: [
        {
          type: "tabs",
          tabs: [
            {
              name: "detail",
              fields: [
                {
                  name: "columns",
                  type: "array",
                  fields: [
                    {
                      name: "content",
                      type: "blocks",
                      blockReferences: ["copy"],
                      blocks: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { name: "relationship", type: "relationship", relationTo: "pages" },
        { name: "opaque", type: "json" },
      ],
    },
  ],
};
it("resolves repeated nested IDs with array/tab ancestry and blockReferences, excluding foreign document objects", () => {
  const data = [
    {
      id: "parent",
      blockType: "container",
      detail: {
        columns: [
          { id: "left", content: [{ id: "repeat", blockType: "copy" }] },
          { id: "right", content: [{ id: "repeat", blockType: "copy" }] },
        ],
      },
      relationship: { layout: [{ id: "foreign", blockType: "copy" }] },
      opaque: [{ id: "json", blockType: "copy" }],
    },
  ];
  const result = collectSections({
    field,
    data,
    root: "page.layout",
    blocksMap: { copy: leaf as any },
  });
  expect(result.map((r) => r.identity.ancestors)).toEqual([
    [],
    ["parent", "left"],
    ["parent", "right"],
  ]);
  expect(result[2].path).toBe("page.layout.0.detail.columns.1.content.0");
  expect(result[2].schemaPath).toBe(
    "page.layout.container._index-0.detail.columns.content.copy",
  );
  data[0].detail.columns.reverse();
  expect(
    collectSections({
      field,
      data,
      root: "page.layout",
      blocksMap: { copy: leaf as any },
    })[1].identity.ancestors,
  ).toEqual(["parent", "right"]);
});
it("keeps denied nested blocks out of the authoring index", () => {
  const data = [
    {
      id: "p",
      blockType: "container",
      detail: {
        columns: [{ id: "a", content: [{ id: "b", blockType: "copy" }] }],
      },
    },
  ];
  expect(
    collectSections({
      field,
      data,
      root: "layout",
      permissions: { read: false },
    }),
  ).toEqual([]);
  expect(
    collectSections({
      field,
      data,
      root: "layout",
      permissions: {
        blocks: { container: { fields: { detail: { read: false } } } },
      },
    }),
  ).toHaveLength(1);
});
