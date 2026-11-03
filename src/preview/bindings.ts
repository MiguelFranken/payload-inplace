import type { BlockIdentity } from "../types.js";
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
  identity: BlockIdentity & { field: string },
  active = false,
): Record<string, string> {
  return active
    ? { ...getBlockAttributes(identity, true), "data-ve-field": identity.field }
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
