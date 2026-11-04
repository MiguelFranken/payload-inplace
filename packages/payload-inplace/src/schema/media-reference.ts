import type { ClientField } from "payload";
/** Only explicit single-reference upload/relationship fields can use the contextual library. */
export function mediaCollections(field: ClientField): string[] {
  if (
    (field.type !== "upload" && field.type !== "relationship") ||
    field.hasMany
  )
    return [];
  return typeof field.relationTo === "string"
    ? [field.relationTo]
    : [...field.relationTo];
}
/** Native reference shapes are preserved; a URL or asset from another collection can never masquerade as an upload ID. Server native validation still authorizes the actual reference. */
export function mediaReference(
  field: ClientField,
  asset: { id: string | number; collection: string },
): string | number | { relationTo: string; value: string | number } {
  const collections = mediaCollections(field);
  if (
    !collections.includes(asset.collection) ||
    !(
      (typeof asset.id === "number" &&
        Number.isSafeInteger(asset.id) &&
        asset.id >= 0) ||
      (typeof asset.id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(asset.id))
    )
  )
    throw Error("Unsupported media reference");
  return (field.type === "upload" || field.type === "relationship") &&
    Array.isArray(field.relationTo)
    ? { relationTo: asset.collection, value: asset.id }
    : asset.id;
}
