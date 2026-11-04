/** Host rules are generic structural invariants; consumers supply their own block slugs. */
export interface StructuralPolicy {
  first?: string;
  exactlyOne?: string[];
}
/** Stable policy reasons can be translated by UI without parsing English error strings. */
export type StructuralIssue = {
  code: "first-section" | "singleton-section";
  blockType: string;
};
/** Publication requires a complete structure; drafts may use the separate transition contract. */
export function structureIssue(
  rows: { blockType?: string }[],
  policy?: StructuralPolicy,
): StructuralIssue | undefined {
  if (policy?.first && rows[0]?.blockType !== policy.first)
    return { code: "first-section", blockType: policy.first };
  for (const blockType of policy?.exactlyOne ?? [])
    if (rows.filter((row) => row.blockType === blockType).length !== 1)
      return { code: "singleton-section", blockType };
}
/** Drafts may fill missing requirements in separate steps, while preserving requirements already present. */
export function structureTransitionIssue(
  before: { blockType?: string }[],
  next: { blockType?: string }[],
  policy?: StructuralPolicy,
): StructuralIssue | undefined {
  if (
    policy?.first &&
    (before.length || next.length) &&
    next[0]?.blockType !== policy.first
  )
    return { code: "first-section", blockType: policy.first };
  for (const blockType of policy?.exactlyOne ?? []) {
    const previous = before.filter((row) => row.blockType === blockType).length,
      count = next.filter((row) => row.blockType === blockType).length;
    if (count > Math.max(1, previous) || (previous > 0 && count === 0))
      return { code: "singleton-section", blockType };
  }
}
/** Default server text retains the existing policy API; authoring UI formats typed reasons independently. */
export function structuralIssueText(issue: StructuralIssue): string {
  return issue.code === "first-section"
    ? `The first section must be ${issue.blockType}.`
    : `Exactly one ${issue.blockType} section is required.`;
}
/** Shared UI/server publication policy, with backwards-compatible default text. @see structureIssue exposes stable reason codes. */
export function structureError(
  rows: { blockType?: string }[],
  policy?: StructuralPolicy,
): string | undefined {
  const issue = structureIssue(rows, policy);
  return issue && structuralIssueText(issue);
}
/** Draft transition policy with backwards-compatible default text. @see structureTransitionIssue exposes stable reason codes. */
export function structureTransitionError(
  before: { blockType?: string }[],
  next: { blockType?: string }[],
  policy?: StructuralPolicy,
): string | undefined {
  const issue = structureTransitionIssue(before, next, policy);
  return issue && structuralIssueText(issue);
}
