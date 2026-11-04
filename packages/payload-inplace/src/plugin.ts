import { prepareVersionRestore, versionEndpoint } from "./server/versions.js";
import { trustedEditorOrigins } from "./server/origins.js";
import { readEditorCookie, validatePagePath } from "./server/page-context.js";
import type {
  Config,
  Plugin,
  EditConfig,
  CollectionBeforeChangeHook,
} from "payload";
import type { VisualEditorOptions } from "./types.js";
import { resolveTools } from "./server/tools.js";
import { cloneFields } from "./schema/clone.js";
import { resolveRoot } from "./schema/resolve.js";
import { structureError } from "./state/policy.js";
import { candidateMatches, signReview } from "./server/review.js";
import { revisionGuard, assignRevision, REVISION } from "./server/revision.js";
import {
  authorizeTarget,
  createContext,
  signContext,
  verifyContext,
  readEditContext,
} from "./server/context.js";

/** Compose opt-in roots without replacing native persistence, existing hooks or unrelated controls. */
export function visualEditor(options: VisualEditorOptions): Plugin {
  const trustedOrigins = trustedEditorOrigins(options);
  const ids = new Set<string>();
  for (const extension of [
    ...(options.extensions || []),
    ...(options.fieldPanels || []),
    ...(options.strategyProviders || []),
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
    const collections = (config.collections ?? []).map((collection) => {
      const setting = options.collections[collection.slug];
      if (!setting) return collection;
      if (
        typeof collection.versions !== "object" ||
        !collection.versions.drafts
      )
        throw new Error(
          `Visual editing requires native drafts on ${collection.slug}`,
        );
      for (const path of options.operationalWrites?.[collection.slug]?.paths ||
        []) {
        if (
          !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/.test(path) ||
          path
            .split(".")
            .some((part) =>
              ["constructor", "prototype", "__proto__"].includes(part),
            ) ||
          setting.roots.some(
            (root) =>
              path === root ||
              path.startsWith(root + ".") ||
              root.startsWith(path + "."),
          )
        )
          throw new Error(
            "Operational write paths must be safe named fields outside visual roots",
          );
      }
      const fields = cloneFields(collection.fields);
      const validatePolicy: CollectionBeforeChangeHook = ({
        data,
        originalDoc,
      }) => {
        if ((data._status ?? originalDoc?._status) !== "published") return data;
        for (const root of setting.roots) {
          const candidate = root
            .split(".")
            .reduce(
              (value, key) => (value === null ? null : value?.[key]),
              data,
            );
          const previous = root
            .split(".")
            .reduce((value, key) => value?.[key], originalDoc);
          const rows = (candidate === undefined ? previous : candidate) ?? [];
          const error = structureError(
            Array.isArray(rows) ? rows : [],
            options.policies?.[collection.slug]?.[root],
          );
          if (error) throw new Error(error);
        }
        return data;
      };
      if (!options.disabled)
        for (const root of setting.roots) {
          const field = resolveRoot(fields, root);
          if (field.admin?.components?.Field) continue;
          field.admin = {
            ...field.admin,
            components: {
              ...field.admin?.components,
              Field: {
                path: "payload-inplace/client#VisualBlocksField",
                clientProps: {
                  root,
                  policy: options.policies?.[collection.slug]?.[root],
                  previewPath: options.previewPath ?? "/visual-editor/preview",
                  editorPath,
                },
              },
            },
          };
        }
      fields.push({
        name: "_veActivation",
        type: "text",
        virtual: true,
        admin: { hidden: true },
        access: { read: () => false },
      });
      fields.push({
        name: "_veRestoreVersion",
        type: "text",
        virtual: true,
        admin: { hidden: true },
        access: { read: () => false },
      });
      const guardActivation: import("payload").CollectionBeforeOperationHook =
        async ({ args, req, operation }) => {
          const proof = (args as any).data?._veActivation;
          if (
            operation === "update" &&
            (args as { data?: Record<string, unknown> }).data
              ?._veRestoreVersion !== undefined &&
            (typeof proof !== "string" || !proof)
          )
            throw new Error("Restore needs an active editor session");
          if (proof && operation === "update") {
            const { context } = await readEditContext(req, proof, options);
            if (
              context.target.collection !== collection.slug ||
              String(context.target.id) !== String((args as any).id)
            )
              throw new Error("Visual editor target mismatch");
            const intent = (args as { data?: Record<string, unknown> }).data
              ?._veRestoreVersion;
            if (intent !== undefined) {
              if (
                typeof intent !== "string" ||
                !intent ||
                intent.length > 128 ||
                !(args as { draft?: boolean }).draft
              )
                throw new Error("Restore must create a reviewed draft");
              (args as { data: Record<string, unknown> }).data =
                await prepareVersionRestore(
                  req,
                  proof,
                  intent,
                  (args as { data?: Record<string, unknown> }).data
                    ?._veRevision,
                  options,
                );
            }
          }
          return args;
        };
      if (options.concurrency) {
        if (fields.some((f) => "name" in f && f.name === REVISION))
          throw new Error(
            "Reserved visual editor revision field already exists",
          );
        fields.push({
          name: REVISION,
          type: "number",
          defaultValue: 0,
          access: { read: ({ req }) => Boolean(req.user) },
          admin: {
            components: {
              Field: "payload-inplace/client#RevisionField",
            },
          },
        });
      }
      if (
        options.concurrency &&
        collection.admin?.components?.views?.edit?.version?.Component
      )
        throw new Error(
          "Revision protection requires the supported guarded version view; an existing custom version view needs an explicit adapter",
        );
      const admin = options.concurrency
        ? {
            ...collection.admin,
            custom: {
              ...collection.admin?.custom,
              visualEditorRoots: setting.roots,
            },
            components: {
              ...collection.admin?.components,
              views: {
                ...collection.admin?.components?.views,
                edit: {
                  ...collection.admin?.components?.views?.edit,
                  version: {
                    Component: "payload-inplace/rsc#GuardedVersionView",
                  },
                } as EditConfig,
              },
              edit: {
                ...collection.admin?.components?.edit,
                PublishButton:
                  collection.admin?.components?.edit?.PublishButton ??
                  "payload-inplace/client#ReviewPublishButton",
              },
            },
          }
        : collection.admin;
      return {
        ...collection,
        admin,
        fields,
        hooks: options.concurrency
          ? {
              ...collection.hooks,
              beforeOperation: [
                guardActivation,
                revisionGuard(
                  collection.slug,
                  options.concurrency,
                  options.operationalWrites?.[collection.slug],
                ),
                ...(collection.hooks?.beforeOperation ?? []),
              ],
              beforeChange: [
                ...(collection.hooks?.beforeChange ?? []),
                validatePolicy,
                assignRevision,
              ],
            }
          : {
              ...collection.hooks,
              beforeOperation: [
                guardActivation,
                ...(collection.hooks?.beforeOperation ?? []),
              ],
              beforeChange: [
                ...(collection.hooks?.beforeChange ?? []),
                validatePolicy,
              ],
            },
      };
    });
    return {
      ...config,
      collections,
      admin: {
        ...config.admin,
        dependencies: {
          ...config.admin?.dependencies,
          ...Object.fromEntries(
            (options.strategyProviders || []).map((provider) => {
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
        {
          path: "/visual-editor/versions",
          method: "post",
          handler: (req) => versionEndpoint(req, options, trustedOrigins),
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
              const target = nativeForm
                ? {
                    collection: values?.get("collection"),
                    id: values?.get("id"),
                    root: values?.get("root"),
                  }
                : await req.json?.();
              if (
                !target ||
                typeof target.collection !== "string" ||
                !["string", "number"].includes(typeof target.id) ||
                typeof target.root !== "string"
              )
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
            return new Response(null, {
              status: 204,
              headers: {
                ...headers,
                "Set-Cookie": `payload-ve-${input.nonce}=; HttpOnly; SameSite=Strict; Path=${active?.pagePath ? "/" : editorPath}; Max-Age=0${req.headers.get("origin")?.startsWith("https:") ? "; Secure" : ""}`,
              },
            });
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
              const draft = await authorizeTarget(req, input.target, options, {
                requireVisualCapability: false,
              });
              if (!candidateMatches(input.candidate, draft))
                return Response.json(
                  { error: "Save your latest changes before review." },
                  { status: 409, headers },
                );
              let published = null;
              try {
                published = await req.payload.findByID({
                  collection: input.target.collection,
                  id: input.target.id,
                  draft: false,
                  depth: 0,
                  overrideAccess: false,
                  req,
                });
                if ((published as any)?._status !== "published")
                  published = null;
              } catch (error) {
                if ((error as { status?: number }).status !== 404) throw error;
              }
              const token = signReview(
                req,
                input.target.collection,
                input.target.id,
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
