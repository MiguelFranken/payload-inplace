import type {
  CollectionBeforeChangeHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
  EditConfig,
} from "payload";
import { cloneFields } from "../schema/clone";
import { resolveRoot } from "../schema/resolve";
import { structureError } from "../state/policy";
import type { VisualEditorOptions } from "../types";
import { readEditContext } from "./context";
import { assignRevision, revisionGuard, REVISION } from "./revision";
import { prepareVersionRestore } from "./versions";

/** Wire opted-in collections into Payload while preserving consumer fields and hook order. */
export function configureCollections(
  collections: CollectionConfig[],
  options: VisualEditorOptions,
  editorPath: string,
): CollectionConfig[] {
  return collections.map((collection) => {
    const setting = options.collections[collection.slug];
    if (!setting) return collection;
    if (typeof collection.versions !== "object" || !collection.versions.drafts)
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
          .reduce((value, key) => (value === null ? null : value?.[key]), data);
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
    const guardActivation: CollectionBeforeOperationHook = async ({
      args,
      req,
      operation,
    }) => {
      const proof = (args as any).data?._veActivation;
      if (
        operation === "update" &&
        (args as { data?: Record<string, unknown> }).data?._veRestoreVersion !==
          undefined &&
        (typeof proof !== "string" || !proof)
      )
        throw new Error("Restore needs an active editor session");
      if (proof && operation === "update") {
        const { context } = await readEditContext(req, proof, options);
        if (
          context.target.kind === "global" ||
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
              (args as { data?: Record<string, unknown> }).data?._veRevision,
              options,
            );
        }
      }
      return args;
    };
    if (options.concurrency) {
      if (fields.some((f) => "name" in f && f.name === REVISION))
        throw new Error("Reserved visual editor revision field already exists");
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
      : {
          ...collection.admin,
          custom: {
            ...collection.admin?.custom,
            visualEditorRoots: setting.roots,
          },
        };
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
}
