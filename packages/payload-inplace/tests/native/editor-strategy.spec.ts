import { expect, it } from "vitest";
import { resolveEditorStrategy } from "../../src/schema/editor-strategy.js";
import type { ClientField, FieldState } from "payload";
it("uses one strategy classifier for permissions, native/custom overrides and async field initialization", () => {
  const args = {
    field: { name: "body", type: "richText" } as ClientField,
    permitted: true,
    markupSafe: true,
    lexicalFeatures: ["bold"],
    state: {
      value: {},
      customComponents: { Field: "native-lexical" },
    } as FieldState,
  };
  expect(resolveEditorStrategy(args).kind).toBe("richText");
  expect(
    resolveEditorStrategy({ ...args, lexicalFeatures: undefined }).kind,
  ).toBe("native");
  expect(resolveEditorStrategy({ ...args, state: undefined }).kind).toBe(
    "pending",
  );
  expect(resolveEditorStrategy({ ...args, permitted: false }).kind).toBe(
    "unavailable",
  );
  expect(
    resolveEditorStrategy({
      ...args,
      state: { ...args.state, passesCondition: false },
    }).kind,
  ).toBe("unavailable");
  expect(
    resolveEditorStrategy({
      ...args,
      field: {
        name: "body",
        type: "richText",
        admin: { components: { Field: "custom" } },
      } as unknown as ClientField,
    }).reason,
  ).toBe("custom");
  expect(resolveEditorStrategy({ ...args, edit: "panel" }).kind).toBe("native");
});
