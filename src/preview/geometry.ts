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
