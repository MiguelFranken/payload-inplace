import { expect, it, vi } from "vitest";
import { applyCommand } from "../../src/adapters/payload-form.js";
import { StructuralHistory } from "../../src/state/history.js";

const identity = (blockId: string) => ({ root: "layout", blockId });

function fixture() {
  const data = [
    { id: "hero", blockType: "hero" },
    { id: "a", blockType: "text" },
    { id: "b", blockType: "text" },
  ];
  const form: any = {
    getDataByPath: () => data,
    getFields: () => ({
      layout: { value: 3, rows: data.map((r) => ({ ...r })) },
    }),
    moveFieldRow: vi.fn(),
    setModified: vi.fn(),
  };
  const history = new StructuralHistory("layout");
  return {
    form,
    history,
    options: {
      disabled: false,
      min: 1,
      allowed: ["hero", "text"],
      history,
      policy: { first: "hero" },
    },
  };
}
it("moves using current scoped identities and records a single native undo step", () => {
  const { form, history, options } = fixture();
  expect(
    applyCommand(
      form,
      "layout",
      "pages.layout",
      { type: "move", identity: identity("b"), over: identity("a") },
      options,
    ),
  ).toBeUndefined();
  expect(form.moveFieldRow).toHaveBeenCalledExactlyOnceWith({
    path: "layout",
    moveFromIndex: 2,
    moveToIndex: 1,
  });
  expect(history.undo(form.getFields())?.layout.rows?.map((r) => r.id)).toEqual(
    ["hero", "a", "b"],
  );
  expect(history.canUndo).toBe(false);
});
it("rejects a policy-breaking drop, stale target and read-only mutation without history or writes", () => {
  for (const variant of ["policy", "stale", "readonly"]) {
    const { form, history, options } = fixture();
    const error = applyCommand(
      form,
      "layout",
      "pages.layout",
      {
        type: "move",
        identity: identity("b"),
        over: identity(variant === "stale" ? "gone" : "hero"),
      },
      { ...options, disabled: variant === "readonly" },
    );
    expect(error).toBeTruthy();
    expect(form.moveFieldRow).not.toHaveBeenCalled();
    expect(history.canUndo).toBe(false);
  }
});
it("a cancelled/no-op drop has no native mutation or checkpoint", () => {
  const { form, history, options } = fixture();
  applyCommand(
    form,
    "layout",
    "pages.layout",
    { type: "move", identity: identity("a"), over: identity("a") },
    options,
  );
  expect(form.moveFieldRow).not.toHaveBeenCalled();
  expect(history.canUndo).toBe(false);
});
it("refuses cross-container drops even when both row identities are valid", () => {
  const { form, history, options } = fixture();
  form.getDataByPath = () => [
    {
      id: "hero",
      blockType: "hero",
      children: [{ id: "nested", blockType: "text" }],
    },
  ];
  expect(
    applyCommand(
      form,
      "layout",
      "pages.layout",
      {
        type: "move",
        identity: identity("hero"),
        over: { root: "layout", blockId: "nested", ancestors: ["hero"] },
      },
      options,
    ),
  ).toMatch(/same block field/);
  expect(form.moveFieldRow).not.toHaveBeenCalled();
  expect(history.canUndo).toBe(false);
});

it("inserts a required first section into a repairable native draft and permits gradual minimum-row construction", () => {
  const { form, options } = fixture();
  form.getDataByPath = () => [{ id: "text", blockType: "text" }];
  form.addFieldRow = vi.fn();
  expect(
    applyCommand(
      form,
      "layout",
      "pages.layout",
      { type: "add", blockType: "hero", at: "start" },
      { ...options, min: 3 },
    ),
  ).toBeUndefined();
  expect(form.addFieldRow).toHaveBeenCalledExactlyOnceWith({
    path: "layout",
    schemaPath: "pages.layout",
    blockType: "hero",
    rowIndex: 0,
  });
});
