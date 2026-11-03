"use client";
import {
  createContext,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Button,
  RenderFields,
  useConfig,
  useDocumentInfo,
  useForm,
} from "@payloadcms/ui";
import { useVisualEditor } from "./tools-context.js";
import { collectSections } from "../schema/tree.js";
import { resolveRoot } from "../schema/resolve.js";
import type { ClientBlock, ClientField } from "payload";

type Claim = {
  id: string;
  paths: string[];
  activate?: () => void;
  element: React.RefObject<HTMLDivElement | null>;
};
const Context = createContext<{
  claims: Claim[];
  claim: (claim: Claim) => void;
  release: (id: string) => void;
}>(null!);
const overlap = (a: string, b: string) =>
  a === b || a.startsWith(b + ".") || b.startsWith(a + ".");
/** Native field ownership is scoped to this one form. A second panel waits instead of mounting duplicate controls. */
export function FieldOwnershipProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const claim = useCallback(
    (candidate: Claim) =>
      setClaims((current) =>
        current.some(
          (owner) =>
            owner.id === candidate.id ||
            owner.paths.some((a) => candidate.paths.some((b) => overlap(a, b))),
        )
          ? current
          : [...current, candidate],
      ),
    [],
  );
  const release = useCallback(
    (id: string) =>
      setClaims((current) => current.filter((claim) => claim.id !== id)),
    [],
  );
  return (
    <Context
      value={useMemo(
        () => ({ claims, claim, release }),
        [claims, claim, release],
      )}
    >
      {children}
    </Context>
  );
}
/** Claims a native form subtree before mounting fields. Ancestor/descendant paths are mutually exclusive. */
export function NativeFieldsOwner({
  path,
  paths,
  activate,
  children,
}: {
  path?: string;
  paths?: string[];
  activate?: () => void;
  children: ReactNode;
}) {
  const registry = use(Context),
    id = useId(),
    element = useRef<HTMLDivElement>(null);
  if (!registry)
    throw new Error("Native field slots require the editor's native Form");
  const key = JSON.stringify(paths || (path ? [path] : []));
  const ownedPaths = useMemo(() => JSON.parse(key) as string[], [key]);
  const owner = registry.claims.find((owner) =>
    owner.paths.some((a) => ownedPaths.some((b) => overlap(a, b))),
  );
  useLayoutEffect(() => {
    registry.claim({ id, paths: ownedPaths, element, activate });
    return () => registry.release(id);
  }, [id, ownedPaths, registry.claim, registry.release]);
  useLayoutEffect(() => {
    if (!owner) registry.claim({ id, paths: ownedPaths, element, activate });
  }, [owner, ownedPaths, id, registry.claim]);
  return (
    <div ref={element} tabIndex={-1}>
      {!ownedPaths.length || owner?.id === id ? (
        children
      ) : owner ? (
        <div className="pve:grid pve:gap-3">
          <p className="pve:m-0 pve:text-sm pve:leading-relaxed">
            This field is already open in another panel.
          </p>
          <Button
            type="button"
            buttonStyle="secondary"
            onClick={() =>
              owner.activate
                ? owner.activate()
                : (
                    owner.element.current?.querySelector<HTMLElement>(
                      "input,textarea,button,[contenteditable]",
                    ) || owner.element.current
                  )?.focus()
            }
          >
            Go to open field
          </Button>
        </div>
      ) : null}
    </div>
  );
}
/** Mount an existing named native field in a consumer floatable, preserving schema paths, conditions and effective permissions.
 * Full document paths may traverse groups, tabs, arrays and native block rows. Selection-relative paths resolve against the current block identity.
 */
