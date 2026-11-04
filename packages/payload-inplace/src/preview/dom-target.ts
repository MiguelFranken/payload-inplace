import type { BlockIdentity } from "../../../core/src/types.js";
import {
  documentKey,
  type DocumentReference,
} from "../../../core/src/document-ref.js";
/** Match renderer-owned identity and provenance together. Equal native row IDs in different documents must never share drag/locate/selection geometry. Legacy unscoped bindings still address only the active document. */
export function findBoundBlock(
  root: ParentNode,
  identity: BlockIdentity,
  scope?: DocumentReference,
): HTMLElement | undefined {
  return [
    ...root.querySelectorAll<HTMLElement>(
      "[data-ve-block]:not([data-ve-field])",
    ),
  ].find((element) => {
    const provenance = element.getAttribute("data-ve-document");
    return (
      (!provenance || Boolean(scope && provenance === documentKey(scope))) &&
      element.getAttribute("data-ve-root") === identity.root &&
      element.getAttribute("data-ve-block") === identity.blockId &&
      element.getAttribute("data-ve-ancestors") ===
        JSON.stringify(identity.ancestors || [])
    );
  });
}
