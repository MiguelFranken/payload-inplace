import type {
  PayloadRequest,
  SanitizedCollectionConfig,
  SanitizedGlobalConfig,
} from "payload";
import type { EditorDocument } from "../types";

/** Resolve only configured native entities; callers still perform current access checks. */
export function nativeDocumentConfig(
  req: PayloadRequest,
  target: EditorDocument,
): SanitizedCollectionConfig | SanitizedGlobalConfig {
  const config =
    target.kind === "global"
      ? req.payload.globals.config.find((item) => item.slug === target.global)
      : req.payload.collections[
          target.collection as keyof typeof req.payload.collections
        ]?.config;
  if (!config) throw Error("Editor target unavailable");
  return config;
}

/** Read one native document with ordinary ACL and no translation fallback. Draft selection is explicit and never inferred from authentication. */
export function readNativeDocument(
  req: PayloadRequest,
  target: EditorDocument,
  draft: boolean,
): Promise<Record<string, any>> {
  return target.kind === "global"
    ? req.payload.findGlobal({
        slug: target.global as never,
        draft,
        depth: 0,
        fallbackLocale: false,
        req,
        overrideAccess: false,
      })
    : req.payload.findByID({
        collection: target.collection as never,
        id: target.id,
        draft,
        depth: 0,
        fallbackLocale: false,
        req,
        overrideAccess: false,
      });
}
