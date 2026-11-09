import type { VisualEditorOptions } from "../types";

/** Validate the finite host-owned origin allowlist once at plugin initialization; never infer trust from forwarded headers. */
export function trustedEditorOrigins(
  options: Pick<
    VisualEditorOptions,
    "previewOrigin" | "additionalPreviewOrigins"
  >,
): ReadonlySet<string> {
  return new Set(
    [options.previewOrigin, ...(options.additionalPreviewOrigins || [])].map(
      (value) => {
        const url = new URL(value);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.hostname.includes("*") ||
          url.username ||
          url.password ||
          url.pathname !== "/" ||
          url.search ||
          url.hash
        )
          throw new Error(
            "Editor origins must be exact HTTP(S) origins without credentials, paths, queries or wildcards",
          );
        return url.origin;
      },
    ),
  );
}
