import {
  APIError,
  type GlobalConfig,
  type GlobalBeforeOperationHook,
  type GlobalBeforeChangeHook,
  type EditConfig,
} from "payload";
import type { VisualEditorOptions } from "../types.js";
import { cloneFields } from "../schema/clone.js";
import { resolveRoot } from "../schema/resolve.js";
import { structureError } from "../state/policy.js";
import { readEditContext } from "./context.js";
import { readNativeDocument } from "./document.js";
import { validateDocumentReview } from "./review.js";
import { prepareVersionRestore } from "./versions.js";

const revisionState = "payloadInplaceGlobalRevision";

/** Decorate only explicit draft-enabled globals, preserving native hooks/fields. There is no new collection or immediate-live autosave path. */
export function configureGlobals(
  globals: GlobalConfig[],
  options: VisualEditorOptions,
): GlobalConfig[] {
  if (
    Object.keys(options.globals || {}).length &&
    !options.concurrency &&
    !options.disabled
  )
    throw Error("Global editing requires a transactional concurrency adapter");
  for (const slug of Object.keys(options.globals || {}))
    if (!globals.some((global) => global.slug === slug))
      throw Error(`Unknown editor global: ${slug}`);
  return globals.map((global) => {
    const setting = options.globals?.[global.slug];
    if (!setting) return global;
    if (typeof global.versions !== "object" || !global.versions.drafts)
      throw Error(
        `Visual editing requires native drafts on global ${global.slug}`,
      );
    const fields = cloneFields(global.fields);
    for (const name of ["_veActivation", "_veRestoreVersion", "_veRevision"])
      if (fields.some((field) => "name" in field && field.name === name))
        throw Error(`Reserved editor field on global ${global.slug}`);
    for (const root of setting.roots) {
      const field = resolveRoot(fields, root);
      if (!options.disabled && !field.admin?.components?.Field)
        field.admin = {
          ...field.admin,
          components: {
            ...field.admin?.components,
            Field: {
              path: "payload-inplace/client#VisualBlocksField",
              clientProps: {
                root,
                policy: options.globalPolicies?.[global.slug]?.[root],
                editorPath: options.editorPath || "/visual-editor",
                previewPath: options.previewPath || "/visual-editor/preview",
              },
            },
          },
        };
    }
    fields.push(
      ...["_veActivation", "_veRestoreVersion"].map((name) => ({
        name,
        type: "text" as const,
        virtual: true,
        admin: { hidden: true },
        access: { read: () => false },
      })),
    );
    if (options.concurrency)
      fields.push({
        name: "_veRevision",
        type: "number",
        defaultValue: 0,
        access: { read: ({ req }) => Boolean(req.user) },
        admin: {
          components: { Field: "payload-inplace/client#RevisionField" },
        },
      });
    const beforeOperation: GlobalBeforeOperationHook = async ({
      args,
      operation,
      req,
      overrideAccess,
    }) => {
      if (operation === "restoreVersion") {
        // v3 global restore writes raw historical data without beforeChange hooks; it cannot advance our authoritative revision safely.
        throw new APIError(
          "Restore globals through the editor's saved-version timeline as a new native draft.",
          409,
        );
      }
      if (operation !== "update") return args;
      const target = {
        kind: "global" as const,
        global: global.slug,
        root: setting.roots[0]!,
      };
      const proof = args?.data?._veActivation;
      if (proof) {
        const { context } = await readEditContext(req, proof, options);
        if (
          context.target.kind !== "global" ||
          context.target.global !== global.slug
        )
          throw new APIError("Visual editor target mismatch", 403);
        if (args.data._veRestoreVersion !== undefined) {
          const intent = args.data._veRestoreVersion;
          if (
            typeof intent !== "string" ||
            !intent ||
            intent.length > 128 ||
            !args.draft
          )
            throw new APIError("Restore must create a native draft", 400);
          args.data = await prepareVersionRestore(
            req,
            proof,
            intent,
            args.data._veRevision,
            options,
          );
        }
      } else if (args?.data?._veRestoreVersion !== undefined)
        throw new APIError("Restore needs an active editor session", 403);
      if (!options.concurrency) return args;
      await options.concurrency.lock(
        req,
        JSON.stringify(["$global", global.slug]),
      );
      const system =
        !req.user &&
        overrideAccess === true &&
        req.context.visualEditorSystemWrite === true;
      const latest = system
        ? await req.payload.findGlobal({
            slug: global.slug as never,
            draft: true,
            depth: 0,
            req,
            overrideAccess: true,
            fallbackLocale: false,
          })
        : await readNativeDocument(req, target, true);
      const revision = latest._veRevision ?? 0;
      if (
        !system &&
        (!Number.isSafeInteger(args.data?._veRevision) ||
          args.data._veRevision !== revision)
      )
        throw new APIError(
          "This global changed in another editor. Keep your working copy and compare the latest draft.",
          409,
        );
      if (
        !system &&
        !args.draft &&
        args.data?._status !== "draft" &&
        !validateDocumentReview(
          req,
          args.data?._veReviewToken,
          target,
          revision,
          args.data,
        )
      )
        throw new APIError(
          "Save and review this global's current draft before publishing.",
          409,
        );
      const states = (req.context[revisionState] ??= {}) as Record<
        string,
        number
      >;
      states[global.slug] = revision + 1;
      args.data._veRevision = revision + 1;
      return args;
    };
    const beforeChange: GlobalBeforeChangeHook = ({
      data,
      originalDoc,
      req,
    }) => {
      if ((data._status ?? originalDoc?._status) === "published")
        for (const root of setting.roots) {
          const read = (source: Record<string, unknown> | undefined) =>
            root
              .split(".")
              .reduce<unknown>(
                (value, key) =>
                  value && typeof value === "object"
                    ? (value as Record<string, unknown>)[key]
                    : undefined,
                source,
              );
          const candidate = read(data);
          const value = candidate === undefined ? read(originalDoc) : candidate;
          const issue = structureError(
            Array.isArray(value) ? value : [],
            options.globalPolicies?.[global.slug]?.[root],
          );
          if (issue) throw new APIError(issue, 400);
        }
      if (options.concurrency) {
        const next = (
          req.context[revisionState] as Record<string, number> | undefined
        )?.[global.slug];
        if (!next)
          throw new APIError("Missing authoritative global revision", 409);
        data._veRevision = next;
      }
      return data;
    };
    if (
      options.concurrency &&
      global.admin?.components?.views?.edit?.version?.Component
    )
      throw Error(
        "Global revision protection requires the supported guarded version view",
      );
    return {
      ...global,
      fields,
      admin: {
        ...global.admin,
        custom: {
          ...global.admin?.custom,
          visualEditorRoots: setting.roots,
          visualEditorPath: options.editorPath || "/visual-editor",
        },
        components: {
          ...global.admin?.components,
          ...(options.concurrency
            ? {
                elements: {
                  ...global.admin?.components?.elements,
                  PublishButton:
                    global.admin?.components?.elements?.PublishButton ??
                    "payload-inplace/client#ReviewPublishButton",
                },
                views: {
                  ...global.admin?.components?.views,
                  edit: {
                    ...global.admin?.components?.views?.edit,
                    version: {
                      Component: "payload-inplace/rsc#GuardedVersionView",
                    },
                  } as EditConfig,
                },
              }
            : {}),
        },
      },
      hooks: {
        ...global.hooks,
        beforeOperation: [
          beforeOperation,
          ...(global.hooks?.beforeOperation || []),
        ],
        beforeChange: [...(global.hooks?.beforeChange || []), beforeChange],
      },
    };
  });
}
