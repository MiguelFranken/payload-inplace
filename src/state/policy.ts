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
