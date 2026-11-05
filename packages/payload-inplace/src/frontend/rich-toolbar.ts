/** Place formatting next to the native selection/caret; flip only when there is no room above it.
 * Coordinates are viewport-relative because editor chrome lives in its isolated fixed portal.
 */
export function richToolbarPosition(
  anchor: { left: number; top: number; width: number; bottom: number },
  toolbar: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const inset = 8,
    gap = 8;
  const clamp = (value: number, max: number) =>
    Math.max(inset, Math.min(value, max - inset));
  const above = anchor.top - toolbar.height - gap;
  return {
    left: clamp(
      anchor.left + anchor.width / 2 - toolbar.width / 2,
      viewport.width - toolbar.width,
    ),
    top: clamp(
      above >= inset ? above : anchor.bottom + gap,
      viewport.height - toolbar.height,
    ),
  };
}
