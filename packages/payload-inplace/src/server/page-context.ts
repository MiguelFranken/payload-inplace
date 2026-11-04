import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../types.js";
import { readEditContext, verifyContext } from "./context.js";

/** Read only the explicitly named editor proof; ordinary auth cookies are never interpreted as editing activation. */
export function readEditorCookie(req: PayloadRequest, nonce: string): string {
  if (!/^[a-zA-Z0-9_-]{32}$/.test(nonce)) return "";
  const name = `payload-ve-${nonce}=`;
  return (
    (req.headers.get("cookie") || "")
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(name))
      ?.slice(name.length) || ""
  );
}

/** Validate a host-resolved pathname before using it for a cookie-backed website session or a soft navigation. */
export function validatePagePath(path: string, origin: string): string {
  if (
    typeof path !== "string" ||
    path.length > 2048 ||
    !path.startsWith("/") ||
    path.startsWith("//")
  )
    throw new Error("Resolve an absolute website pathname");
  const url = new URL(path, origin);
  if (url.origin !== origin || url.pathname !== path || url.search || url.hash)
    throw new Error("Resolve a same-origin pathname without query or fragment");
  return path;
}

/**
 * Resolve an explicitly activated website page outside published caches. A signed cookie is only a candidate:
 * current user/session, exact path, document access and host capability are checked again before returning drafts.
 * @see readEditContext performs the authoritative second pass.
 */
export async function readPageEditContext(
  req: PayloadRequest,
  pagePath: string,
  options: VisualEditorOptions,
) {
  if (options.disabled || !options.resolvePagePath || !req.user) return null;
  const candidates = (req.headers.get("cookie") || "")
    .split(";")
    .flatMap((entry) => {
      const [name, ...parts] = entry.trim().split("=");
      if (!/^payload-ve-[a-zA-Z0-9_-]{32}$/.test(name)) return [];
      const token = parts.join("=");
      const context = verifyContext(token, req.payload.secret);
      return context?.pagePath === pagePath &&
        name === `payload-ve-${context.nonce}`
        ? [
            {
              token,
              expires: context.expires,
              activatedAt: context.activatedAt || 0,
            },
          ]
        : [];
    })
    .sort((a, b) => b.activatedAt - a.activatedAt || b.expires - a.expires);
  for (const candidate of candidates) {
    try {
      return {
        ...(await readEditContext(req, candidate.token, options)),
        token: candidate.token,
      };
    } catch {
      /* A stale or revoked proof never turns a published request into a draft read. */
    }
  }
  return null;
}
