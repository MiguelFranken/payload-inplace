import type { FormState } from "payload";

function sameValue(a: unknown, b: unknown) {
  return Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);
}

/** A save acknowledges its submitted snapshot, not subsequent keystrokes. Preserve native local values and reject metadata for rows that moved during the request.
 * Payload 3.91's isModified flag tracks only the most recently updated field, so its autosave merge alone cannot protect multiple newer fields.
 * This is a native FormState merge adapter, not a second document model or persistence queue.
 */
export function protectNativeAcknowledgement(
  incoming: FormState,
  submitted: FormState,
  current: FormState,
): FormState {
  const safe: FormState = {};
  for (const [path, field] of Object.entries(incoming)) {
    const parts = path.split(".");
    let matchingRow = true;
    for (let i = 0; i < parts.length; i++) {
      if (!/^\d+$/.test(parts[i])) continue;
      const parent = parts.slice(0, i).join("."),
        index = Number(parts[i]);
      if (
        current[parent]?.rows?.[index]?.id !==
        submitted[parent]?.rows?.[index]?.id
      ) {
        matchingRow = false;
        break;
      }
    }
    if (!matchingRow) continue;
    const changed =
      !sameValue(current[path]?.value, submitted[path]?.value) ||
      !sameValue(
        current[path]?.rows?.map((r) => r.id),
        submitted[path]?.rows?.map((r) => r.id),
      );
    if (!changed) safe[path] = field;
  }
  return safe;
}

/** Discard asynchronous validation/condition metadata if any native value or row order changed after the read began. */
export function nativeSnapshotMatches(
  submitted: FormState,
  current: FormState,
): boolean {
  return [
    ...new Set([...Object.keys(submitted), ...Object.keys(current)]),
  ].every(
    (path) =>
      sameValue(submitted[path]?.value, current[path]?.value) &&
      sameValue(
        submitted[path]?.rows?.map((r) => r.id),
        current[path]?.rows?.map((r) => r.id),
      ),
  );
}
