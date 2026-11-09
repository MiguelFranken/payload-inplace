import { expect, it } from "vitest";
import { StructuralHistory, snapshotRoot } from "../../src/state/history";
import { structureError } from "../../src/state/policy";
import { contentHash, candidateMatches } from "../../src/server/review";
it("structural history cannot restore unrelated content or revision and does not alias content values", () => {
  const fields: any = {
    layout: { value: 1, rows: [{ id: "a", blockType: "text" }] },
    "layout.0.body": { value: { root: { children: [{ text: "old" }] } } },
    title: { value: "old title" },
    _veRevision: { value: 1 },
  };
  const history = new StructuralHistory("layout", 2);
  history.checkpoint(fields);
  fields["layout.0.body"].value.root.children[0].text = "new";
  fields.title.value = "current title";
  fields._veRevision.value = 5;
  const undo = history.undo(fields)!;
  expect(Object.keys(undo)).toEqual(["layout", "layout.0.body"]);
  expect((undo["layout.0.body"].value as any).root.children[0].text).toBe(
    "old",
  );
  expect(fields._veRevision.value).toBe(5);
  expect(history.redo({ ...fields, ...undo })?.["layout.0.body"].value).toEqual(
    { root: { children: [{ text: "new" }] } },
  );
  expect(snapshotRoot(fields, "other")).toEqual({});
});
it("first/singleton policy explains why destructive composition is unavailable", () => {
  const policy = { first: "intro", exactlyOne: ["dates"] };
  expect(
    structureError([{ blockType: "intro" }, { blockType: "dates" }], policy),
  ).toBeUndefined();
  expect(
    structureError([{ blockType: "dates" }, { blockType: "intro" }], policy),
  ).toMatch(/first/);
  expect(
    structureError(
      [{ blockType: "intro" }, { blockType: "dates" }, { blockType: "dates" }],
      policy,
    ),
  ).toMatch(/Exactly one/);
});
it("review hashes preserve nested identities and reject an unsaved form snapshot", () => {
  const data = {
    title: "Saved",
    layout: [{ id: "a", heading: "Hello" }],
    _veRevision: 2,
  };
  expect(candidateMatches(data, data)).toBe(true);
  expect(candidateMatches({ ...data, title: "Unsaved" }, data)).toBe(false);
  expect(contentHash(data)).toBe(
    contentHash({ ...data, _veRevision: 3, _status: "published" }),
  );
  expect(contentHash(data)).not.toBe(
    contentHash({ ...data, layout: [{ id: "b", heading: "Hello" }] }),
  );
});
it("reviews native form projections without accepting changed/reordered row identities", () => {
  const saved = {
    layout: [
      { id: "a", blockType: "hero", heading: "Saved", blockName: null },
      { id: "b", blockType: "text", heading: "Second", blockName: null },
    ],
  };
  const candidate = {
    layout: [
      { id: "a", blockType: "hero", heading: "Saved" },
      { id: "b", blockType: "text", heading: "Second" },
    ],
  };
  expect(candidateMatches(candidate, saved)).toBe(true);
  expect(
    candidateMatches(
      { layout: [candidate.layout[1], candidate.layout[0]] },
      saved,
    ),
  ).toBe(false);
  expect(
    candidateMatches(
      {
        layout: [{ blockType: "hero", heading: "Saved" }, candidate.layout[1]],
      },
      saved,
    ),
  ).toBe(false);
  expect(
    candidateMatches(
      {
        layout: [
          { ...candidate.layout[0], heading: "Unsaved" },
          candidate.layout[1],
        ],
      },
      saved,
    ),
  ).toBe(false);
});
it("duplicates every nested row identity without touching the source row", async () => {
  const { duplicateRowState } = await import(
    "../../src/adapters/payload-form"
  );
  const fields: any = {
    "layout.1.id": { value: "custom-root", initialValue: "custom-root" },
    "layout.1.blockType": { value: "text" },
    "layout.1.items": { value: 1, rows: [{ id: "custom-nested" }] },
    "layout.1.items.0.id": {
      value: "custom-nested",
      initialValue: "custom-nested",
    },
    "layout.1.items.0.label": { value: "Keep content" },
  };
  const copy = duplicateRowState(fields, "layout.1");
  expect(copy.id.value).not.toBe("custom-root");
  expect(copy["items.0.id"].value).not.toBe("custom-nested");
  expect(copy.items.rows?.[0].id).toBe(copy["items.0.id"].value);
  expect(copy["items.0.label"].value).toBe("Keep content");
  expect(fields["layout.1.items.0.id"].value).toBe("custom-nested");
});
it("schema composition preserves host editor instances, regexes and callback identities", async () => {
  const { cloneFields } = await import("../../src/schema/clone");
  const condition = () => true,
    pattern = /example/,
    editor = Object.create({ native: true });
  const original: any = [
    {
      name: "group",
      type: "group",
      fields: [
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "text",
              fields: [{ name: "body", type: "richText", editor }],
            },
          ],
          admin: { condition },
          custom: { pattern },
        },
      ],
    },
  ];
  const cloned: any = cloneFields(original);
  expect(cloned).not.toBe(original);
  expect(cloned[0].fields[0]).not.toBe(original[0].fields[0]);
  expect(cloned[0].fields[0].admin.condition).toBe(condition);
  expect(cloned[0].fields[0].custom.pattern).toBe(pattern);
  expect(cloned[0].fields[0].blocks[0].fields[0].editor).toBe(editor);
});

it("accepts empty native presentation skeletons but rejects every unknown authored value", () => {
  const saved = {
    title: "Saved",
    layout: [{ id: "a", blockType: "hero", heading: "Hello" }],
  };
  const native = { ...saved, "_index-4-0": { layout: { hero: {} } } };
  expect(candidateMatches(native, saved)).toBe(true);
  for (const value of ["unsaved", null, [], 0, false])
    expect(
      candidateMatches(
        { ...saved, "_index-4-0": { layout: { hero: value } } },
        saved,
      ),
    ).toBe(false);
  expect(candidateMatches({ ...native, title: "Unsaved" }, saved)).toBe(false);
  expect(
    candidateMatches(
      { ...native, layout: [{ ...saved.layout[0], id: "b" }] },
      saved,
    ),
  ).toBe(false);
});

it("reviews native zero-row controls only when the saved array is empty", () => {
  expect(
    candidateMatches({ meta: { synonyms: 0 } }, { meta: { synonyms: [] } }),
  ).toBe(true);
  expect(
    candidateMatches(
      { meta: { synonyms: 0 } },
      { meta: { synonyms: [{ id: "row", word: "Saved" }] } },
    ),
  ).toBe(false);
  expect(
    candidateMatches({ meta: { synonyms: 1 } }, { meta: { synonyms: [] } }),
  ).toBe(false);
  expect(
    candidateMatches(
      { meta: { synonyms: [] } },
      { meta: { synonyms: [{ id: "row" }] } },
    ),
  ).toBe(false);
});
