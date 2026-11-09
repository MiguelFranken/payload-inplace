import type { PayloadRequest } from "payload";
import type { EditContext, VisualEditorOptions } from "../types";
import { parseEditorTarget, targetScopeKey } from "../state/document-target";
import {
  authorizeTarget,
  createContext,
  readEditContext,
  signContext,
  verifyContext,
} from "./context";
import { configuredPageScopes } from "./page-scopes";
import { editorLabel } from "./tools";
import { createEditorMessages } from "@payload-inplace/ui/localization/messages";

/** Client metadata contains only independently authorized targets/labels. It does not activate or read any foreign draft in the browser. */
export async function availablePageScopes(
  req: PayloadRequest,
  context: EditContext,
  pageDocument: Record<string, any>,
  options: VisualEditorOptions,
) {
  const configured = await configuredPageScopes(
    req,
    context,
    pageDocument,
    options,
  );
  const result: {
    target: import("../types").EditorTarget;
    label: string;
  }[] = [];
  const language = createEditorMessages(options.ui, req.i18n.language).locale;
  for (const scope of configured) {
    try {
      await authorizeTarget(req, scope.target, options);
      result.push({
        target: scope.target,
        label: editorLabel(scope.label, language),
      });
    } catch {
      /* Omit revoked/denied scopes without leaking their labels or content. */
    }
  }
  return result;
}

/** Switch only within an already signed exact page. Each document keeps its own native Form/revision/review; there is no multi-document write transaction. */
export async function scopeEndpoint(
  req: PayloadRequest,
  options: VisualEditorOptions,
  trustedOrigins: ReadonlySet<string>,
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (
    !options.pageScopes ||
    options.disabled ||
    !trustedOrigins.has(req.headers.get("origin") || "")
  )
    return Response.json(
      { error: "Scope unavailable" },
      { status: 403, headers },
    );
  try {
    const input = await req.json?.();
    const target = parseEditorTarget(input?.target);
    if (
      !target ||
      typeof input?.proof !== "string" ||
      input.proof.length > 4096
    )
      throw Error("Invalid scope request");
    const { context, document, pageDocument } = await readEditContext(
      req,
      input.proof,
      options,
    );
    if (!context.pagePath)
      throw Error("Scope switching requires an explicit website page");
    if (input.expectedRevision !== (document._veRevision ?? document.updatedAt))
      return Response.json(
        { error: "Current draft changed" },
        { status: 409, headers },
      );
    const allowed = await availablePageScopes(
      req,
      context,
      pageDocument,
      options,
    );
    if (
      !allowed.some(
        (scope) => targetScopeKey(scope.target) === targetScopeKey(target),
      )
    )
      throw Error("Scope not allowed");
    const next = createContext(
      req,
      target,
      Math.max(0, context.expires - Date.now()),
      context.pagePath,
      context.pageOwner || context.target,
    );
    if (next.expires - Date.now() < 1000)
      throw Error("Editing session is expiring");
    next.activatedAt = Math.max(Date.now(), (context.activatedAt || 0) + 1);
    // Reuse one proof cookie per page/document/root/locale. Another tab's authorized native action keeps its own nonce; repeated switching does not grow request headers.
    for (const item of (req.headers.get("cookie") || "")
      .split(";")
      .slice(0, 64)) {
      const [name, ...parts] = item.trim().split("=");
      if (!/^payload-ve-[a-zA-Z0-9_-]{32}$/.test(name || "")) continue;
      const existing = verifyContext(parts.join("="), req.payload.secret);
      if (
        existing &&
        name === `payload-ve-${existing.nonce}` &&
        existing.user === context.user &&
        existing.session === context.session &&
        existing.locale === context.locale &&
        existing.pagePath === context.pagePath &&
        targetScopeKey(existing.target) === targetScopeKey(target) &&
        targetScopeKey(existing.pageOwner || existing.target) ===
          targetScopeKey(next.pageOwner!)
      ) {
        next.nonce = existing.nonce;
        break;
      }
    }
    const cookie = `payload-ve-${next.nonce}=${signContext(next, req.payload.secret)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor((next.expires - Date.now()) / 1000)}${req.headers.get("origin")?.startsWith("https:") ? "; Secure" : ""}`;
    const response = Response.json(
      {
        context: {
          target: next.target,
          nonce: next.nonce,
          expires: next.expires,
          pagePath: next.pagePath,
          ...(next.locale ? { locale: next.locale } : {}),
        },
      },
      { headers: { ...headers, "Set-Cookie": cookie } },
    );
    return response;
  } catch {
    return Response.json(
      { error: "Scope unavailable; your current working copy is retained" },
      { status: 403, headers },
    );
  }
}

/** Host-only draft renderer input for an explicitly active page. Every record is reauthorized through the finite page catalogue; this creates no client state, edit permission, save owner or publication batch. Keep it outside published caches. */
export async function readPageEditorDocuments(
  req: PayloadRequest,
  proof: string,
  options: VisualEditorOptions,
) {
  const { context, pageDocument } = await readEditContext(req, proof, options);
  const available = await availablePageScopes(
    req,
    context,
    pageDocument,
    options,
  );
  const documents = [];
  for (const scope of available)
    documents.push({
      ...scope,
      document: await authorizeTarget(req, scope.target, options),
    });
  return { context, documents };
}
