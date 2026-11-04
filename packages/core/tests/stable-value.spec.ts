import { expect, it } from "vitest";
import { readStableValue, writeStableValue } from "../src/stable-value.js";
it("patches encoded stable identities after reordering and rejects ambiguous/prototype paths", () => {
  const document = {
    rows: [
      { id: "second", title: "Two" },
      { id: "a.b/x", title: "One" },
    ],
  };
  expect(readStableValue(document, "rows.@a%2Eb%2Fx.title")).toBe("One");
  writeStableValue(document, "rows.@a%2Eb%2Fx.title", "Updated");
  expect(document.rows[1]?.title).toBe("Updated");
  for (const path of [
    "rows.1.title",
    "rows.@missing.title",
    "__proto__.polluted",
    "rows.@%xx.title",
  ])
    expect(() => writeStableValue(document, path, "x")).toThrow();
  expect(() =>
    readStableValue({ rows: [{ id: "x" }, { id: "x" }] }, "rows.@x.title"),
  ).toThrow();
});
