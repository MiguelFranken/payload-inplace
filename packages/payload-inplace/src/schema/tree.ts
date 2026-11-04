import type { BlocksFieldClientProps, ClientBlock, ClientField } from "payload";
import type { BlockIdentity } from "../types.js";

/** A schema-resolved section: numeric data paths are transient, schema paths contain block slugs instead of indices. */
export interface NativeSection {
  identity: BlockIdentity;
  path: string;
  schemaPath: string;
  parent: string;
  containerSchemaPath: string;
  index: number;
  depth: number;
  block?: ClientBlock;
  field: BlocksFieldClientProps["field"];
  permissions: any;
  readOnly: boolean;
  value: Record<string, any>;
}

/** Traverse only native block/array/group/tab schemas, never populated relationships, JSON or rich-text internals.
 * Ancestor row IDs scope repeated block IDs; denied/hidden branches remain in FormState but are not exposed here.
 */
export function collectSections({
  field,
  data,
  root,
  schemaPath = root,
  permissions = true,
  blocksMap = {},
  readOnly = false,
}: {
  field: BlocksFieldClientProps["field"];
  data: unknown;
  root: string;
  schemaPath?: string;
  permissions?: any;
  blocksMap?: Record<string, ClientBlock>;
  readOnly?: boolean;
}): NativeSection[] {
  const result: NativeSection[] = [];
  const references = (f: any): ClientBlock[] =>
    (f.blockReferences || f.blocks || [])
      .map((b: ClientBlock | string) =>
        typeof b === "string" ? blocksMap[b] : b,
      )
      .filter(Boolean);
  const fieldPermissions = (p: any, name: string) =>
    p === true ? true : p?.[name];
  const denied = (p: any) => p !== true && p?.read === false;
  const readonly = (p: any) => p !== true && p?.update === false;
  function visitFields(
    fields: ClientField[],
    value: any,
    path: string,
    schema: string,
    ancestors: string[],
    p: any,
    locked: boolean,
  ) {
    for (const f of fields) {
      if (f.type === "tabs") {
        for (const tab of f.tabs) {
          const name = "name" in tab ? tab.name : undefined;
          const tp = name ? fieldPermissions(p, name) : p;
          if (!denied(tp))
            visitFields(
              tab.fields,
              name ? value?.[name] : value,
              name ? `${path}.${name}` : path,
              name ? `${schema}.${name}` : schema,
              ancestors,
              name && tp !== true ? tp?.fields : tp,
              locked || readonly(tp),
            );
        }
      } else if (!("name" in f)) {
        if ("fields" in f)
          visitFields(f.fields, value, path, schema, ancestors, p, locked);
      } else {
        const fp = fieldPermissions(p, f.name);
        if (f.admin?.hidden || denied(fp)) continue;
        const nextPath = `${path}.${f.name}`,
          nextSchema = `${schema}.${f.name}`;
        const nextLock = locked || Boolean(f.admin?.readOnly) || readonly(fp);
        if (f.type === "blocks")
          visitBlocks(
            f,
            value?.[f.name],
            nextPath,
            nextSchema,
            ancestors,
            fp,
            nextLock,
          );
        else if (f.type === "array" && Array.isArray(value?.[f.name])) {
          const seen = new Set<string>();
          value[f.name].forEach((row: any, i: number) => {
            if (!row?.id || seen.has(String(row.id))) return;
            seen.add(String(row.id));
            visitFields(
              f.fields,
              row,
              `${nextPath}.${i}`,
              nextSchema,
              [...ancestors, String(row.id)],
              fp === true ? true : fp?.fields,
              nextLock,
            );
          });
        } else if (f.type === "group")
          visitFields(
            f.fields,
            value?.[f.name],
            nextPath,
            nextSchema,
            ancestors,
            fp === true ? true : fp?.fields,
            nextLock,
          );
      }
    }
  }
  function visitBlocks(
    f: any,
    value: any,
    path: string,
    schema: string,
    ancestors: string[],
    p: any,
    locked: boolean,
  ) {
    if (!Array.isArray(value) || denied(p)) return;
    const seen = new Set<string>(),
      available = references(f);
    for (const [index, row] of value.entries()) {
      if (!row?.id || seen.has(String(row.id)))
        throw new Error(`Missing or ambiguous section identity in ${path}`);
      seen.add(String(row.id));
      const block = available.find((b) => b.slug === row.blockType);
      const bp = p === true ? true : p?.blocks?.[row.blockType];
      const fields = bp === true ? true : bp?.fields;
      if (denied(bp)) continue;
      const section: NativeSection = {
        identity: { root, blockId: String(row.id), ancestors },
        path: `${path}.${index}`,
        schemaPath: `${schema}.${row.blockType}`,
        parent: path,
        containerSchemaPath: schema,
        index,
        depth: ancestors.length,
        block,
        field: f,
        permissions: fields,
        readOnly: locked || readonly(bp),
        value: row,
      };
      result.push(section);
      if (block)
        visitFields(
          block.fields,
          row,
          section.path,
          section.schemaPath,
          [...ancestors, String(row.id)],
          fields,
          section.readOnly,
        );
    }
  }
  visitBlocks(field, data, root, schemaPath, [], permissions, readOnly);
  return result;
}
