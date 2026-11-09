import type { EditorDocument } from "../types";

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

/** Native v3 collections acknowledge `doc`, globals `result`. Validate metadata/provenance before asking native Form to reconcile anything; an unexpected envelope must never replace fields with an empty response wrapper. No values are copied or persisted here. */
export function nativeSavedDocument(
  response: unknown,
  target: EditorDocument,
): Record<string, any> | undefined {
  if (!record(response)) return;
  const doc = response[target.kind === "global" ? "result" : "doc"];
  if (
    !record(doc) ||
    typeof doc.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(doc.updatedAt))
  )
    return;
  if (doc._veRevision !== undefined && !Number.isSafeInteger(doc._veRevision))
    return;
  if (target.kind === "global") {
    if (doc.globalType !== undefined && doc.globalType !== target.global)
      return;
  } else if (doc.id == null || String(doc.id) !== String(target.id)) return;
  return doc;
}
