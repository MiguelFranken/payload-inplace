import type { EditorTarget } from "../types.js";
/** The same locale-scoped native endpoint is used for manual and automatic drafts. */
export function nativeDraftAction(
  api: string,
  target: Pick<EditorTarget, "collection" | "id">,
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
  return `${api.replace(/\/$/, "")}/${encodeURIComponent(target.collection)}/${encodeURIComponent(String(target.id))}?${query}`;
}
