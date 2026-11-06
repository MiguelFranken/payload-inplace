/** Provenance only. Every request still authorizes this document on the server. */
export type DocumentReference =
  | { kind: "collection"; collection: string; id: string | number }
  | { kind: "global"; global: string };

/** Stable encoded keys avoid ambiguous colon/dot delimiters in consumer IDs. */
export function documentKey(ref: DocumentReference): string {
  return ref.kind === "global"
    ? `g:${encodeURIComponent(ref.global)}`
    : `c:${encodeURIComponent(ref.collection)}:${encodeURIComponent(String(ref.id))}`;
}

/** Untrusted DOM metadata fails closed; it never becomes a permission grant. */
export function parseDocumentKey(value: string): DocumentReference | undefined {
  try {
    const parts = value.split(":");
    if (parts[0] === "g" && parts.length === 2 && parts[1])
      return { kind: "global", global: decodeURIComponent(parts[1]) };
    if (parts[0] === "c" && parts.length === 3 && parts[1] && parts[2])
      return {
        kind: "collection",
        collection: decodeURIComponent(parts[1]),
        id: decodeURIComponent(parts[2]),
      };
  } catch {
    /* Malformed URI metadata is not a target. */
  }
}
