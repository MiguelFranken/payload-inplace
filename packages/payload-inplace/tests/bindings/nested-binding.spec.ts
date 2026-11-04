import { expect, it } from "vitest";
import type { ClientField } from "payload";
import { resolveBinding } from "../../src/schema/resolve-binding.js";
import {
  getArrayItemAttributes,
  getArrayItemPath,
  getFieldAttributes,
} from "../../src/preview/bindings.js";
const fields = [
  {
    type: "tabs",
    tabs: [
      {
        fields: [
          {
            name: "chapters",
            type: "array",
            fields: [
              { name: "title", type: "text" },
              { name: "text", type: "textarea" },
              {
                name: "links",
                type: "array",
                fields: [{ name: "label", type: "text" }],
              },
            ],
          },
        ],
      },
    ],
  },
] as ClientField[];
const rows = [
  { id: "first", title: "First" },
  { id: "second", text: "Second", links: [{ id: "a.b", label: "Link" }] },
];
const resolve = (
  binding: string,
  value: any = { chapters: rows },
  permissions: any = true,
) => resolveBinding({ fields, value, binding, permissions });
it("resolves a terminal array leaf to native FormState and schema paths", () => {
  expect(resolve("chapters.@second.text")).toMatchObject({
    path: "chapters.1.text",
    schemaPath: "_index-0-0.chapters.text",
    permissionPath: "chapters.text",
    parentPath: "chapters.1",
    parentSchemaPath: "_index-0-0.chapters",
    field: { type: "textarea" },
  });
  expect(resolve("chapters.1.text")?.path).toBe("chapters.1.text");
});
it("follows stable IDs after reorder and fails closed for removed or ambiguous rows", () => {
  expect(
    resolve("chapters.@second.text", { chapters: [...rows].reverse() })?.path,
  ).toBe("chapters.0.text");
  expect(
    resolve("chapters.@second.text", { chapters: [rows[0]] }),
  ).toBeUndefined();
  expect(
    resolve("chapters.@second.text", { chapters: [rows[1], rows[1]] }),
  ).toBeUndefined();
});
it("scopes an item panel to only that row and retains child permissions", () => {
  const permissions = {
    chapters: {
      update: true,
      fields: { title: { update: false }, text: { update: true } },
    },
  };
  expect(resolve("chapters.@second", undefined, permissions)).toMatchObject({
    path: "chapters.1",
    row: {
      fields: expect.arrayContaining([{ name: "text", type: "textarea" }]),
      permissions: permissions.chapters.fields,
    },
  });
  expect(
    resolve("chapters.@second.title", undefined, permissions)?.readOnly,
  ).toBe(true);
  expect(
    resolve("chapters.@second.text", undefined, {
      chapters: { update: false, fields: { text: { update: true } } },
    })?.readOnly,
  ).toBe(true);
  expect(
    resolve("chapters.@second.text", undefined, { chapters: { read: false } }),
  ).toBeUndefined();
});
it("supports nested rows and escaped IDs without traversing non-schema objects", () => {
  const path = getArrayItemPath(
    getArrayItemPath("chapters", "second", "links"),
    "a.b",
    "label",
  );
  expect(path).toBe("chapters.@second.links.@a%2Eb.label");
  expect(resolve(path)).toMatchObject({
    path: "chapters.1.links.0.label",
    schemaPath: "_index-0-0.chapters.links.label",
  });
  for (const path of [
    "chapters.@second.missing",
    "chapters.-1.text",
    "chapters.99.text",
    "chapters.@%broken.text",
    "chapters.__proto__.text",
    "chapters.@second.text.secret",
  ])
    expect(resolve(path)).toBeUndefined();
});
it("emits explicit renderer intent only in authorized authoring", () => {
  const identity = { root: "layout", blockId: "section" };
  expect(
    getArrayItemAttributes(
      { ...identity, field: "chapters", rowId: "a.b" },
      true,
    ),
  ).toMatchObject({
    "data-ve-field": "chapters.@a%2Eb",
    "data-ve-edit": "panel",
  });
  expect(
    getFieldAttributes(
      { ...identity, field: "chapters.@second.text", edit: "inline" },
      true,
    ),
  ).toMatchObject({ "data-ve-edit": "inline" });
  expect(
    getArrayItemAttributes({ ...identity, field: "chapters", rowId: "second" }),
  ).toEqual({});
});
