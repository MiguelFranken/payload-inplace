/** Fragment/display:contents roots use the union of rendered child boxes, never a zero wrapper box. */
export function elementRect(element: Element): DOMRect | null {
  const boxes = [...element.getClientRects()].filter(
    (r) => r.width && r.height,
  );
  if (!boxes.length)
    for (const child of element.children) {
      const rect = elementRect(child);
      if (rect) boxes.push(rect);
    }
  if (!boxes.length) return null;
  const left = Math.min(...boxes.map((r) => r.left)),
    top = Math.min(...boxes.map((r) => r.top));
  return new DOMRect(
    left,
    top,
    Math.max(...boxes.map((r) => r.right)) - left,
    Math.max(...boxes.map((r) => r.bottom)) - top,
  );
}

/** Choose a page-grip position that leaves actual rendered field text unobscured.
 * When dense edge-to-edge content offers no safe position, the section-list handle remains the keyboard/pointer alternative.
 */
export function pageHandlePosition(
  block: Pick<
    DOMRect,
    "left" | "top" | "right" | "bottom" | "width" | "height"
  >,
  size: { width: number; height: number },
  text: ReadonlyArray<Pick<DOMRect, "left" | "top" | "right" | "bottom">>,
  viewportWidth: number,
): { left: number; top: number } | undefined {
  const left = Math.max(
    8,
    Math.min(block.left + 8, viewportWidth - size.width - 8),
  );
  const right = Math.max(
    8,
    Math.min(block.right - size.width - 8, viewportWidth - size.width - 8),
  );
  const positions = [
    { left, top: block.top + 8 },
    { left: right, top: block.top + 8 },
    { left, top: block.top - size.height - 4 },
    { left: right, top: block.top - size.height - 4 },
    { left: right, top: block.bottom - size.height - 8 },
  ];
  return positions.find(
    (position) =>
      position.top >= 0 &&
      position.left + size.width <= viewportWidth &&
      !text.some(
        (rect) =>
          position.left < rect.right &&
          position.left + size.width > rect.left &&
          position.top < rect.bottom &&
          position.top + size.height > rect.top,
      ),
  );
}

let measuredFrame = -1;
let textRects: DOMRect[] = [];
/** All page handles share one text measurement per animation frame, including neighbouring sections. */
export function boundTextRects(frame: number): DOMRect[] {
  if (measuredFrame === frame) return textRects;
  measuredFrame = frame;
  textRects = [...document.querySelectorAll("[data-ve-field]")].flatMap(
    (element) => {
      if (element.childElementCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].filter(
          (rect) => rect.width && rect.height,
        );
      }
      const rect = elementRect(element);
      return rect ? [rect] : [];
    },
  );
  return textRects;
}
