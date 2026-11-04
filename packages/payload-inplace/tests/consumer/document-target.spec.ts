import { expect, it } from "vitest";
import {
  nativeDocumentArgs,
  nativeDocumentPath,
  nativeDocumentMethod,
  parseEditorTarget,
  targetDocumentKey,
  targetScopeKey,
} from "../../src/state/document-target.js";
it("keeps global and collection identities, native endpoints and roots distinct", () => {
  const global = { kind: "global" as const, global: "pages", root: "layout" },
    collection = { collection: "pages", id: "pages", root: "layout" };
  expect(targetDocumentKey(global)).not.toBe(targetDocumentKey(collection));
  expect(nativeDocumentPath("/api/", global)).toBe("/api/globals/pages");
  expect(nativeDocumentMethod(global)).toBe("POST");
  expect(nativeDocumentMethod(collection)).toBe("PATCH");
  expect(nativeDocumentArgs(global)).toEqual({ globalSlug: "pages" });
  expect(targetScopeKey({ ...collection, root: "other" })).not.toBe(
    targetScopeKey(collection),
  );
  expect(
    parseEditorTarget({
      ...global,
      collection: "forged",
      id: 99,
      privateData: "discard",
    }),
  ).toEqual(global);
  expect(parseEditorTarget({ ...collection, kind: "unknown" })).toBeUndefined();
  expect(parseEditorTarget({ ...collection, id: NaN })).toBeUndefined();
});
