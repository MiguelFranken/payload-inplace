import { expect, it } from "vitest";
import { preparedInsertedRow } from "../src/row-preparation.js";
it("waits for native leaf initialization and never selects a previous row at the same index", () => {
  const before = new Set(["old"]);
  const fields = {
    layout: {
      rows: [
        { id: "new", blockType: "text" },
        { id: "old", blockType: "text" },
      ],
    },
    "layout.0.id": { value: "old" },
    "layout.0.heading": { value: "Previous" },
  };
  expect(preparedInsertedRow(fields, "layout", before)).toBeUndefined();
  fields["layout.0.id"].value = "new";
  expect(preparedInsertedRow(fields, "layout", before)).toEqual({
    id: "new",
    index: 0,
    path: "layout.0",
    blockType: "text",
  });
  expect(
    preparedInsertedRow(
      { layout: fields.layout, "layout.0.id": { value: "new" } },
      "layout",
      before,
    ),
  ).toBeUndefined();
  expect(
    preparedInsertedRow(
      { ...fields, layout: { rows: [{ id: "new" }, { id: "other" }] } },
      "layout",
      before,
    ),
  ).toBeUndefined();
});
