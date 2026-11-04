const overlaps = (a: string, b: string) =>
  a === b || a.startsWith(b + ".") || b.startsWith(a + ".");

/** Atomically claim or move one native field owner without mounting overlapping controls.
 * Unchanged claims retain reference identity. A move into another owner's subtree releases
 * the old paths and waits for that owner to leave. React Suspense visibility does not release ownership.
 */
export function claimNativeFields<T extends { id: string; paths: string[] }>(
  current: T[],
  candidate: T,
): T[] {
  const own = current.find((owner) => owner.id === candidate.id);
  const conflict = current.some(
    (owner) =>
      owner.id !== candidate.id &&
      owner.paths.some((a) => candidate.paths.some((b) => overlaps(a, b))),
  );
  if (conflict)
    return own ? current.filter((owner) => owner.id !== candidate.id) : current;
  if (
    own &&
    own.paths.length === candidate.paths.length &&
    own.paths.every((path, index) => path === candidate.paths[index])
  )
    return current;
  return own
    ? current.map((owner) => (owner.id === candidate.id ? candidate : owner))
    : [...current, candidate];
}
