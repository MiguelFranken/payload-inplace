import { expect, it } from "vitest";
import { nativeSavedDocument } from "../../src/adapters/native-response.js";
it("normalizes real v3 collection/global envelopes without mutating native content", () => {
  const collection = { collection: "pages", id: 1 },
    global = { kind: "global" as const, global: "header" };
  const doc = {
    id: 1,
    _veRevision: 2,
    updatedAt: "2026-11-04T12:00:00.000Z",
    layout: [{ id: "row", heading: "Saved" }],
  };
  expect(nativeSavedDocument({ doc }, collection)).toBe(doc);
  expect(nativeSavedDocument({ result: doc }, global)).toBe(doc);
  expect(doc.layout[0]!.heading).toBe("Saved");
});
it("rejects malformed, wrong-document and wrong-envelope acknowledgements before field reconciliation", () => {
  const collection = { collection: "pages", id: 1 },
    global = { kind: "global" as const, global: "header" };
  const doc = { id: 1, _veRevision: 2, updatedAt: "2026-11-04T12:00:00.000Z" };
  for (const value of [
    null,
    {},
    [],
    { doc: [] },
    { doc: { ...doc, id: 2 } },
    { doc: { ...doc, updatedAt: "invalid" } },
    { doc: { ...doc, _veRevision: "2" } },
    { result: doc },
  ])
    expect(nativeSavedDocument(value, collection)).toBeUndefined();
  expect(nativeSavedDocument({ doc }, global)).toBeUndefined();
  expect(
    nativeSavedDocument({ result: { ...doc, globalType: "other" } }, global),
  ).toBeUndefined();
});
