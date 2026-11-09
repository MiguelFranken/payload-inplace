import { it, expect } from "vitest";
import { availableBlocks } from "../../src/schema/available-blocks";
import { applyCommand } from "../../src/adapters/payload-form";
import { StructuralHistory } from "../../src/state/history";
it("resolves referenced blocks and distinguishes no filter from an empty native whitelist", () => {
  const hero: any = { slug: "hero", fields: [] },
    field: any = {
      type: "blocks",
      name: "layout",
      blocks: [],
      blockReferences: ["hero"],
    };
  expect(availableBlocks(field, { hero })).toEqual([hero]);
  expect(availableBlocks(field, { hero }, [])).toEqual([]);
  expect(availableBlocks(field, { hero }, ["hero"])).toEqual([hero]);
});
it("adds the first native block when an empty form row control is represented by zero", () => {
  let added: any;
  const form: any = {
    getDataByPath: () => 0,
    getFields: () => ({ layout: { value: 0, rows: [] } }),
    addFieldRow: (args: any) => {
      added = args;
    },
    setModified: () => {},
  };
  expect(
    applyCommand(
      form,
      "layout",
      "pages.layout",
      { type: "add", blockType: "hero" },
      {
        disabled: false,
        min: 0,
        allowed: ["hero"],
        history: new StructuralHistory("layout"),
      },
    ),
  ).toBeUndefined();
  expect(added).toMatchObject({
    path: "layout",
    blockType: "hero",
    rowIndex: 0,
  });
});
