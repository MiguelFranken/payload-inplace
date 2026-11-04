import type { BlocksField, Field } from "payload";

const forbidden = new Set(["__proto__", "prototype", "constructor"]);
/** Reject paths that could become prototype writes; configuration roots contain names, never indices. */
export function pathSegments(path: string): string[] {
  const parts = path.split(".");
  if (
    !parts.length ||
    parts.some((p) => !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(p) || forbidden.has(p))
  )
    throw new Error("Invalid editor root path");
  return parts;
}
/** Resolve named groups/tabs separately from transparent rows/collapsibles/unnamed tabs. */
export function resolveRoot(fields: Field[], path: string): BlocksField {
  const parts = pathSegments(path);
  function find(list: Field[], remaining: string[]): BlocksField | undefined {
    for (const field of list) {
      if (field.type === "tabs") {
        for (const tab of field.tabs) {
          const named = "name" in tab && tab.name;
          const hit = named
            ? named === remaining[0]
              ? find(tab.fields, remaining.slice(1))
              : undefined
            : find(tab.fields, remaining);
          if (hit) return hit;
        }
      } else if ("name" in field && field.name === remaining[0]) {
        if (remaining.length === 1)
          return field.type === "blocks" ? field : undefined;
        if (field.type === "group") {
          const hit = find(field.fields, remaining.slice(1));
          if (hit) return hit;
        }
      } else if (!("name" in field) && "fields" in field) {
        const hit = find(field.fields, remaining);
        if (hit) return hit;
      }
    }
  }
  const result = find(fields, parts);
  if (!result)
    throw new Error(`Editor root ${path} is not an existing blocks field`);
  return result;
}
