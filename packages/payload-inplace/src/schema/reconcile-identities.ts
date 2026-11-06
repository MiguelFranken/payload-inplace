import type { ClientBlock, ClientField } from "payload";

/** Reconciliation never guesses around malformed native row identities. Atomic JSON, relationship and rich-text fields are not traversed as native lists. */
export function assertReconcileIdentities(
  document: Record<string, unknown>,
  fields: ClientField[],
  blocks: Record<string, ClientBlock>,
): void {
  const record = (value: unknown): value is Record<string, unknown> =>
    Boolean(value && typeof value === "object" && !Array.isArray(value));
  const verify = (rows: unknown[], path: string) => {
    const ids = rows.map((row) =>
      record(row) && (typeof row.id === "string" || typeof row.id === "number")
        ? String(row.id)
        : undefined,
    );
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
      throw Error(
        `Rows in ${path} have invalid identities. Keep your working copy and use native editing to repair the list.`,
      );
  };
  function walk(
    value: Record<string, unknown>,
    schema: ClientField[],
    prefix = "",
  ) {
    for (const field of schema) {
      if (field.type === "tabs") {
        for (const tab of field.tabs)
          if ("name" in tab) {
            const group = value[tab.name];
            if (record(group)) walk(group, tab.fields, `${prefix}${tab.name}.`);
          } else walk(value, tab.fields, prefix);
        continue;
      }
      if (!("name" in field)) {
        if ("fields" in field) walk(value, field.fields, prefix);
        continue;
      }
      const data = value[field.name],
        path = prefix + field.name;
      if (
        (field.type === "array" || field.type === "blocks") &&
        Array.isArray(data)
      ) {
        verify(data, path);
        for (const row of data)
          if (record(row)) {
            const block =
              field.type === "blocks"
                ? blocks[String(row.blockType)] ||
                  field.blocks.find((block) => block.slug === row.blockType)
                : undefined;
            const children =
              field.type === "array" ? field.fields : block?.fields;
            if (children)
              walk(
                row,
                children,
                `${path}.@${encodeURIComponent(String(row.id))}.`,
              );
          }
      } else if (field.type === "group" && record(data))
        walk(data, field.fields, path + ".");
    }
  }
  if (fields.length) walk(document, fields);
  else {
    // Schema-free callers may reconcile block fixtures, but no arbitrary JSON row mapping is inferred.
    const visit = (value: unknown, path: string) => {
      if (Array.isArray(value)) {
        if (
          value.some((row) => record(row) && typeof row.blockType === "string")
        )
          verify(value, path);
        value.forEach((row, index) => visit(row, `${path}.${index}`));
      } else if (record(value) && !value.root)
        for (const [key, child] of Object.entries(value))
          visit(child, path ? path + "." + key : key);
    };
    visit(document, "");
  }
}
