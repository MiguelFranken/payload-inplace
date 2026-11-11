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

/** Follow a single move until the renderer reflects its new order or the preview wait expires. */
export function trackSectionMove(
  findAnchor: () => Element | undefined,
  after: boolean,
) {
  let anchor = findAnchor();
  const expires = performance.now() + 10000;
  const expected = after
    ? Node.DOCUMENT_POSITION_PRECEDING
    : Node.DOCUMENT_POSITION_FOLLOWING;
  return (element: Element, rect: DOMRect) => {
    if (performance.now() > expires) return "expired";
    if (!anchor?.isConnected) anchor = findAnchor();
    if (!anchor || !(element.compareDocumentPosition(anchor) & expected))
      return "waiting";
    return rect.top >= innerHeight - 96 || rect.bottom < 96
      ? "offscreen"
      : "visible";
  };
}
