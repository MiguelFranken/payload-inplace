import { getArrayItemPath } from "./annotations.js";

/** Convert a transient native numeric path into an ID path for comparison/navigation only. */
export function stableDataPath(
  document: unknown,
  path: string,
): string | undefined {
  let value = document,
    result = "";
  for (const part of path.split(".")) {
    if (!part || ["__proto__", "constructor", "prototype"].includes(part))
      return;
    if (Array.isArray(value)) {
      if (!/^(0|[1-9]\d*)$/.test(part)) return;
      const row: unknown = value[Number(part)];
      if (
        !row ||
        typeof row !== "object" ||
        !("id" in row) ||
        (typeof row.id !== "string" && typeof row.id !== "number")
      )
        return;
      result = getArrayItemPath(result, row.id);
      value = row;
    } else if (
      value &&
      typeof value === "object" &&
      Object.hasOwn(value, part)
    ) {
      result = result ? `${result}.${part}` : part;
      value = (value as Record<string, unknown>)[part];
    } else return;
  }
  return result;
}
