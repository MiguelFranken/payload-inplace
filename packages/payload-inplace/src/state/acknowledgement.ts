import type { FormField, FormState } from "payload";

function sameValue(a: unknown, b: unknown) {
  return Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);
}

function sameRows(a: FormField["rows"], b: FormField["rows"]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((row, index) => row.id === b[index]?.id);
}

function sameField(a: FormField | undefined, b: FormField | undefined) {
  return (
    a === b || (sameValue(a?.value, b?.value) && sameRows(a?.rows, b?.rows))
  );
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
  const rowMatches = new Map<string, boolean>();
  function rowsMatch(path: string): boolean {
    let end = path.length;
    while (end > 0) {
      const dot = path.lastIndexOf(".", end - 1);
      const part = path.slice(dot + 1, end);
      if (/^\d+$/.test(part)) {
        const prefix = path.slice(0, end);
        const cached = rowMatches.get(prefix);
        if (cached !== undefined) return cached;
        const parent = dot < 0 ? "" : path.slice(0, dot);
        const index = Number(part);
        const matches =
          current[parent]?.rows?.[index]?.id ===
            submitted[parent]?.rows?.[index]?.id && rowsMatch(parent);
        rowMatches.set(prefix, matches);
        return matches;
      }
      end = dot;
    }
    return true;
  }
  for (const [path, field] of Object.entries(incoming))
    if (rowsMatch(path) && sameField(current[path], submitted[path]))
      safe[path] = field;
  return safe;
}

/** Discard asynchronous validation/condition metadata if any native value or row order changed after the read began. */
export function nativeSnapshotMatches(
  submitted: FormState,
  current: FormState,
): boolean {
  for (const path of Object.keys(submitted))
    if (!sameField(submitted[path], current[path])) return false;
  for (const path of Object.keys(current))
    if (!Object.hasOwn(submitted, path) && !sameField(undefined, current[path]))
      return false;
  return true;
}
