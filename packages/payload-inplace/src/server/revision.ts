import { validateReview } from "./review.js";
import { APIError } from "payload";
import type {
  CollectionBeforeOperationHook,
  CollectionBeforeChangeHook,
} from "payload";
import { operationalSnapshotMatches } from "./operational-write.js";
import type { ConcurrencyAdapter, OperationalWritePolicy } from "../types.js";
export const REVISION = "_veRevision";
const contextKey = "payloadVisualEditorRevision";
/** Reject stale standard-CMS and visual saves at the write authority, before their latest-document read.
 * Expected revision travels in the native form. Restore uses the same native endpoint with a reviewed header.
 */
export function revisionGuard(
  collection: string,
  adapter: ConcurrencyAdapter,
  operationalPolicy?: OperationalWritePolicy,
): CollectionBeforeOperationHook {
  return async ({ args, operation, req }) => {
    if (
      operation === "create" &&
      req.user &&
      (args as any).data?._status !== "draft"
    )
      throw new APIError(
        "Save a draft first, then review and publish the saved revision.",
        409,
      );
    if (!["update", "restoreVersion", "delete"].includes(operation))
      return args;
    let id = (args as any).id;
    if (operation === "restoreVersion") {
      if (!(args as any).draft)
        throw new APIError(
          "Restore as a draft, then review and publish it.",
          409,
        );
      const versions = await req.payload.findVersions({
        collection: collection as any,
        where: { id: { equals: id } },
        limit: 1,
        depth: 0,
        req,
        overrideAccess: false,
      });
      const parent: any = versions.docs[0]?.parent;
      id = typeof parent === "object" ? parent?.id : parent;
    }
    if (id === undefined || id === null)
      throw new APIError(
        "Bulk writes are unsupported for revision-guarded documents. Use explicit document IDs.",
        409,
      );
    const key = JSON.stringify([collection, String(id)]);
    await adapter.lock(req, key);
    if (operation === "delete") return args;
    const system =
      !req.user &&
      (args as any).overrideAccess === true &&
      req.context.visualEditorSystemWrite === true;
    // Only explicitly trusted system work bypasses read access to inspect the internal revision.
    const latest = (await req.payload.findByID({
      collection: collection as any,
      id,
      draft: true,
      fallbackLocale: false,
      depth: 0,
      req,
      overrideAccess: system,
    })) as any;
    const expected =
      operation === "restoreVersion"
        ? req.headers.has("x-visual-editor-revision")
          ? Number(req.headers.get("x-visual-editor-revision"))
          : NaN
        : (args as any).data?.[REVISION];
    // Trusted system writers must explicitly opt in; they still hold the same transaction lock.
    const revision = latest[REVISION] ?? 0;
    if (!system && (!Number.isSafeInteger(expected) || expected !== revision))
      throw new APIError(
        "This document changed in another editor. Keep your changes, reload and review the latest draft before retrying.",
        409,
      );
    const publishes =
      operation === "update" &&
      !(args as any).draft &&
      (args as any).data?._status !== "draft";
    let operational = false;
    if (
      !system &&
      publishes &&
      operationalPolicy &&
      (await operationalPolicy.authorize(req))
    ) {
      const published = (await req.payload.findByID({
        collection: collection as any,
        id,
        draft: false,
        depth: 0,
        req,
        overrideAccess: false,
      })) as Record<string, unknown>;
      operational =
        published._status === "published" &&
        operationalSnapshotMatches(
          (args as any).data,
          published,
          operationalPolicy.paths,
        );
    }
    if (
      !system &&
      !operational &&
      operation === "update" &&
      !(args as any).draft &&
      (args as any).data?._status !== "draft" &&
      !validateReview(
        req,
        (args as any).data._veReviewToken,
        collection,
        id,
        revision,
        (args as any).data,
      )
    )
      throw new APIError(
        "Save and review the complete current draft before publishing. The reviewed content or revision changed.",
        409,
      );
    const states = (req.context[contextKey] ??= {}) as Record<string, number>;
    states[key] = revision + 1;
    if (operation === "update") (args as any).data[REVISION] = revision + 1;
    return args;
  };
}
/** Revision is written by the server after host validation; restored historical values cannot roll it back. */
export const assignRevision: CollectionBeforeChangeHook = ({
  data,
  operation,
  req,
  collection,
  originalDoc,
}) => {
  if (operation === "create") {
    data[REVISION] = 1;
    return data;
  }
  const states = req.context[contextKey] as Record<string, number> | undefined;
  const next =
    states?.[JSON.stringify([collection.slug, String(originalDoc?.id)])];
  if (!next) throw new APIError("Missing authoritative document revision", 409);
  data[REVISION] = next;
  return data;
};
