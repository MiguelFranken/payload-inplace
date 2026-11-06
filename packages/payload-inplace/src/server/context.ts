import { configuredPageScopes } from "./page-scopes.js";
import { nativeDocumentConfig, readNativeDocument } from "./document.js";
import { parseEditorTarget, targetScopeKey } from "../state/document-target.js";
import { contentLocale } from "./content-locale.js";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  EditContext,
  EditorTarget,
  VisualEditorOptions,
} from "../types.js";
import {
  APIError,
  docAccessOperationGlobal,
  type PayloadRequest,
} from "payload";

/** Stable document key includes string/numeric identity semantics and the configured root. */
export function documentKey(target: EditorTarget): string {
  return targetScopeKey(target);
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Sign server-verified activation; the token is sent in a private response, never a URL. */
export function signContext(context: EditContext, secret: string): string {
  const value = Buffer.from(JSON.stringify(context)).toString("base64url");
  return `${value}.${signature(value, secret)}`;
}

/** Verify integrity/expiry before trusting scope; callers still recheck current user/session/capability. */
export function verifyContext(
  token: string,
  secret: string,
  now = Date.now(),
): EditContext | null {
  if (!token || token.length > 4096) return null;
  const [value, mac, extra] = token.split(".");
  if (!value || !mac || extra) return null;
  const correct = signature(value, secret);
  if (
    mac.length !== correct.length ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(correct))
  )
    return null;
  try {
    const c = JSON.parse(Buffer.from(value, "base64url").toString());
    const target = parseEditorTarget(c.target);
    if (
      !target ||
      (c.activatedAt !== undefined &&
        (!Number.isSafeInteger(c.activatedAt) || c.activatedAt < 0)) ||
      (c.pageOwner !== undefined &&
        (!parseEditorTarget(c.pageOwner) || !c.pagePath)) ||
      (c.target.kind === "global"
        ? typeof c.target.global !== "string"
        : typeof c.target.collection !== "string" ||
          !["string", "number"].includes(typeof c.target.id)) ||
      typeof c.target.root !== "string" ||
      (c.locale !== undefined &&
        (typeof c.locale !== "string" ||
          !c.locale ||
          c.locale === "all" ||
          c.locale.length > 128)) ||
      typeof c.user !== "string" ||
      typeof c.session !== "string" ||
      typeof c.nonce !== "string" ||
      (c.pagePath !== undefined &&
        (typeof c.pagePath !== "string" ||
          !c.pagePath.startsWith("/") ||
          c.pagePath.startsWith("//") ||
          /[?#\\]/.test(c.pagePath))) ||
      !Number.isFinite(c.expires) ||
      c.expires <= now
    )
      return null;
    return {
      ...c,
      target,
      ...(c.pageOwner ? { pageOwner: parseEditorTarget(c.pageOwner) } : {}),
    };
  } catch {
    return null;
  }
}

/** Authorize draft editing through host capability and native read/update/admin access,
 * including update Where. Published source data remains visible to host capability;
 * the native update permission receives draft intent, never publish authority.
 */
export async function authorizeTarget(
  req: PayloadRequest,
  target: EditorTarget,
  options: VisualEditorOptions,
  policy: { requireVisualCapability?: boolean } = {},
): Promise<Record<string, any>> {
  if (
    !req.user ||
    !(
      target.kind === "global"
        ? options.globals?.[target.global]
        : options.collections[target.collection]
    )?.roots.includes(target.root)
  )
    throw new APIError("Editor access denied", 403);
  if (target.kind === "global") {
    const global = nativeDocumentConfig(
      req,
      target,
    ) as import("payload").SanitizedGlobalConfig;
    if (typeof global.versions !== "object" || !global.versions.drafts)
      throw Error("Global editing requires native drafts");
    const admin =
      req.payload.collections[req.user.collection]?.config.access.admin;
    if (admin && !(await admin({ req })))
      throw new APIError("Editor access denied", 403);
    const document = await readNativeDocument(req, target, true);
    const permission = await docAccessOperationGlobal({
      req,
      globalConfig: global,
      data: { ...document, _status: "draft" },
    });
    if (
      permission.update !== true ||
      (policy.requireVisualCapability !== false &&
        !(await options.canEdit({ req, target, document })))
    )
      throw new APIError("Editor access denied", 403);
    return document;
  }
  const collection =
    req.payload.collections[
      target.collection as keyof typeof req.payload.collections
    ]?.config;
  if (!collection) throw new APIError("Editor target unavailable", 403);
  const admin = collection.access?.admin
    ? await collection.access.admin({ req })
    : true;
  if (!admin) throw new APIError("Editor access denied", 403);
  const document = await req.payload.findByID({
    collection: target.collection as any,
    id: target.id,
    draft: true,
    depth: 0,
    fallbackLocale: false,
    req,
    overrideAccess: false,
  });
  const update = collection.access?.update
    ? await collection.access.update({
        req,
        id: target.id as never,
        data: { ...document, _status: "draft" },
      })
    : Boolean(req.user);
  if (!update) throw new APIError("Editor access denied", 403);
  if (typeof update === "object") {
    const allowed = await req.payload.find({
      collection: target.collection as any,
      where: { and: [{ id: { equals: target.id } }, update] },
      draft: true,
      depth: 0,
      limit: 1,
      req,
      overrideAccess: false,
    });
    if (!allowed.docs.length) throw new APIError("Editor access denied", 403);
  }
  if (
    policy.requireVisualCapability !== false &&
    !(await options.canEdit({ req, target, document }))
  )
    throw new APIError("Editor access denied", 403);
  return document;
}

/** Bind to Payload's current session; logout/relogin invalidates activation even for the same account. */
export function currentSession(req: PayloadRequest): string {
  return String((req.user as any)?._sid ?? "");
}

/** Capture a freshly authorized document and one content locale in a short-lived session credential. Integrity alone never replaces readEditContext reauthorization. */
export function createContext(
  req: PayloadRequest,
  target: EditorTarget,
  ttl = 900000,
  pagePath?: string,
  pageOwner?: import("../types.js").EditorTarget,
): EditContext {
  if (!req.user || !currentSession(req))
    throw new Error("Session-backed authentication required");
  const locale = contentLocale(req);
  return {
    target,
    activatedAt: Date.now(),
    ...(locale ? { locale } : {}),
    ...(pagePath ? { pagePath } : {}),
    ...(pageOwner && pagePath ? { pageOwner } : {}),
    user: `${req.user.collection}:${req.user.id}`,
    session: currentSession(req),
    expires: Date.now() + Math.min(ttl, 900000),
    nonce: randomBytes(24).toString("base64url"),
  };
}

/** Recheck active session and authorization on every protected server read. */
export async function readEditContext(
  req: PayloadRequest,
  token: string,
  options: VisualEditorOptions,
) {
  if (options.disabled) throw new APIError("Visual editor is disabled", 403);
  const context = verifyContext(token, req.payload.secret);
  if (
    !context ||
    !req.user ||
    context.user !== `${req.user.collection}:${req.user.id}` ||
    context.session !== currentSession(req) ||
    context.locale !== contentLocale(req)
  )
    throw new APIError("Editor session expired", 403);
  const document = await authorizeTarget(req, context.target, options);
  const pageDocument =
    context.pageOwner &&
    documentKey(context.pageOwner) !== documentKey(context.target)
      ? await authorizeTarget(req, context.pageOwner, options)
      : document;
  if (context.pageOwner) {
    const scopes = await configuredPageScopes(
      req,
      context,
      pageDocument,
      options,
    );
    if (
      !scopes.some(
        (scope) => documentKey(scope.target) === documentKey(context.target),
      )
    )
      throw new APIError(
        "This document is no longer an allowed page scope",
        403,
      );
  }
  return { context, document, pageDocument };
}
