import type {
  EditorDocument,
  EditorTarget,
  VisualEditorOptions,
} from "../types.js";
import {
  documentKey as referenceKey,
  type DocumentReference,
} from "../../../core/src/document-ref.js";
/** Normalize legacy collection targets into discriminated provenance, without widening their authorization. */
export function documentReference(target: EditorDocument): DocumentReference {
  return target.kind === "global"
    ? { kind: "global", global: target.global }
    : { kind: "collection", collection: target.collection, id: target.id };
}
/** Native schema paths use a collection/global slug; the kind still participates in every identity/security key. */
export function targetSlug(target: EditorDocument): string {
  return target.kind === "global" ? target.global : target.collection;
}
/** Stable identity distinguishes global and collection documents even when names match. */
export function targetDocumentKey(target: EditorDocument): string {
  return referenceKey(documentReference(target));
}
/** Native REST URL only; its request still needs origin, session, document and locale authorization. */
export function nativeDocumentPath(
  api: string,
  target: EditorDocument,
): string {
  const base = api.replace(/\/$/, "");
  return target.kind === "global"
    ? `${base}/globals/${encodeURIComponent(target.global)}`
    : `${base}/${encodeURIComponent(target.collection)}/${encodeURIComponent(String(target.id))}`;
}
/** Globals update through POST, collections through PATCH. No plugin persistence endpoint is introduced. */
export function nativeDocumentMethod(target: EditorDocument): "POST" | "PATCH" {
  return target.kind === "global" ? "POST" : "PATCH";
}
/** Native provider/form preparation discriminates one entity. */
export function nativeDocumentArgs(target: EditorDocument) {
  return target.kind === "global"
    ? { globalSlug: target.global }
    : { collectionSlug: target.collection, id: target.id };
}
/** Shared native controls infer their exact document from DocumentInfo; global controls never invent a collection/id pair. */
export function targetFromNativeInfo(
  info: { collectionSlug?: string; globalSlug?: string; id?: string | number },
  root = "",
): EditorTarget {
  if (info.globalSlug) return { kind: "global", global: info.globalSlug, root };
  if (!info.collectionSlug || info.id == null)
    throw Error("Native document scope is unavailable");
  return { collection: info.collectionSlug, id: info.id, root };
}
/** Native structural policy is selected by document kind, not a colliding slug. */
export function targetPolicy(
  options: VisualEditorOptions,
  target: EditorTarget,
) {
  return (
    target.kind === "global"
      ? options.globalPolicies?.[target.global]
      : options.policies?.[target.collection]
  )?.[target.root];
}

/** Bound untrusted activation inputs to the exact supported identity shape; annotations/unknown properties grant no authority. */
export function parseEditorTarget(input: unknown): EditorTarget | undefined {
  if (!input || typeof input !== "object") return;
  const value = input as Record<string, unknown>;
  if (typeof value.root !== "string" || !value.root || value.root.length > 256)
    return;
  if (value.kind === "global")
    return typeof value.global === "string" &&
      value.global &&
      value.global.length < 256
      ? { kind: "global", global: value.global, root: value.root }
      : undefined;
  if (value.kind !== undefined && value.kind !== "collection") return;
  if (
    typeof value.collection !== "string" ||
    !value.collection ||
    value.collection.length > 256 ||
    !(
      (typeof value.id === "string" &&
        value.id.length > 0 &&
        value.id.length <= 256) ||
      (typeof value.id === "number" && Number.isSafeInteger(value.id))
    )
  )
    return;
  return { collection: value.collection, id: value.id, root: value.root };
}

/** Root participates in activation/selection identity, while revision/lock identity remains document-wide. */
export function targetScopeKey(target: EditorTarget): string {
  return JSON.stringify([targetDocumentKey(target), target.root]);
}
