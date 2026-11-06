import type { BlockIdentity } from "./types.js";

/** Attach only on the authorized preview surface; public rendering gets identical unannotated DOM. */
export function getBlockAttributes(
  identity: BlockIdentity,
  active = false,
): Record<string, string> {
  if (!active) return {};
  return {
    "data-ve-block": identity.blockId,
    "data-ve-root": identity.root,
    "data-ve-ancestors": JSON.stringify(identity.ancestors ?? []),
  };
}

/** A field binding describes provenance, never server write authority. Repeated occurrences share it. */
export function getFieldAttributes(
  identity: BlockIdentity & {
    field: string;
    edit?: "auto" | "inline" | "panel";
  },
  active = false,
): Record<string, string> {
  return active
    ? {
        ...getBlockAttributes(identity, true),
        "data-ve-field": identity.field,
        ...(identity.edit ? { "data-ve-edit": identity.edit } : {}),
      }
    : {};
}

/** Bind one rendered object (for example an image with caption) to several native fields.
 * This opens a scoped native settings panel; it never enables contenteditable or grants write permission.
 */
export function getFieldGroupAttributes(
  identity: BlockIdentity & { fields: readonly string[] },
  active = false,
): Record<string, string> {
  return active && identity.fields.length
    ? {
        ...getBlockAttributes(identity, true),
        "data-ve-fields": JSON.stringify(identity.fields),
      }
    : {};
}

/** Address a single native array row. Append a field to the returned data-ve-field path
 * with getFieldAttributes for terminal text; row wrappers open only that row's settings.
 * IDs are URI encoded so dots and reserved characters cannot become path separators.
 */
export function getArrayItemAttributes(
  identity: BlockIdentity & { field: string; rowId: string | number },
  active = false,
): Record<string, string> {
  if (!active) return {};
  return getFieldAttributes(
    {
      ...identity,
      field: getArrayItemPath(identity.field, identity.rowId),
      edit: "panel",
    },
    true,
  );
}

/** Build a stable dotted row or leaf path. Compose calls for nested arrays; no content values are serialized. */
export function getArrayItemPath(
  array: string,
  rowId: string | number,
  field?: string,
): string {
  const id = encodeURIComponent(String(rowId)).replace(/\./g, "%2E");
  return `${array}.@${id}${field ? `.${field}` : ""}`;
}
