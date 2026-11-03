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
