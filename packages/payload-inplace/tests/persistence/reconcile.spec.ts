import { expect, it } from "vitest";
import {
  reconcileDocuments,
  resolveReconciliation,
} from "../../src/state/reconcile.js";

const base = {
  id: 1,
  _veRevision: 1,
  _status: "draft",
  layout: [
    { id: "a.b", blockType: "text", title: "One", caption: "Caption" },
    { id: "b", blockType: "text", title: "Two" },
  ],
};

const clone = () => structuredClone(base);
it("merges disjoint leaves with stable IDs and latest security/revision metadata", () => {
  const local = clone(),
    latest = clone();
  local.layout[0]!.title = "Mine";
  latest.layout[0]!.caption = "Theirs";
  latest._veRevision = 2;
  const result = reconcileDocuments(base, local, latest);
  expect(result.conflicts).toEqual([]);
  expect(result.merged).toMatchObject({
    _veRevision: 2,
    layout: [{ id: "a.b", title: "Mine", caption: "Theirs" }, { id: "b" }],
  });
  expect(base.layout[0]?.title).toBe("One");
});
it("requires explicit same-field decisions, treats identical outcomes as compatible and never guesses a structural merge", () => {
  const local = clone(),
    latest = clone();
  local.layout[0]!.title = "Mine";
  latest.layout[0]!.title = "Theirs";
  const result = reconcileDocuments(base, local, latest);
  expect(result.conflicts.map((conflict) => conflict.path)).toEqual([
    "layout.@a%2Eb.title",
  ]);
  expect(() => resolveReconciliation(result, {})).toThrow();
  expect(
    (
      resolveReconciliation(result, { "layout.@a%2Eb.title": "local" })
        .layout as typeof base.layout
    )[0]?.title,
  ).toBe("Mine");
  latest.layout[0]!.title = "Mine";
  expect(reconcileDocuments(base, local, latest).conflicts).toEqual([]);
  latest.layout[0]!.caption = "Remote";
  local.layout.reverse();
  const structure = reconcileDocuments(base, local, latest);
  expect(structure.conflicts).toMatchObject([
    { path: "layout", structural: true },
  ]);
  expect(resolveReconciliation(structure, { layout: "latest" }).layout).toEqual(
    latest.layout,
  );
});
it("surfaces delete/edit and duplicate identities, and keeps unknown JSON/rich text atomic", () => {
  const local = clone(),
    latest = clone();
  local.layout.splice(0, 1);
  latest.layout[0]!.title = "Remote";
  expect(reconcileDocuments(base, local, latest).conflicts).toMatchObject([
    { path: "layout", structural: true },
  ]);
  const jsonBase = { settings: { x: 1, y: 1 } },
    jsonLocal = { settings: { x: 2, y: 1 } },
    jsonLatest = { settings: { x: 1, y: 2 } };
  expect(
    reconcileDocuments(jsonBase, jsonLocal, jsonLatest, [
      { name: "settings", type: "json" },
    ]).conflicts,
  ).toMatchObject([{ path: "settings" }]);
  const duplicate = clone();
  duplicate.layout[1]!.id = "a.b";
  expect(() => reconcileDocuments(base, duplicate, latest)).toThrow(
    "invalid identities",
  );
});
it("validates only native list identities through named tabs, groups and reusable blocks", async () => {
  const { assertReconcileIdentities } = await import(
    "../../src/schema/reconcile-identities.js"
  );
  const schema: import("payload").ClientField[] = [
    {
      type: "tabs",
      tabs: [
        {
          name: "content",
          fields: [
            {
              name: "group",
              type: "group",
              fields: [
                {
                  name: "rows",
                  type: "array",
                  fields: [{ name: "title", type: "text" }],
                },
              ],
            },
          ],
        },
        { label: "Settings", fields: [{ name: "json", type: "json" }] },
      ],
    },
  ];
  const document = {
    content: { group: { rows: [{ id: "row", title: "One" }] } },
    json: [{ id: "duplicate" }, { id: "duplicate" }],
  };
  expect(() => assertReconcileIdentities(document, schema, {})).not.toThrow();
  document.content.group.rows.push({ id: "row", title: "Duplicate" });
  expect(() => assertReconcileIdentities(document, schema, {})).toThrow(
    "content.group.rows",
  );
});
