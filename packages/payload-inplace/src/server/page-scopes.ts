import type { PayloadRequest } from "payload";
import type {
  EditContext,
  EditorPageScope,
  VisualEditorOptions,
} from "../types";
import {
  parseEditorTarget,
  targetDocumentKey,
} from "../state/document-target";

/** Normalize server-owned scope configuration before it becomes client metadata. An unbounded/ambiguous catalogue fails closed. No content is copied into the returned descriptors. */
export async function configuredPageScopes(
  req: PayloadRequest,
  context: EditContext,
  document: Record<string, any>,
  options: VisualEditorOptions,
): Promise<EditorPageScope[]> {
  if (!context.pagePath || !options.pageScopes || options.disabled) return [];
  const scopes = await options.pageScopes({
    req,
    target: context.pageOwner || context.target,
    document,
    pagePath: context.pagePath,
  });
  if (!Array.isArray(scopes) || scopes.length > 16)
    throw Error("Page scopes must be a bounded explicit catalogue");
  const seen = new Set<string>();
  return scopes.map((scope) => {
    const target = parseEditorTarget(scope.target);
    if (!target || seen.has(targetDocumentKey(target)) || !scope.label)
      throw Error("Page scopes need unique native documents and labels");
    seen.add(targetDocumentKey(target));
    return { target, label: scope.label };
  });
}
