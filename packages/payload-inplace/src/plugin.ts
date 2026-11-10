import { patternEndpoint } from "./server/patterns";
import { scopeEndpoint } from "./server/scopes";
import { configureGlobals } from "./server/globals";
import { readNativeDocument } from "./server/document";
import { parseEditorTarget } from "./state/document-target";
import { advisoryLockEndpoint } from "./server/advisory-lock";
import { latestDraftEndpoint } from "./server/reconcile";
import { versionEndpoint } from "./server/versions";
import { sectionComparisonEndpoint } from "./server/section-comparison";
import { trustedEditorOrigins } from "./server/origins";
import { readEditorCookie, validatePagePath } from "./server/page-context";
import type { Config, Plugin } from "payload";
import type { VisualEditorOptions } from "./types";
import { resolveTools } from "./server/tools";
import { configureCollections } from "./server/collections";
import { candidateMatches, signDocumentReview } from "./server/review";
import {
  authorizeTarget,
  currentSession,
  createContext,
  signContext,
  verifyContext,
  readEditContext,
} from "./server/context";

/** Compose opt-in roots without replacing native persistence, existing hooks or unrelated controls. */
export function visualEditor(options: VisualEditorOptions): Plugin {
  const trustedOrigins = trustedEditorOrigins(options);
  const ids = new Set<string>();
  for (const extension of [
    ...(options.extensions || []),
    ...(options.fieldPanels || []),
    ...(options.strategyProviders || []),
    ...(options.providers || []),
  ]) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(extension.id) || ids.has(extension.id))
      throw new Error("Editor extensions need unique lowercase IDs");
    ids.add(extension.id);
    if (
      "width" in extension &&
      extension.width !== undefined &&
      (!Number.isFinite(extension.width) ||
        extension.width < 240 ||
        extension.width > 800)
    )
      throw new Error("Panel width must be between 240 and 800 pixels");
  }
  const editorPath = options.editorPath ?? "/visual-editor";
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(editorPath) || editorPath.startsWith("//"))
    throw new Error("Use a same-origin protected editor path");
  return (config: Config): Config => {
    if (options.disabled && !options.concurrency) return config;
    return {
      ...config,
      collections: configureCollections(
        config.collections ?? [],
        options,
        editorPath,
      ),
      globals: configureGlobals(config.globals || [], options),
      admin: {
        ...config.admin,
        dependencies: {
          ...config.admin?.dependencies,
          ...Object.fromEntries(
            [
              ...(options.strategyProviders || []),
              ...(options.providers || []),
            ].map((provider) => {
              const component = provider.Component;
              if (!component)
                throw new Error("A strategy provider needs a component");
              const path =
                typeof component === "string"
                  ? component
                  : `${component.path}#${component.exportName || "default"}`;
              return [
                `visual-editor.strategy.${provider.id}`,
                { type: "component" as const, path },
              ];
            }),
          ),
          ...Object.fromEntries(
            (options.extensions || [])
              .filter(
                (extension) =>
                  extension.kind === "panel" || extension.kind === "control",
              )
              .map((extension) => {
                const component = extension.Component;
                if (!component)
                  throw new Error("A custom panel needs a component path");
                const path =
                  typeof component === "string"
                    ? component
                    : `${component.path}#${component.exportName || "default"}`;
                return [
                  `visual-editor.${extension.id}`,
                  { type: "component" as const, path },
                ];
              }),
          ),
        },
      },
      endpoints: [
        ...(config.endpoints ?? []),
        ...(options.patterns && !options.disabled
          ? [
              {
                path: "/visual-editor/patterns",
                method: "post" as const,
                handler: (req: import("payload").PayloadRequest) =>
                  patternEndpoint(req, options, trustedOrigins),
              },
            ]
          : []),
        ...(options.pageScopes && !options.disabled
          ? [
              {
                path: "/visual-editor/scope",
                method: "post" as const,
                handler: (req: import("payload").PayloadRequest) =>
                  scopeEndpoint(req, options, trustedOrigins),
              },
            ]
          : []),
        {
          path: "/visual-editor/lock",
          method: "post",
          handler: (req) => advisoryLockEndpoint(req, options, trustedOrigins),
        },
        {
          path: "/visual-editor/latest",
          method: "post",
          handler: (req) => latestDraftEndpoint(req, options, trustedOrigins),
        },
        {
          path: "/visual-editor/versions",
          method: "post",
          handler: (req) => versionEndpoint(req, options, trustedOrigins),
        },
        {
          path: "/visual-editor/section-comparison",
          method: "post",
          handler: (req) =>
            sectionComparisonEndpoint(req, options, trustedOrigins),
        },
        {
          path: "/visual-editor/action",
          method: "post",
          handler: async (req) => {
            const headers = {
              "Cache-Control": "private, no-store",
              Vary: "Cookie",
            };
            if (!trustedOrigins.has(req.headers.get("origin") || ""))
              return Response.json(
                { error: "Invalid origin" },
                { status: 403, headers },
              );
            try {
              const input = await req.json?.();
              if (
                !input ||
                JSON.stringify(input).length > 65536 ||
                typeof input.proof !== "string" ||
                (input.subject !== undefined &&
                  (typeof input.subject !== "string" ||
                    input.subject.length > 128))
              )
                return Response.json(
                  { error: "Invalid action input" },
                  { status: 400, headers },
                );
              const { context, document } = await readEditContext(
                req,
                input.proof,
                options,
              );
              const available = await resolveTools(options, {
                req,
                target: context.target,
                document,
              });
              const action = available.extensions.find(
                (extension) =>
                  extension.id === input.action && extension.kind === "action",
              );
              if (!action || action.kind !== "action")
                return Response.json(
                  { error: "Action unavailable" },
                  { status: 403, headers },
                );
              if (
                action.requireSaved !== false &&
                input.expectedRevision !==
                  (document._veRevision ?? document.updatedAt)
              )
                return Response.json(
                  {
                    error:
                      "The saved document changed. Review the latest draft before running this action.",
                  },
                  { status: 409, headers },
                );
              const result = await action.run({
                req,
                target: context.target,
                document,
                input: input.input,
                subject: input.subject,
              });
              return Response.json(
                {
                  message: String(result.message),
                  refresh: result.refresh === true,
                },
                { headers },
              );
            } catch {
              return Response.json(
                { error: "Action failed. Check access and retry." },
                { status: 403, headers },
              );
            }
          },
        },
        {
          path: "/visual-editor/activate",
          method: "post",
          handler: async (req) => {
            const headers = {
              "Cache-Control": "private, no-store",
              Vary: "Cookie",
              "X-Content-Type-Options": "nosniff",
            };
            if (
              options.disabled ||
              !trustedOrigins.has(req.headers.get("origin") || "")
            )
              return Response.json(
                { error: "Invalid origin" },
                { status: 403, headers },
              );
            try {
              const nativeForm = req.headers
                .get("content-type")
                ?.startsWith("application/x-www-form-urlencoded");
              const values = nativeForm ? await req.formData?.() : undefined;
              const rawTarget = nativeForm
                ? {
                    ...(values?.get("kind") === "global"
                      ? { kind: "global", global: values.get("global") }
                      : {
                          collection: values?.get("collection"),
                          id: values?.get("id"),
                        }),
                    root: values?.get("root"),
                  }
                : await req.json?.();
              const target = parseEditorTarget(rawTarget);
              if (!target)
                return Response.json(
                  { error: "Invalid target" },
                  { status: 400, headers },
                );
              const document = await authorizeTarget(req, target, options);
              const resolvedPagePath = await options.resolvePagePath?.({
                req,
                target,
                document,
              });
              const pagePath =
                resolvedPagePath === undefined
                  ? undefined
                  : validatePagePath(
                      resolvedPagePath,
                      req.headers.get("origin")!,
                    );
              const context = createContext(
                req,
                target,
                options.sessionTTL,
                pagePath,
              );
              const token = signContext(context, req.payload.secret);
              const cookie = `payload-ve-${context.nonce}=${token}; HttpOnly; SameSite=Strict; Path=${pagePath ? "/" : editorPath}; Max-Age=${Math.floor((context.expires - Date.now()) / 1000)}${req.headers.get("origin")?.startsWith("https:") ? "; Secure" : ""}`;
              if (nativeForm) {
                const requested = String(values?.get("tool") || "content");
                const available = await resolveTools(options, {
                  req,
                  target,
                  document,
                });
                const allowed = [
                  ...available.tools.filter(
                    (tool) => tool === "content" || tool === "sections",
                  ),
                  ...available.fieldPanels.map((panel) => `panel:${panel.id}`),
                  ...available.extensions
                    .filter((tool) => tool.kind === "panel")
                    .map((panel) => `panel:${panel.id}`),
                ];
                const tool = allowed.includes(requested)
                  ? requested
                  : allowed[0] || "";
                return new Response(null, {
                  status: 303,
                  headers: {
                    ...headers,
                    "Set-Cookie": cookie,
                    Location:
                      pagePath ||
                      `${editorPath}?context=${encodeURIComponent(context.nonce)}&tool=${encodeURIComponent(tool)}`,
                  },
                });
              }
              return Response.json(
                {
                  context: {
                    nonce: context.nonce,
                    target: context.target,
                    ...(context.locale ? { locale: context.locale } : {}),
                    expires: context.expires,
                    ...(pagePath ? { pagePath } : {}),
                  },
                },
                {
                  headers: {
                    ...headers,
                    "Set-Cookie": cookie,
                  },
                },
              );
            } catch {
              return Response.json(
                { error: "Editor access denied or target unavailable" },
                { status: 403, headers },
              );
            }
          },
        },
        {
          path: "/visual-editor/deactivate",
          method: "post",
          handler: async (req) => {
            const headers = { "Cache-Control": "private, no-store" };
            if (
              !trustedOrigins.has(req.headers.get("origin") || "") ||
              !req.user
            )
              return Response.json(
                { error: "Invalid session" },
                { status: 403, headers },
              );
            const input = await req.json?.();
            if (
              typeof input?.nonce !== "string" ||
              !/^[a-zA-Z0-9_-]{32}$/.test(input.nonce)
            )
              return Response.json(
                { error: "Invalid context" },
                { status: 400, headers },
              );
            const active = verifyContext(
              readEditorCookie(req, input.nonce),
              req.payload.secret,
            );
            const response = new Response(null, {
              status: 204,
              headers: {
                ...headers,
                "Set-Cookie": `payload-ve-${input.nonce}=; HttpOnly; SameSite=Strict; Path=${active?.pagePath ? "/" : editorPath}; Max-Age=0${req.headers.get("origin")?.startsWith("https:") ? "; Secure" : ""}`,
              },
            });
            if (
              active?.pagePath &&
              active.user === `${req.user.collection}:${req.user.id}` &&
              active.session === currentSession(req)
            ) {
              for (const item of (req.headers.get("cookie") || "")
                .split(";")
                .slice(0, 64)) {
                const [name, ...parts] = item.trim().split("=");
                if (
                  !/^payload-ve-[a-zA-Z0-9_-]{32}$/.test(name || "") ||
                  name === `payload-ve-${input.nonce}`
                )
                  continue;
                const other = verifyContext(
                  parts.join("="),
                  req.payload.secret,
                );
                if (
                  other?.pagePath === active.pagePath &&
                  other.user === active.user &&
                  other.session === active.session
                )
                  response.headers.append(
                    "Set-Cookie",
                    `${name}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${req.headers.get("origin")?.startsWith("https:") ? "; Secure" : ""}`,
                  );
              }
            }
            return response;
          },
        },
        {
          path: "/visual-editor/review",
          method: "post",
          handler: async (req) => {
            const headers = {
              "Cache-Control": "private, no-store",
              Vary: "Cookie",
            };
            if (!trustedOrigins.has(req.headers.get("origin") || ""))
              return Response.json(
                { error: "Invalid origin" },
                { status: 403, headers },
              );
            try {
              const input = await req.json?.();
              if (
                !input?.target ||
                !input.candidate ||
                JSON.stringify(input.candidate).length > 1000000
              )
                return Response.json(
                  { error: "Invalid review" },
                  { status: 400, headers },
                );
              const target = parseEditorTarget(input.target);
              if (!target) throw Error("Invalid target");
              const draft = await authorizeTarget(req, target, options, {
                requireVisualCapability: false,
              });
              if (!candidateMatches(input.candidate, draft))
                return Response.json(
                  { error: "Save your latest changes before review." },
                  { status: 409, headers },
                );
              let published = null;
              try {
                published = await readNativeDocument(req, target, false);
                if ((published as any)?._status !== "published")
                  published = null;
              } catch (error) {
                if ((error as { status?: number }).status !== 404) throw error;
              }
              const token = signDocumentReview(
                req,
                target,
                draft._veRevision ?? 0,
                input.candidate,
              );
              return Response.json({ draft, published, token }, { headers });
            } catch {
              return Response.json(
                { error: "Review unavailable; reopen the current document." },
                { status: 403, headers },
              );
            }
          },
        },
      ],
    };
  };
}
