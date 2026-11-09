import { expect, it } from "vitest";
import { pageHandlePosition } from "../../src/preview/geometry";

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

const intersects = (
  a: { left: number; top: number },
  b: ReturnType<typeof box>,
  size = { width: 112, height: 44 },
) =>
  a.left < b.right &&
  a.left + size.width > b.left &&
  a.top < b.bottom &&
  a.top + size.height > b.top;
it("retains familiar placement when a padded block has clear space above its text", () => {
  const heading = box(48, 76, 300, 40);
  const position = pageHandlePosition(
    box(0, 0, 1280, 276),
    { width: 112, height: 44 },
    [heading],
    1280,
  );
  expect(position).toBeDefined();
  expect(intersects(position!, heading)).toBe(false);
});
it("moves a grip away from tightly padded mobile text and neighbouring text", () => {
  const title = box(56, 96, 208, 72),
    previous = box(0, 0, 320, 12);
  const position = pageHandlePosition(
    box(24, 64, 272, 280),
    { width: 112, height: 44 },
    [title, previous],
    320,
  );
  expect(position).toBeDefined();
  expect(intersects(position!, title)).toBe(false);
  expect(intersects(position!, previous)).toBe(false);
  expect(position!.left + 112).toBeLessThanOrEqual(320);
});
it("leaves dense edge-to-edge text unobscured when only the list offers room for controls", () => {
  expect(
    pageHandlePosition(
      box(0, 0, 320, 40),
      { width: 112, height: 44 },
      [box(0, 0, 320, 40), box(0, 40, 320, 100)],
      320,
    ),
  ).toBeUndefined();
});
it("rejects handles wider than the viewport", () => {
  expect(
    pageHandlePosition(
      box(0, 0, 200, 200),
      { width: 400, height: 44 },
      [],
      320,
    ),
  ).toBeUndefined();
});
