import { expect, it } from "vitest";
import type { ClientField } from "payload";
import { diagnoseBinding } from "../../src/schema/binding-diagnostics.js";
const fields = [
  { name: "heading", type: "text" },
  { name: "items", type: "array", fields: [{ name: "label", type: "text" }] },
] as ClientField[];
const value = {
  heading: "Private value must never appear",
  items: [{ id: "row", label: "One" }],
};
const check = (binding: string, options = {}) =>
  diagnoseBinding({ fields, value, binding, permissions: true, ...options });
it("explains missing/unsafe paths, row/container intent and native ownership without exposing values", () => {
  expect(check("__proto__.x")[0]!.code).toBe("unsafe-path");
  expect(check("unknown")[0]!.code).toBe("unresolved-path");
  expect(check("items.@missing.label")[0]!.code).toBe("unresolved-row");
  expect(check("items.@row", { edit: "inline" })[0]!.code).toBe(
    "row-is-not-terminal",
  );
  expect(check("items", { edit: "inline" })[0]!.code).toBe(
    "container-is-not-terminal",
  );
  expect(check("heading", { interactiveMarkup: true })[0]!.code).toBe(
    "unsafe-text-markup",
  );
  expect(check("heading", { state: { passesCondition: false } })[0]!.code).toBe(
    "condition-hidden",
  );
  expect(
    check("heading", { state: { customComponents: { Field: "native" } } })[0]!
      .code,
  ).toBe("native-override");
  expect(
    check("heading", { permissions: { heading: { update: false } } })[0]!.code,
  ).toBe("read-only");
  expect(check("items.@row.label")).toEqual([]);
  expect(check("heading", { occurrences: 2 })[0]).toMatchObject({
    code: "repeated-occurrence",
    severity: "info",
  });
  expect(JSON.stringify(check("heading", { occurrences: 2 }))).not.toContain(
    value.heading,
  );
});
