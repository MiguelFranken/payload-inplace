import { describe, it, expect } from "vitest";
import { documentChanges, changedText } from "../src/state/document-diff.js";
import type { ClientField } from "payload";
const fields = [
  {
    name: "layout",
    type: "blocks",
    blocks: [
      {
        slug: "text",
        labels: { singular: "Text section", plural: "Text sections" },
        fields: [
          { name: "heading", type: "text", label: "Heading" },
          {
            name: "chapters",
            type: "array",
            label: "Chapters",
            fields: [{ name: "text", type: "textarea", label: "Body" }],
          },
        ],
      },
    ],
  },
] as ClientField[];
const rows = [
  {
    id: "a",
    blockType: "text",
    heading: "Before",
    chapters: [{ id: "nested", text: "Keep" }],
  },
  { id: "b", blockType: "text", heading: "Unchanged" },
];
describe("document review leaf and structural changes", () => {
  it("shows only the changed leaf with native labels", () => {
    const after = structuredClone(rows);
    after[0].heading = "After";
    const diff = documentChanges(
      { layout: rows, _veRevision: 1 },
      { layout: after, _veRevision: 2 },
      fields,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({
      path: "layout.@a.heading",
      labels: ["Layout", "Text section 1", "Heading"],
      before: "Before",
      after: "After",
    });
  });
  it("does not compare moved rows against unrelated rows or count insertion shifts as moves", () => {
    const moved = documentChanges(
      { layout: rows },
      { layout: [rows[1], rows[0]] },
      fields,
    );
    expect(moved.every((change) => change.kind === "moved")).toBe(true);
    const added = documentChanges(
      { layout: rows },
      { layout: [{ id: "new", blockType: "text", heading: "New" }, ...rows] },
      fields,
    );
    expect(added).toHaveLength(1);
    expect(added[0].kind).toBe("added");
  });
  it("keeps nested identity and removal distinct", () => {
    const next = structuredClone(rows);
    next[0].chapters![0].text = "Changed";
    expect(
      documentChanges({ layout: rows }, { layout: next }, fields)[0].path,
    ).toBe("layout.@a.chapters.@nested.text");
    expect(
      documentChanges({ layout: rows }, { layout: [rows[0]] }, fields)[0],
    ).toMatchObject({ kind: "removed", path: "layout.@b" });
  });
  it("keeps formatting-only rich text and null/empty differences reviewable", () => {
    expect(
      documentChanges(
        { body: { root: { children: [{ text: "Same", format: 0 }] } } },
        { body: { root: { children: [{ text: "Same", format: 1 }] } } },
      ),
    ).toHaveLength(1);
    expect(documentChanges({ title: null }, { title: "" })).toHaveLength(1);
  });
  it("does not ignore authored nested metadata-like names", () => {
    expect(
      documentChanges(
        { group: { _status: "one" } },
        { group: { _status: "two" } },
      )[0].path,
    ).toBe("group._status");
  });
  it("preserves unicode code points and shared character context", () => {
    expect(changedText("A 😀 before.", "A 😃 after.")).toEqual({
      prefix: "A ",
      removed: "😀 before",
      added: "😃 after",
      suffix: ".",
    });
  });
});
