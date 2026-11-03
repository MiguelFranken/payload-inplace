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
        .filter(
          ([key]) =>
            !["_veActivation", "_veReview", "_veReviewToken"].includes(key),
        )
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
