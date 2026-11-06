import { contentHash } from "./review.js";

/** Compare a complete live-document snapshot while excluding only the configured operational paths.
 * A sparse patch is rejected: native Payload merges ordinary writes with the latest draft, so publishing
 * such a patch could otherwise release unrelated editorial changes. Unknown additions also fail closed.
 */
export function operationalSnapshotMatches(
  candidate: Record<string, unknown>,
  published: Record<string, unknown>,
  paths: string[],
): boolean {
  if (!paths.length) return false;
  const omit = (value: Record<string, unknown>) => {
    const result = structuredClone(value);
    for (const path of paths) {
      if (
        !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/.test(path) ||
        path
          .split(".")
          .some((part) =>
            ["constructor", "prototype", "__proto__"].includes(part),
          )
      )
        return null;
      const parts = path.split(".");
      let current: any = result;
      for (const part of parts.slice(0, -1))
        current =
          current && Object.hasOwn(current, part) ? current[part] : undefined;
      if (current && typeof current === "object") delete current[parts.at(-1)!];
    }
    return result;
  };
  const left = omit(candidate),
    right = omit(published);
  return Boolean(left && right && contentHash(left) === contentHash(right));
}
