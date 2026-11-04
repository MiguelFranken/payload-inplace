import type { PayloadRequest } from "payload";
import type { EditorTarget } from "../../../packages/payload-inplace/dist/exports/types.js";
/** Called only after authorizedEditor has reauthorized the exact native scope. Public renderers do not use this draft reader. */
export function readDemoDocument(
  req: PayloadRequest,
  target: EditorTarget,
): Promise<Record<string, any>> {
  return target.kind === "global"
    ? req.payload.findGlobal({
        slug: target.global as never,
        draft: true,
        depth: 1,
        fallbackLocale: false,
        req,
        overrideAccess: false,
      })
    : req.payload.findByID({
        collection: target.collection as any,
        id: target.id,
        draft: true,
        fallbackLocale: false,
        depth: ["shops", "products"].includes(target.collection) ? 3 : 1,
        req,
        overrideAccess: false,
      });
}
