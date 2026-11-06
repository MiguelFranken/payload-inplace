import type { ClientBlock, ClientField } from "payload";

/** Project only declared readable fields for example presentation. Never used as native insertion data.
 * Unknown keys, hidden fields and denied subtrees are omitted; each nested row receives a new preview-only ID.
 */
export function previewExample(
  fields: ClientField[],
  example: unknown,
  permissions: unknown,
  blocksMap: Record<string, ClientBlock>,
  id: () => string = () => `ve-preview-${crypto.randomUUID()}`,
): Record<string, unknown> {
  const input =
    example && typeof example === "object"
      ? (example as Record<string, unknown>)
      : {};
  const result: Record<string, unknown> = {};
  const permission = (name: string) =>
    permissions === true
      ? true
      : permissions && typeof permissions === "object"
        ? (permissions as Record<string, unknown>)[name]
        : undefined;
  const children = (own: unknown) =>
    own === true
      ? true
      : own && typeof own === "object" && "fields" in own
        ? own.fields
        : undefined;
  for (const field of fields) {
    if (field.type === "tabs") {
      for (const tab of field.tabs) {
        if ("name" in tab)
          result[tab.name] = previewExample(
            tab.fields,
            input[tab.name],
            children(permission(tab.name)),
            blocksMap,
            id,
          );
        else
          Object.assign(
            result,
            previewExample(tab.fields, input, permissions, blocksMap, id),
          );
      }
      continue;
    }
    if (!("name" in field)) {
      if ("fields" in field)
        Object.assign(
          result,
          previewExample(field.fields, input, permissions, blocksMap, id),
        );
      continue;
    }
    const own = permission(field.name);
    if (
      field.admin?.hidden ||
      own === false ||
      (own && typeof own === "object" && "read" in own && own.read === false)
    )
      continue;
    if (!Object.hasOwn(input, field.name)) continue;
    const value = input[field.name];
    if (field.type === "group")
      result[field.name] = previewExample(
        field.fields,
        value,
        children(own),
        blocksMap,
        id,
      );
    else if (field.type === "array" && Array.isArray(value))
      result[field.name] = value.slice(0, field.maxRows ?? 100).map((row) => ({
        ...previewExample(field.fields, row, children(own), blocksMap, id),
        id: id(),
      }));
    else if (field.type === "blocks" && Array.isArray(value))
      result[field.name] = value.flatMap((row) => {
        if (
          !row ||
          typeof row !== "object" ||
          typeof row.blockType !== "string"
        )
          return [];
        const block = (field.blockReferences || field.blocks)
          .map((block) =>
            typeof block === "string" ? blocksMap[block] : block,
          )
          .find((block) => block?.slug === row.blockType);
        if (!block) return [];
        const blockPermissions =
          own === true
            ? true
            : own &&
                typeof own === "object" &&
                "blocks" in own &&
                own.blocks &&
                typeof own.blocks === "object"
              ? (own.blocks as Record<string, unknown>)[block.slug]
              : undefined;
        if (blockPermissions === false) return [];
        return [
          {
            ...previewExample(
              block.fields,
              row,
              children(blockPermissions),
              blocksMap,
              id,
            ),
            blockType: block.slug,
            id: id(),
          },
        ];
      });
    else result[field.name] = value;
  }
  return result;
}
