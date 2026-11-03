/** Host rules are generic structural invariants; consumers supply their own block slugs. */
export interface StructuralPolicy {
  first?: string;
  exactlyOne?: string[];
}
/** Shared UI/server policy keeps required first/singleton blocks intact. Drafts may remain incomplete. */
export function structureError(
  rows: { blockType?: string }[],
  policy?: StructuralPolicy,
): string | undefined {
  if (policy?.first && rows[0]?.blockType !== policy.first)
    return `The first section must be ${policy.first}.`;
  for (const type of policy?.exactlyOne ?? [])
    if (rows.filter((r) => r.blockType === type).length !== 1)
      return `Exactly one ${type} section is required.`;
}

/** Draft construction may fill missing required sections in separate steps. Existing requirements cannot be removed or duplicated; publication remains strict via structureError. */
export function structureTransitionError(
  before: { blockType?: string }[],
  next: { blockType?: string }[],
  policy?: StructuralPolicy,
): string | undefined {
  if (
    policy?.first &&
    (before.length || next.length) &&
    next[0]?.blockType !== policy.first
  )
    return `The first section must be ${policy.first}.`;
  for (const type of policy?.exactlyOne ?? []) {
    const previous = before.filter((row) => row.blockType === type).length;
    const count = next.filter((row) => row.blockType === type).length;
    if (count > Math.max(1, previous) || (previous > 0 && count === 0))
      return `Exactly one ${type} section is required.`;
  }
}
