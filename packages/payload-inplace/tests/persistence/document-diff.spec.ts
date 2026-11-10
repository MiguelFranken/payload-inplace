import { describe, it, expect } from "vitest";
import { documentChanges, changedText } from "../../src/state/document-diff";
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

it("uses consumer UI overrides and native language fallback for generic review row labels", async () => {
  const { createEditorMessages } = await import(
    "@payload-inplace/ui/localization/messages"
  );
  const messages = createEditorMessages({
    locale: "de-DE",
    messages: { de: { item: "Zeile" } },
  });
  const changes = documentChanges(
    { rows: [{ id: "a", title: "Before" }] },
    { rows: [{ id: "a", title: "After" }] },
    [],
    {},
    "de-DE",
    messages,
  );
  expect(changes[0]?.labels).toContain("Zeile 1");
  const localized = structuredClone(fields);
  const root = localized[0];
  if (root?.type !== "blocks")
    throw Error("Expected the native blocks fixture");
  root.blocks[0]!.labels = {
    singular: { de: "Abschnitt", en: "Section" },
    plural: "Sections",
  };
  const value = structuredClone(rows);
  value[0]!.heading = "After";
  expect(
    documentChanges(
      { layout: rows },
      { layout: value },
      localized,
      {},
      "de-DE",
    )[0]?.labels,
  ).toContain("Abschnitt 1");
});

it("preserves common ranks through large shifts and emits changed rows in document order", () => {
  const original = Array.from({ length: 1000 }, (_, id) => ({
    id,
    body: "Original",
  }));
  const shifted = [{ id: "new", body: "New" }, ...original.slice(1)];
  shifted[10] = { id: 10, body: "Updated" };
  expect(
    documentChanges({ rows: original }, { rows: shifted }).map(
      ({ path, kind }) => [path, kind],
    ),
  ).toEqual([
    ["rows.@new", "added"],
    ["rows.@10.body", "changed"],
    ["rows.@0", "removed"],
  ]);
  [shifted[20], shifted[21]] = [shifted[21]!, shifted[20]!];
  expect(
    documentChanges({ rows: original }, { rows: shifted })
      .filter(({ kind }) => kind === "moved")
      .map(({ path, from, to }) => [path, from, to]),
  ).toEqual([
    ["rows.@21.$position", 22, 21],
    ["rows.@20.$position", 21, 22],
  ]);
});

it("keeps ambiguous row identities atomic instead of matching an arbitrary row", () => {
  const old = [
    { id: 1, text: "old" },
    { id: "1", text: "duplicate" },
  ];
  const next = [{ id: 1, text: "new" }, old[1]];
  expect(documentChanges({ rows: old }, { rows: next })).toMatchObject([
    { path: "rows", kind: "changed", before: old, after: next },
  ]);
});

it("keeps an authored ID inside a native block group in the review", () => {
  const schema = [
    {
      name: "layout",
      type: "blocks",
      blocks: [
        {
          slug: "text",
          fields: [
            {
              type: "group",
              name: "reference",
              fields: [{ type: "text", name: "id", label: "External ID" }],
            },
          ],
        },
      ],
    },
  ] as ClientField[];
  const before = {
    layout: [{ id: "row", blockType: "text", reference: { id: "old" } }],
  };
  const after = {
    layout: [{ id: "row", blockType: "text", reference: { id: "new" } }],
  };

  expect(documentChanges(before, after, schema)).toMatchObject([
    {
      path: "layout.@row.reference.id",
      kind: "changed",
      before: "old",
      after: "new",
    },
  ]);
});

it("retains the native schema and label under a named tab", () => {
  const schema = [
    {
      type: "tabs",
      tabs: [
        {
          name: "presentation",
          label: "Page presentation",
          fields: [
            { type: "json", name: "settings", label: "Display settings" },
          ],
        },
      ],
    },
  ] as ClientField[];
  const before = [{ id: "a", weight: 1 }];
  const after = [{ id: "a", weight: 2 }];

  expect(
    documentChanges(
      { presentation: { settings: before } },
      { presentation: { settings: after } },
      schema,
    ),
  ).toEqual([
    {
      path: "presentation.settings",
      labels: ["Page presentation", "Display settings"],
      kind: "changed",
      before,
      after,
    },
  ]);
});

it("reviews a real field named root without treating the entire document as rich text", () => {
  const schema = [
    {
      type: "group",
      name: "root",
      fields: [{ type: "text", name: "heading" }],
    },
  ] as ClientField[];
  expect(
    documentChanges(
      { root: { heading: "Old" } },
      { root: { heading: "New" } },
      schema,
    ),
  ).toMatchObject([{ path: "root.heading", kind: "changed" }]);
});
