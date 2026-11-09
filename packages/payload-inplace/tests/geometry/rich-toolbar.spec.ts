import { expect, it } from "vitest";
import { richToolbarPosition } from "../../src/frontend/rich-toolbar";
it("centers a compact toolbar above the caret instead of the whole rich-text field", () => {
  expect(
    richToolbarPosition(
      { left: 300, top: 400, bottom: 424, width: 0 },
      { width: 190, height: 38 },
      { width: 1280, height: 720 },
    ),
  ).toEqual({ left: 205, top: 354 });
});
it("flips below a selection near the top and stays inside a 320px viewport", () => {
  expect(
    richToolbarPosition(
      { left: 0, top: 4, bottom: 28, width: 22 },
      { width: 190, height: 38 },
      { width: 320, height: 760 },
    ),
  ).toEqual({ left: 8, top: 36 });
  expect(
    richToolbarPosition(
      { left: 310, top: 740, bottom: 760, width: 8 },
      { width: 190, height: 38 },
      { width: 320, height: 760 },
    ),
  ).toEqual({ left: 122, top: 694 });
});

it("keeps formatting above the joined settings caption instead of intercepting its buttons", () => {
  const position = richToolbarPosition(
    { left: 100, top: 200, bottom: 224, width: 10 },
    { width: 190, height: 34 },
    { width: 1280, height: 720 },
    { left: 60, right: 270, top: 166, bottom: 198 },
  );
  expect(position.top).toBe(124);
});
