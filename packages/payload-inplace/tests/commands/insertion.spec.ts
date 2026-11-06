import { expect, it, vi } from "vitest";
import { applyCommand } from "../../src/adapters/payload-form.js";
import { StructuralHistory } from "../../src/state/history.js";

const identity = (blockId: string) => ({ root: "layout", blockId });

function fixture() {
  const rows = [
    { id: "hero", blockType: "hero" },
    { id: "a", blockType: "text" },
    { id: "b", blockType: "text" },
  ];
  const form: any = {
    getDataByPath: () => rows,
    getFields: () => ({ layout: { rows, value: rows.length } }),
    addFieldRow: vi.fn(),
    setModified: vi.fn(),
  };
  const options = {
    disabled: false,
    min: 1,
    max: 5,
    allowed: ["hero", "text"],
    policy: { first: "hero" },
    history: new StructuralHistory("layout"),
  };
  return { rows, form, options };
}
it("resolves insertion against the anchor's current position after local reorder", () => {
  const { rows, form, options } = fixture();
  const command = {
    type: "add" as const,
    blockType: "text",
    adjacent: { identity: identity("a"), side: "after" as const },
  };
  rows.push(...rows.splice(1, 1));
  expect(
    applyCommand(form, "layout", "pages.layout", command, options),
  ).toBeUndefined();
  expect(form.addFieldRow).toHaveBeenCalledExactlyOnceWith({
    path: "layout",
    schemaPath: "pages.layout",
    blockType: "text",
    rowIndex: 3,
  });
});
it("rejects deleted anchors, fixed-first violations and full containers before creating history or native rows", () => {
  for (const kind of ["removed", "first", "full"] as const) {
    const { rows, form, options } = fixture();
    if (kind === "removed") rows.splice(1, 1);
    if (kind === "full") options.max = rows.length;
    const issue = applyCommand(
      form,
      "layout",
      "pages.layout",
      {
        type: "add",
        blockType: "text",
        adjacent: {
          identity: identity(kind === "first" ? "hero" : "a"),
          side: "before",
        },
      },
      options,
    );
    expect(issue).toBeTypeOf("string");
    expect(form.addFieldRow).not.toHaveBeenCalled();
    expect(options.history.canUndo).toBe(false);
  }
});
it("creates array rows through native defaults and the same structural history owner", () => {
  const fields: any = {
    layout: { rows: [{ id: "hero", blockType: "hero" }], value: 1 },
    "layout.0.items": { rows: [], value: 0 },
  };
  const form: any = {
    getFields: () => fields,
    getDataByPath: (p: string) =>
      p === "layout" ? [{ id: "hero", blockType: "hero", items: [] }] : [],
    addFieldRow: vi.fn(),
    setModified: vi.fn(),
  };
  expect(
    applyCommand(
      form,
      "layout",
      "pages.layout.hero.items",
      { type: "add-array" },
      {
        container: "layout.0.items",
        disabled: false,
        min: 0,
        allowed: [],
        history: new StructuralHistory("layout"),
      },
    ),
  ).toBeUndefined();
  expect(form.addFieldRow).toHaveBeenCalledExactlyOnceWith({
    path: "layout.0.items",
    schemaPath: "pages.layout.hero.items",
    rowIndex: 0,
  });
});
