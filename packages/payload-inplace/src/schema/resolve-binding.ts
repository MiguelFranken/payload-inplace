import type { ClientField } from "payload";
import { getFieldPaths } from "payload/shared";

/** A renderer path resolves against current native values, never a cached array index.
 * Data paths address FormState; schema paths omit array selectors for RenderFields.
 */
export interface ResolvedBinding {
  field: ClientField;
  path: string;
  schemaPath: string;
  /** Permission keys omit unnamed schema wrappers and row selectors. */
  permissionPath: string;
  parentPath: string;
  parentSchemaPath: string;
  siblings: ClientField[];
  permissions: any;
  readOnly: boolean;
  /** Row targets mount children directly, without mounting the containing array control. */
  row?: { fields: ClientField[]; permissions: any };
}

function entry(
  fields: ClientField[],
  name: string,
  parentPath: string,
  parentSchemaPath: string,
  parentIndexPath = "",
):
  | {
      field: ClientField;
      path: string;
      schemaPath: string;
      parentPath: string;
      parentSchemaPath: string;
      siblings: ClientField[];
    }
  | undefined {
  for (const [index, field] of fields.entries()) {
    const paths = getFieldPaths({
      field,
      index,
      parentPath,
      parentSchemaPath,
      parentIndexPath,
    });
    if (field.type === "tabs") {
      for (const [tabIndex, tab] of field.tabs.entries()) {
        if ("name" in tab) {
          const group = { ...tab, type: "group" } as ClientField;
          if (tab.name === name)
            return {
              field: group,
              ...getFieldPaths({
                field: tab,
                index: tabIndex,
                parentPath: paths.path,
                parentSchemaPath: paths.schemaPath,
                parentIndexPath: paths.indexPath,
              }),
              parentPath,
              parentSchemaPath: paths.schemaPath,
              siblings: fields,
            };
        } else {
          const tabPaths = getFieldPaths({
            field: tab,
            index: tabIndex,
            parentPath: paths.path,
            parentSchemaPath: paths.schemaPath,
            parentIndexPath: paths.indexPath,
          });
          const found = entry(
            tab.fields,
            name,
            tabPaths.path,
            tabPaths.schemaPath,
            tabPaths.indexPath,
          );
          if (found) return found;
        }
      }
    } else if ("name" in field) {
      if (field.name === name)
        return {
          field,
          ...paths,
          parentPath: paths.path.slice(
            0,
            -(field.name.length + (paths.path.includes(".") ? 1 : 0)),
          ),
          parentSchemaPath,
          siblings: fields,
        };
    } else if ("fields" in field) {
      const found = entry(
        field.fields,
        name,
        paths.path,
        paths.schemaPath,
        paths.indexPath,
      );
      if (found) return found;
    }
  }
}

/** Resolve dotted fields and array rows (`chapters.@encoded-id.text` or `chapters.0.text`).
 * IDs are preferred: they survive reorder and ambiguous/deleted rows fail closed. Never traverse
 * relationship values, JSON or rich-text internals. Bindings cannot widen native field access.
 */
export function resolveBinding({
  fields,
  value,
  binding,
  permissions,
}: {
  fields: ClientField[];
  value: any;
  binding: string;
  permissions?: any;
}): ResolvedBinding | undefined {
  const parts = binding.split(".");
  if (
    !binding ||
    parts.some(
      (part) =>
        !part || ["__proto__", "constructor", "prototype"].includes(part),
    )
  )
    return;
  let dataPath = "",
    schemaPath = "",
    locked = false;
  const permissionParts: string[] = [];
  for (let cursor = 0; cursor < parts.length; cursor++) {
    const found = entry(fields, parts[cursor], dataPath, schemaPath);
    const field = found?.field;
    if (!found || !field || !("name" in field) || field.admin?.hidden) return;
    const own = permissions === true ? true : permissions?.[field.name];
    if (own === false || own?.read === false) return;
    locked ||= field.admin?.readOnly === true || own?.update === false;
    permissionParts.push(field.name);
    dataPath = found.path;
    schemaPath = found.schemaPath;
    const result: ResolvedBinding = {
      ...found,
      permissionPath: permissionParts.join("."),
      permissions,
      readOnly: locked,
    };
    if (cursor === parts.length - 1) return result;
    value = value?.[field.name];
    permissions = own === true ? true : own?.fields;
    if (field.type === "array") {
      const selector = parts[++cursor];
      if (!Array.isArray(value) || !selector) return;
      let index: number;
      if (selector.startsWith("@")) {
        let id: string;
        try {
          id = decodeURIComponent(selector.slice(1));
        } catch {
          return;
        }
        if (!id) return;
        const matches = value.flatMap((row: any, i: number) =>
          row?.id != null && String(row.id) === id ? [i] : [],
        );
        if (matches.length !== 1) return;
        index = matches[0];
      } else {
        if (!/^(0|[1-9]\d*)$/.test(selector)) return;
        index = Number(selector);
        if (!Number.isSafeInteger(index) || index >= value.length) return;
      }
      dataPath += `.${index}`;
      value = value[index];
      if (cursor === parts.length - 1)
        return {
          ...result,
          path: dataPath,
          row: { fields: field.fields, permissions },
        };
      fields = field.fields;
    } else if (field.type === "group") {
      fields = field.fields;
    } else return;
  }
}
