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

/** Native Form represents empty array/block controls as count zero. Normalize only paths positively identified by native row metadata. */
export function normalizePreviewRows(
  data: Record<string, any>,
  fields: Record<string, { rows?: unknown }>,
) {
  for (const [path, state] of Object.entries(fields)) {
    if (!Array.isArray(state.rows)) continue;
    const parts = path.split(".");
    if (
      parts.some((key) =>
        ["__proto__", "constructor", "prototype"].includes(key),
      )
    )
      continue;
    let parent: any = data;
    for (const key of parts.slice(0, -1)) parent = parent?.[key];
    const key = parts.at(-1)!;
    if (parent && parent[key] === 0) parent[key] = [];
  }
  return data;
}
