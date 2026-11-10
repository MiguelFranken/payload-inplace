import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { resolveBinding } from "../../src/schema/resolve-binding";
import { projectSectionFieldPanel } from "../../src/schema/section-field-panel";

const fields: ClientField[] = [
  {
    type: "group",
    name: "action",
    fields: [
      { type: "text", name: "label" },
      { type: "text", name: "url" },
    ],
  },
  {
    type: "array",
    name: "cards",
    fields: [{ type: "text", name: "title" }],
  },
];

const section = {
  path: "layout.2",
  schemaPath: "pages.layout.hero",
  permissions: true,
};

const sectionValue = { cards: [{ id: "stable-id", title: "First card" }] };

const options = {
  section,
  configuredFields: fields,
  sectionValue,
  canInline: false,
};

describe("section field panel", () => {
  it("focuses the resolved terminal while mounting its native siblings only for inline settings", () => {
    const field = "action.label";
    const binding = resolveBinding({
      fields,
      value: sectionValue,
      binding: field,
    });
    const panel = projectSectionFieldPanel({ ...options, field, binding });

    expect(panel.path).toBe("layout.2.action");
    expect(panel.schemaPath).toBe("pages.layout.hero.action");
    expect(panel.focusPath).toBe("layout.2.action.label");
    expect(panel.fields).toEqual([{ type: "text", name: "label" }]);
    expect(
      projectSectionFieldPanel({ ...options, field, binding, canInline: true })
        .fields,
    ).toEqual([
      { type: "text", name: "label" },
      { type: "text", name: "url" },
    ]);
  });

  it("mounts an array row's child fields at its current index with the native schema path", () => {
    const field = "cards.@stable-id";
    const binding = resolveBinding({
      fields,
      value: sectionValue,
      binding: field,
    });
    expect(
      projectSectionFieldPanel({ ...options, field, binding }),
    ).toMatchObject({
      path: "layout.2.cards.0",
      schemaPath: "pages.layout.hero.cards",
      fields: [{ type: "text", name: "title" }],
      focusPath: undefined,
    });
  });

  it("keeps groups scoped to one parent and missing targets from exposing section fields", () => {
    expect(
      projectSectionFieldPanel({
        ...options,
        group: ["action.url", "action.label"],
      }).fields,
    ).toEqual([
      { type: "text", name: "url" },
      { type: "text", name: "label" },
    ]);
    expect(
      projectSectionFieldPanel({
        ...options,
        group: ["action.url", "cards.0.title"],
      }).fields,
    ).toEqual([]);
    expect(
      projectSectionFieldPanel({ ...options, field: "missing" }).fields,
    ).toEqual([]);
    expect(projectSectionFieldPanel(options).fields).toBe(fields);
  });
});
