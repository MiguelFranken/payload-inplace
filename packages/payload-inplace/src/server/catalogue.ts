import type { ClientBlock, ClientField, BlocksFieldClientProps } from "payload";
import type { EditorCatalogueEntry } from "../types.js";
import { previewExample } from "../schema/example-preview.js";

const child = (permission: unknown, key: string): unknown =>
  permission === true
    ? true
    : permission && typeof permission === "object"
      ? (permission as Record<string, unknown>)[key]
      : undefined;

const denied = (permission: unknown) =>
  permission === false || child(permission, "read") === false;

/** Redact presentation examples before serializing them. The intersection across configured uses prevents a reused block from widening field visibility. */
export function projectCatalogue(
  catalogue: Record<string, EditorCatalogueEntry> | undefined,
  root: BlocksFieldClientProps["field"],
  permissions: unknown,
  blocksMap: Record<string, ClientBlock>,
): Record<string, EditorCatalogueEntry> {
  const result: Record<string, EditorCatalogueEntry> = {};
  const visited = new Set<ClientBlock>();
  function blocks(
    field: BlocksFieldClientProps["field"],
    permission: unknown,
    depth: number,
  ) {
    if (denied(permission) || depth > 24) return;
    for (const reference of field.blockReferences || field.blocks) {
      const block =
        typeof reference === "string" ? blocksMap[reference] : reference;
      if (!block) continue;
      const own = child(child(permission, "blocks"), block.slug);
      if (denied(own)) continue;
      const fieldsPermission = child(own, "fields"),
        entry = catalogue?.[block.slug];
      if (entry) {
        const previous = result[block.slug];
        result[block.slug] = {
          ...entry,
          ...(entry.example
            ? {
                example: previewExample(
                  block.fields,
                  previous?.example || entry.example,
                  fieldsPermission,
                  blocksMap,
                ),
              }
            : {}),
        };
      }
      if (!visited.has(block)) {
        visited.add(block);
        walk(block.fields, fieldsPermission, depth + 1);
      }
    }
  }
  function walk(fields: ClientField[], permission: unknown, depth: number) {
    for (const field of fields) {
      if (field.admin?.hidden) continue;
      if (field.type === "tabs") {
        for (const tab of field.tabs)
          walk(
            tab.fields,
            "name" in tab
              ? child(child(permission, tab.name), "fields")
              : permission,
            depth + 1,
          );
      } else if ("name" in field) {
        const own = child(permission, field.name);
        if (denied(own)) continue;
        if (field.type === "blocks") blocks(field, own, depth + 1);
        else if ("fields" in field)
          walk(field.fields, child(own, "fields"), depth + 1);
      } else if ("fields" in field) walk(field.fields, permission, depth + 1);
    }
  }
  blocks(root, permissions, 0);
  return result;
}
