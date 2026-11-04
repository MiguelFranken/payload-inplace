import { expect, it } from "vitest";
import type { Field } from "payload";
import { resolveRootScope } from "../../src/schema/resolve.js";
it("distinguishes translated leaves from shared structure and inherits named group/tab localization", () => {
  const root: Field = {
    name: "layout",
    type: "blocks",
    blocks: [
      {
        slug: "story",
        fields: [{ name: "heading", type: "text", localized: true }],
      },
    ],
  };
  expect(resolveRootScope([root], "layout")).toEqual({
    field: root,
    localized: false,
  });
  const group: Field = {
    name: "presentation",
    type: "group",
    localized: true,
    fields: [root],
  };
  expect(resolveRootScope([group], "presentation.layout").localized).toBe(true);
  const tabs: Field = {
    type: "tabs",
    tabs: [
      { name: "details", label: "Details", localized: true, fields: [root] },
    ],
  };
  expect(resolveRootScope([tabs], "details.layout").localized).toBe(true);
  expect(
    resolveRootScope(
      [
        {
          type: "collapsible",
          label: "Transparent",
          fields: [{ ...root, localized: true }],
        },
      ],
      "layout",
    ).localized,
  ).toBe(true);
});
