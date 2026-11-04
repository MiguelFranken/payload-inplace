import { expect, it } from "vitest";
import type { ClientField } from "payload";
import {
  mediaCollections,
  mediaReference,
} from "../../src/schema/media-reference.js";
it("retains monomorphic and polymorphic native reference shapes without editing the asset", () => {
  const upload = {
    name: "image",
    type: "upload",
    relationTo: "media",
  } as ClientField;
  expect(mediaReference(upload, { id: "asset-1", collection: "media" })).toBe(
    "asset-1",
  );
  const relation = {
    name: "image",
    type: "relationship",
    relationTo: ["media", "products"],
  } as ClientField;
  expect(mediaReference(relation, { id: 2, collection: "products" })).toEqual({
    relationTo: "products",
    value: 2,
  });
  expect(mediaCollections({ ...upload, hasMany: true } as ClientField)).toEqual(
    [],
  );
  for (const asset of [
    { id: "https://evil.test/a", collection: "media" },
    { id: "a", collection: "users" },
    { id: -1, collection: "media" },
  ])
    expect(() => mediaReference(upload, asset)).toThrow();
});
