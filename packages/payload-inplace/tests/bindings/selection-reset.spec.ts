import { expect, it } from "vitest";
import { selectionReset } from "../../src/schema/selection-reset.js";
import { resolveBinding } from "../../src/schema/resolve-binding.js";
import type { ClientField, FieldState } from "payload";

const fields: ClientField[] = [
  {
    type: "array",
    name: "chapters",
    minRows: 1,
    fields: [{ type: "text", name: "heading" }],
  },
];

const value = {
  chapters: [
    { id: "a", heading: "First" },
    { id: "b", heading: "Second" },
  ],
};

const binding = (name: string) =>
  resolveBinding({ fields, value, binding: name, permissions: true });
it("clears an optional terminal inside an array without deleting its row", () => {
  expect(
    selectionReset(
      binding("chapters.@b.heading"),
      {} as FieldState,
      "Second",
      true,
    ),
  ).toEqual({ kind: "clear", value: "" });
  expect(
    selectionReset(binding("chapters.@b.heading"), {} as FieldState, "", true),
  ).toBeUndefined();
});
it("removes only a stable selected array item and respects minimum rows and ambiguity", () => {
  const row = binding("chapters.@b");
  expect(
    selectionReset(
      row,
      { rows: [{ id: "a" }, { id: "b" }] } as FieldState,
      value.chapters[1],
      true,
    ),
  ).toEqual({ kind: "remove", index: 1, id: "b" });
  expect(
    selectionReset(
      row,
      { rows: [{ id: "a" }] } as FieldState,
      value.chapters[1],
      true,
    ),
  ).toBeUndefined();
  expect(
    selectionReset(
      row,
      { rows: [{ id: "b" }, { id: "b" }] } as FieldState,
      value.chapters[1],
      true,
    ),
  ).toBeUndefined();
  expect(binding("chapters.@gone")).toBeUndefined();
});
it("fails closed for denied, read-only, conditional, required, custom, uninitialized and compound fields", () => {
  const original = binding("chapters.@b.heading")!;
  for (const overrides of [
    { required: true },
    { admin: { readOnly: true } },
    { admin: { hidden: true } },
    { admin: { components: { Field: "Custom" } } },
    { type: "group" },
    { type: "checkbox" },
    { hasMany: true },
  ]) {
    expect(
      selectionReset(
        {
          ...original,
          field: { ...original.field, ...overrides } as ClientField,
        },
        {} as FieldState,
        "Second",
        true,
      ),
    ).toBeUndefined();
  }
  expect(selectionReset(original, undefined, "Second", true)).toBeUndefined();
  expect(
    selectionReset(
      original,
      { passesCondition: false } as FieldState,
      "Second",
      true,
    ),
  ).toBeUndefined();
  expect(
    selectionReset(
      original,
      { customComponents: { Field: {} } } as FieldState,
      "Second",
      true,
    ),
  ).toBeUndefined();
  expect(
    selectionReset(
      { ...original, readOnly: true },
      {} as FieldState,
      "Second",
      true,
    ),
  ).toBeUndefined();
  expect(
    selectionReset(original, {} as FieldState, "Second", false),
  ).toBeUndefined();
  expect(
    selectionReset(undefined, {} as FieldState, "Second", true),
  ).toBeUndefined();
});
it("uses null for optional native references and rich text, preserving falsy numeric values", () => {
  const original = binding("chapters.@b.heading")!;
  for (const type of [
    "number",
    "date",
    "upload",
    "relationship",
    "select",
    "radio",
    "richText",
  ]) {
    const target = {
      ...original,
      field: { name: "value", type } as ClientField,
    };
    expect(selectionReset(target, {} as FieldState, 0, true)).toEqual({
      kind: "clear",
      value: null,
    });
    expect(
      selectionReset(target, {} as FieldState, null, true),
    ).toBeUndefined();
  }
});
