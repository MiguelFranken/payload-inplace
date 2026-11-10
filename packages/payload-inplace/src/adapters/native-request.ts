import { nativeDocumentPath } from "../state/document-target";
import type { EditorDocument } from "../types";

/** Keep activation and recovery bound to the same native content locale. */
export function editorActivationPath(api: string, locale?: string): string {
  const action = `${api}/visual-editor/activate`;
  return locale && locale !== "all"
    ? `${action}?locale=${encodeURIComponent(locale)}&fallback-locale=null`
    : action;
}

/** The same locale-scoped native endpoint is used for manual and automatic drafts. */
export function nativeDraftAction(
  api: string,
  target: EditorDocument,
  locale: string | undefined,
  autosave = false,
): string {
  const query = new URLSearchParams({
    ...(locale ? { locale } : {}),
    depth: "0",
    "fallback-locale": "null",
    draft: "true",
    ...(autosave ? { autosave: "true" } : {}),
  });
  return `${nativeDocumentPath(api, target)}?${query}`;
}