export function NativeFieldSlot({
  path,
  scope = "document",
  blockTypes,
}: {
  path: string;
  scope?: "document" | "selection";
  blockTypes?: string[];
}) {
  const info = useDocumentInfo(),
    { config } = useConfig(),
    form = useForm();
  const editor = useVisualEditor();
  if (scope === "selection") {
    if (!editor.selection)
      return <p>Select a section on the page to edit these options.</p>;
    const root = resolveRoot(info.docConfig?.fields as any, editor.target.root);
    const permissions = editor.target.root
      .split(".")
      .reduce((p: any, key) => p?.fields?.[key], info.docPermissions);
    const section = collectSections({
      field: root as any,
      data: form.getDataByPath(editor.target.root),
      root: editor.target.root,
      schemaPath: `${editor.target.collection}.${editor.target.root}`,
      permissions,
      blocksMap: config.blocksMap as any,
    }).find(
      (s) =>
        s.identity.blockId === editor.selection?.blockId &&
        JSON.stringify(s.identity.ancestors) ===
          JSON.stringify(editor.selection?.ancestors || []),
    );
    if (!section)
      return <p>The selected section is unavailable. Choose it again.</p>;
    if (blockTypes?.length && !blockTypes.includes(section.block?.slug || ""))
      return (
        <p>
          These options are available for {blockTypes.join(", ")} sections.
          Select a matching section on the page.
        </p>
      );
    path = `${section.path}.${path}`;
  }
  const parts = path.split(".");
  if (
    parts.some(
      (part) =>
        !/^(?:[a-zA-Z_][a-zA-Z0-9_-]*|0|[1-9][0-9]*)$/.test(part) ||
        ["__proto__", "constructor", "prototype"].includes(part),
    )
  )
    throw new Error("Use an existing named native field path");
  function find(
    fields: ClientField[],
    remaining: string[],
    prefix: string,
    schema: string,
    permissions: any,
  ):
    | {
        field: ClientField;
        parent: string;
        schemaParent: string;
        permissions: any;
      }
    | undefined {
    for (const field of fields) {
      if (field.type === "tabs") {
        for (const tab of field.tabs) {
          const name = "name" in tab ? tab.name : undefined;
          const tp = !name
            ? permissions
            : permissions === true || permissions?.[name] === true
              ? true
              : permissions?.[name]?.fields;
          const hit = name
            ? name === remaining[0]
              ? find(
                  tab.fields,
                  remaining.slice(1),
                  [prefix, name].filter(Boolean).join("."),
                  `${schema}.${name}`,
                  tp,
                )
              : undefined
            : find(tab.fields, remaining, prefix, schema, permissions);
          if (hit) return hit;
        }
      } else if (!("name" in field)) {
        if ("fields" in field) {
          const hit = find(
            field.fields,
            remaining,
            prefix,
            schema,
            permissions,
          );
          if (hit) return hit;
        }
      } else if (field.name === remaining[0]) {
        if (remaining.length === 1)
          return { field, parent: prefix, schemaParent: schema, permissions };
        const fp = permissions === true ? true : permissions?.[field.name],
          container = [prefix, field.name].filter(Boolean).join("."),
          fieldSchema = `${schema}.${field.name}`;
        if (field.type === "group")
          return find(
            field.fields,
            remaining.slice(1),
            container,
            fieldSchema,
            fp === true ? true : fp?.fields,
          );
        if (
          (field.type === "array" || field.type === "blocks") &&
          /^[0-9]+$/.test(remaining[1] || "")
        ) {
          const rowPath = `${container}.${remaining[1]}`;
          if (field.type === "array")
            return find(
              field.fields,
              remaining.slice(2),
              rowPath,
              fieldSchema,
              fp === true ? true : fp?.fields,
            );
          const row = form.getDataByPath<any>(rowPath);
          const block = (field.blockReferences || field.blocks)
            .map((b) =>
              typeof b === "string"
                ? (config.blocksMap as Record<string, ClientBlock>)?.[b]
                : b,
            )
            .find((b) => b?.slug === row?.blockType);
          if (block) {
            const bp = fp === true ? true : fp?.blocks?.[block.slug];
            return find(
              block.fields,
              remaining.slice(2),
              rowPath,
              `${fieldSchema}.${block.slug}`,
              bp === true ? true : bp?.fields,
            );
          }
        }
      }
    }
  }

  const hit = find(
    info.docConfig?.fields || [],
    parts,
    "",
    info.collectionSlug || "",
    info.docPermissions?.fields,
  );
  if (!hit || ("admin" in hit.field && hit.field.admin?.hidden))
    return <p>This field is unavailable for your account.</p>;
  return (
    <NativeFieldsOwner path={path}>
      <RenderFields
        fields={[hit.field]}
        parentPath={hit.parent}
        parentSchemaPath={hit.schemaParent}
        parentIndexPath=""
        permissions={hit.permissions}
        readOnly={form.disabled || !info.hasSavePermission}
        forceRender
      />
    </NativeFieldsOwner>
  );
}
