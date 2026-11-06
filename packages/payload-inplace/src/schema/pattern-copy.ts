import type { ClientBlock, ClientField } from "payload";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const child = (permission: unknown, name: string): unknown =>
  permission === true ? true : record(permission)[name];

const children = (permission: unknown): unknown =>
  permission === true ? true : record(permission).fields;

const denied = (permission: unknown) =>
  permission === false ||
  record(permission).read === false ||
  record(permission).update === false;

const reference = (value: unknown): unknown => {
  if (typeof value === "string" || typeof value === "number" || value === null)
    return value;
  const item = record(value);
  if (typeof item.relationTo === "string")
    return { relationTo: item.relationTo, value: reference(item.value) };
  if (typeof item.id === "string" || typeof item.id === "number")
    return item.id;
  return undefined;
};

/** Copy declared, readable and writable native content only. Row identity is new; media/relationship references keep their native IDs. Unknown schema branches are discarded, never linked or synchronized. */
export function copyPatternFields(
  fields: ClientField[],
  value: unknown,
  permissions: unknown,
  blocks: Record<string, ClientBlock>,
  id: () => string = () => crypto.randomUUID().replaceAll("-", "").slice(0, 24),
  depth = 0,
): Record<string, unknown> {
  if (depth > 24)
    throw Error("Pattern nesting exceeds the supported schema depth");
  const source = record(value),
    result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "tabs") {
      for (const tab of field.tabs) {
        if ("name" in tab) {
          const own = child(permissions, tab.name);
          if (!denied(own))
            result[tab.name] = copyPatternFields(
              tab.fields,
              source[tab.name],
              children(own),
              blocks,
              id,
              depth + 1,
            );
        } else
          Object.assign(
            result,
            copyPatternFields(
              tab.fields,
              source,
              permissions,
              blocks,
              id,
              depth + 1,
            ),
          );
      }
      continue;
    }
    if (!("name" in field)) {
      if ("fields" in field)
        Object.assign(
          result,
          copyPatternFields(
            field.fields,
            source,
            permissions,
            blocks,
            id,
            depth + 1,
          ),
        );
      continue;
    }
    const own = child(permissions, field.name);
    if (
      ["id", "blockType"].includes(field.name) ||
      field.name.startsWith("_ve") ||
      field.admin?.hidden ||
      field.admin?.readOnly ||
      ("virtual" in field && field.virtual) ||
      denied(own) ||
      !Object.hasOwn(source, field.name)
    )
      continue;
    const item = source[field.name];
    if (field.type === "group")
      result[field.name] = copyPatternFields(
        field.fields,
        item,
        children(own),
        blocks,
        id,
        depth + 1,
      );
    else if (field.type === "array") {
      if (!Array.isArray(item) || item.length > (field.maxRows ?? 1000))
        throw Error("Pattern array no longer matches its schema");
      result[field.name] = item.map((row) => ({
        ...copyPatternFields(
          field.fields,
          row,
          children(own),
          blocks,
          id,
          depth + 1,
        ),
        id: id(),
      }));
    } else if (field.type === "blocks") {
      if (!Array.isArray(item) || item.length > (field.maxRows ?? 1000))
        throw Error("Pattern blocks no longer match their schema");
      const choices = (field.blockReferences || field.blocks).map((block) =>
        typeof block === "string" ? blocks[block] : block,
      );
      result[field.name] = item.map((row) => {
        const block = choices.find(
          (block) => block?.slug === record(row).blockType,
        );
        if (!block) throw Error("Pattern contains an obsolete block type");
        const permission = child(child(own, "blocks"), block.slug);
        if (denied(permission))
          throw Error("Pattern contains an inaccessible block type");
        return {
          ...copyPatternFields(
            block.fields,
            row,
            children(permission),
            blocks,
            id,
            depth + 1,
          ),
          blockType: block.slug,
          id: id(),
        };
      });
    } else if (field.type === "relationship" || field.type === "upload")
      result[field.name] = Array.isArray(item)
        ? item.map(reference)
        : reference(item);
    else if (!["ui", "join"].includes(field.type))
      result[field.name] = structuredClone(item);
  }
  return result;
}
