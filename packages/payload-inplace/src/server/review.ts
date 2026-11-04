import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PayloadRequest } from "payload";
import { isDocumentMetadataField } from "../../../core/src/document-metadata.js";
import { currentSession } from "./context.js";

/** Canonical authored-input hash excludes server metadata but retains nested row identities. */
export function contentHash(data: Record<string, unknown>): string {
  function canonical(value: any): any {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .filter((k) => value[k] !== undefined)
          .map((k) => [k, canonical(value[k])]),
      );
    return value;
  }
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical(
          Object.fromEntries(
            Object.entries(data).filter(
              ([key]) => !isDocumentMetadataField(key),
            ),
          ),
        ),
      ),
    )
    .digest("hex");
}
/** Review only a saved draft. Candidate is the native Form snapshot, never a second persistence channel. */
export function candidateMatches(
  candidate: Record<string, unknown>,
  draft: Record<string, unknown>,
): boolean {
  // Payload's unflattened native state can leave empty presentational-container skeletons.
  // These contain no authored value; unknown primitives, nulls and arrays must still fail closed.
  function emptyContainer(value: unknown): boolean {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every(emptyContainer)
    );
  }
  function matches(input: unknown, saved: unknown): boolean {
    // Native unmounted row controls serialize an empty array as its zero row count.
    // Only an actually empty saved array is equivalent; a non-empty array must retain exact values/IDs.
    if (input === 0 && Array.isArray(saved) && saved.length === 0) return true;
    if (Array.isArray(input)) {
      if (!Array.isArray(saved) || input.length !== saved.length) return false;
      return input.every((row, index) => {
        const previous = saved[index];
        if (
          previous &&
          typeof previous === "object" &&
          "id" in previous &&
          previous.id != null &&
          (row as any)?.id !== previous.id
        )
          return false;
        return matches(row, previous);
      });
    }
    if (input && typeof input === "object") {
      if (!saved || typeof saved !== "object" || Array.isArray(saved))
        return false;
      return Object.entries(input).every(([key, value]) =>
        Object.hasOwn(saved, key)
          ? matches(value, (saved as any)[key])
          : emptyContainer(value),
      );
    }
    return Object.is(input, saved);
  }
  // Native Form omits unowned/default fields such as null blockName. Compare its submitted
  // projection while the review displays the complete authorized draft. Row identities/order stay exact.
  return Object.entries(candidate)
    .filter(([key]) => !isDocumentMetadataField(key))
    .every(([key, value]) =>
      Object.hasOwn(draft, key)
        ? matches(value, draft[key])
        : emptyContainer(value),
    );
}
function mac(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
/** Sign the exact saved revision and submitted native snapshot after displaying document-wide review. */
export function signReview(
  req: PayloadRequest,
  collection: string,
  id: string | number,
  revision: number,
  candidate: Record<string, unknown>,
): string {
  const value = Buffer.from(
    JSON.stringify({
      collection,
      id: String(id),
      revision,
      hash: contentHash(candidate),
      user: `${req.user?.collection}:${req.user?.id}`,
      session: currentSession(req),
      expires: Date.now() + 300000,
    }),
  ).toString("base64url");
  return `${value}.${mac(value, req.payload.secret)}`;
}
/** The native write authority verifies both saved revision and unchanged reviewed form input. */
export function validateReview(
  req: PayloadRequest,
  token: unknown,
  collection: string,
  id: string | number,
  revision: number,
  candidate: Record<string, unknown>,
): boolean {
  if (typeof token !== "string" || token.length > 4096) return false;
  const [value, signature, extra] = token.split(".");
  if (!value || !signature || extra) return false;
  const correct = mac(value, req.payload.secret);
  if (
    signature.length !== correct.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(correct))
  )
    return false;
  try {
    const review = JSON.parse(Buffer.from(value, "base64url").toString());
    return (
      review.expires > Date.now() &&
      review.collection === collection &&
      review.id === String(id) &&
      review.revision === revision &&
      review.hash === contentHash(candidate) &&
      review.user === `${req.user?.collection}:${req.user?.id}` &&
      review.session === currentSession(req)
    );
  } catch {
    return false;
  }
}
