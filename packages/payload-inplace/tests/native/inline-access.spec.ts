import { expect, it } from "vitest";
import { canUpdateInlineField } from "../../src/schema/inline-access";
it("requires native permission without widening denied or unknown nested paths", () => {
  expect(canUpdateInlineField(true, "heading")).toBe(true);
  expect(
    canUpdateInlineField({ heading: { read: true, update: true } }, "heading"),
  ).toBe(true);
  expect(
    canUpdateInlineField({ heading: { read: false, update: true } }, "heading"),
  ).toBe(false);
  expect(
    canUpdateInlineField(
      { appearance: { update: false, fields: { caption: { update: true } } } },
      "appearance.caption",
    ),
  ).toBe(false);
  expect(
    canUpdateInlineField(
      {
        appearance: {
          read: true,
          update: true,
          fields: { caption: { read: true, update: true } },
        },
      },
      "appearance.caption",
    ),
  ).toBe(true);
  expect(canUpdateInlineField({}, "heading")).toBe(false);
  expect(canUpdateInlineField(true, "__proto__.heading")).toBe(false);
});
