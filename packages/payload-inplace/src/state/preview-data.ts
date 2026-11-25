import { isPrivateEditorField } from "@payload-inplace/core/document-metadata";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPolymorphicReference(value: unknown): value is Record<
  string,
  unknown
> & {
  relationTo: string;
  value: unknown;
} {
  return (
    isRecord(value) &&
    typeof value.relationTo === "string" &&
    Object.hasOwn(value, "value")
  );
}

function referenceID(value: unknown): string | undefined {
  const id = isRecord(value) ? value.id : value;
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined;
}

function referenceKey(value: unknown): string | undefined {
  if (isPolymorphicReference(value)) {
    const id = referenceID(value.value);
    return id === undefined
      ? undefined
      : JSON.stringify([value.relationTo, id]);
  }
  const id = referenceID(value);
  return id === undefined ? undefined : JSON.stringify([id]);
}

/** Project native form values for display only. Array rows match by stable ID, never index; changed relationships never retain a stale object.
 * This result is never submitted. Native form values and Payload remain the only write authority.
 */
export function mergePreviewData(initial: unknown, current: unknown): unknown {
  if (current === null) return null;
  if (current === 0 && Array.isArray(initial)) return [];
  if (Array.isArray(current)) {
    const byID = new Map<string, unknown>();
    for (const value of Array.isArray(initial) ? initial : []) {
      if (!isRecord(value)) continue;
      const key = referenceKey(value);
      if (key !== undefined) byID.set(key, value);
    }
    return current.map((value) => {
      const key = referenceKey(value);
      return mergePreviewData(
        key === undefined ? undefined : byID.get(key),
        value,
      );
    });
  }
  if (isRecord(current)) {
    let previous = isRecord(initial) ? initial : {};
    if (isPolymorphicReference(current) || isPolymorphicReference(previous)) {
      const key = referenceKey(current);
      if (key === undefined || key !== referenceKey(previous)) previous = {};
    } else {
      const id = referenceID(current);
      const previousID = referenceID(previous);
      if (id !== undefined && previousID !== undefined && id !== previousID)
        previous = {};
    }
    return Object.fromEntries(
      Object.entries({ ...previous, ...current })
        .filter(([key]) => !isPrivateEditorField(key))
        .map(([key, value]) => [
          key,
          Object.hasOwn(current, key)
            ? mergePreviewData(previous[key], current[key])
            : value,
        ]),
    );
  }
  if (
    isRecord(initial) &&
    (typeof current === "string" || typeof current === "number") &&
    referenceID(initial) === String(current)
  )
    return initial;
  return current;
}

function normalizeRowPath(
  value: unknown,
  path: string[],
  index: number,
): unknown {
  const key = path[index];
  if (key === undefined) return value === 0 ? [] : value;
  if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
    return value;
  const record = value as Record<string, unknown>;
  const child = record[key];
  const normalized = normalizeRowPath(child, path, index + 1);
  if (Object.is(child, normalized)) return value;
  const copy = (Array.isArray(value) ? [...value] : { ...record }) as Record<
    string,
    unknown
  >;
  copy[key] = normalized;
  return copy;
}

/** Normalize native zero row counts by copying only the affected paths in the preview. */
export function normalizePreviewRows<T extends Record<string, unknown>>(
  data: T,
  fields: Record<string, { rows?: unknown }>,
): T {
  let projection: unknown = data;
  for (const [path, state] of Object.entries(fields)) {
    if (!Array.isArray(state.rows)) continue;
    const parts = path.split(".");
    if (
      parts.some(
        (key) =>
          !key || ["__proto__", "constructor", "prototype"].includes(key),
      )
    )
      continue;
    projection = normalizeRowPath(projection, parts, 0);
  }
  return projection as T;
}
