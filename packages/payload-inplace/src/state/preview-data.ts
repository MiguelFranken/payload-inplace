import { isPrivateEditorField } from "@payload-inplace/core/document-metadata";

/** Project native form values for display only. Array rows match by stable ID, never index; changed relationships never retain a stale object.
 * This result is never submitted. Native form values and Payload remain the only write authority.
 */
export function mergePreviewData(initial: unknown, current: unknown): unknown {
  if (current === null) return null;
  if (current === 0 && Array.isArray(initial)) return [];
  if (Array.isArray(current)) {
    const previous = Array.isArray(initial) ? initial : [];
    const byID = new Map(
      previous
        .filter((v) => v && typeof v === "object" && v.id != null)
        .map((v) => [String(v.id), v]),
    );
    return current.map((value) =>
      mergePreviewData(
        value && typeof value === "object" && value.id != null
          ? byID.get(String(value.id))
          : value != null && typeof value !== "object"
            ? byID.get(String(value))
            : undefined,
        value,
      ),
    );
  }
  if (current && typeof current === "object") {
    const previous =
      initial && typeof initial === "object" && !Array.isArray(initial)
        ? (initial as Record<string, unknown>)
        : {};
    return Object.fromEntries(
      Object.entries({ ...previous, ...current })
        .filter(([key]) => !isPrivateEditorField(key))
        .map(([key, value]) => [
          key,
          Object.hasOwn(current, key)
            ? mergePreviewData(
                previous[key],
                (current as Record<string, unknown>)[key],
              )
            : value,
        ]),
    );
  }
  if (
    initial &&
    typeof initial === "object" &&
    !Array.isArray(initial) &&
    "id" in initial &&
    current != null &&
    String(initial.id) === String(current)
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
