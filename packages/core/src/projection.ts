import { indexBlocks, resolveIdentity } from "./identity";
import type { InsertionTarget } from "./insertion";

/** A disposable presentation delta, never native Form state or a persisted document copy. */
export interface InsertionProjection {
  target: InsertionTarget;
  row: Readonly<Record<string, unknown>>;
}

function read(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (data, key) =>
        data && typeof data === "object" && Object.hasOwn(data, key)
          ? (data as Record<string, unknown>)[key]
          : undefined,
      value,
    );
}

function update(
  value: unknown,
  parts: readonly string[],
  rows: unknown[],
): unknown {
  const key = parts[0];
  if (!key) return rows;
  if (
    ["__proto__", "prototype", "constructor"].includes(key) ||
    !value ||
    typeof value !== "object" ||
    !Object.hasOwn(value, key)
  )
    return value;
  const copy = Array.isArray(value) ? [...value] : { ...value };
  (copy as Record<string, unknown>)[key] = update(
    (value as Record<string, unknown>)[key],
    parts.slice(1),
    rows,
  );
  return copy;
}

/** Resolve IDs on every projection so a picker cannot preview at a stale numeric neighbor position. */
export function projectInsertion<T extends Record<string, unknown>>(
  document: T,
  projection: InsertionProjection | undefined,
): T {
  if (!projection) return document;
  const target = projection.target,
    root = target.kind === "adjacent" ? target.identity.root : target.root;
  if (
    root
      .split(".")
      .some((key) => ["__proto__", "prototype", "constructor"].includes(key))
  )
    return document;
  const rootValue = read(document, root),
    rootRows = Array.isArray(rootValue) ? rootValue : [];
  const identity =
    target.kind === "adjacent" ? target.identity : target.identity;
  let section: ReturnType<typeof resolveIdentity>;
  try {
    section = identity
      ? resolveIdentity(indexBlocks(rootRows, root), identity)
      : undefined;
  } catch {
    return document;
  } // Ambiguous native identities cannot acquire a preview target.

  if (identity && !section) return document;
  let path = root,
    position: number | undefined;
  if (target.kind === "adjacent") {
    path = section!.parent;
    position = section!.index + (target.side === "after" ? 1 : 0);
  } else if (identity && target.field) {
    let value = read(document, section!.path);
    const parts: string[] = [];
    for (const part of target.field.split(".")) {
      if (["__proto__", "constructor", "prototype"].includes(part))
        return document;
      if (part.startsWith("@")) {
        let id: string;
        try {
          id = decodeURIComponent(part.slice(1));
        } catch {
          return document;
        }
        if (!Array.isArray(value)) return document;
        const hits = value.flatMap((row, index) =>
          row && typeof row === "object" && String(row.id) === id
            ? [index]
            : [],
        );
        if (hits.length !== 1) return document;
        parts.push(String(hits[0]));
        value = value[hits[0]!];
      } else {
        parts.push(part);
        value = read(value, part);
      }
    }
    path = `${section!.path}.${parts.join(".")}`;
  } else if (target.kind === "list" && target.field) return document;
  const current = read(document, path);
  if (!Array.isArray(current) && current !== 0 && current !== undefined)
    return document;
  const rows = Array.isArray(current) ? [...current] : [];
  rows.splice(position ?? rows.length, 0, projection.row);
  return update(document, path.split("."), rows) as T;
}
