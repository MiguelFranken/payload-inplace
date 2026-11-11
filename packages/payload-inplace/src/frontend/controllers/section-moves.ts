import type { NativeSection } from "../../schema/tree";

/** Resolve legal final positions within the selected native list. A move preserves singleton counts. */
export function sectionMoveDestinations(
  section: NativeSection,
  sections: readonly NativeSection[],
  rows: readonly { blockType?: string }[],
  fixedFirst?: string,
): NativeSection[] {
  if (section.readOnly || section.index >= rows.length) return [];
  return sections.filter((destination) => {
    const to = destination.index;
    if (destination.parent !== section.parent || to === section.index)
      return false;
    const first = to === 0 ? section.index : section.index === 0 ? 1 : 0;
    return !fixedFirst || rows[first]?.blockType === fixedFirst;
  });
}
