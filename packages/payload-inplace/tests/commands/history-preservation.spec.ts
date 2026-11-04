import { expect, it } from "vitest";
import { StructuralHistory } from "../../src/state/history.js";
import { restoreRoot } from "../../src/adapters/payload-form.js";
function fields(rows: { id: string; heading: string }[], root = "layout"): any {
  const result: any = {
    _veRevision: { value: 9 },
    title: { value: "Current metadata" },
    [root]: {
      value: rows.length,
      rows: rows.map((row) => ({ id: row.id, blockType: "text" })),
    },
  };
  rows.forEach((row, index) => {
    result[`${root}.${index}.id`] = { value: row.id };
    result[`${root}.${index}.heading`] = { value: row.heading };
  });
  return result;
}
function native(initial: any) {
  let value = initial;
  return {
    getFields: () => value,
    dispatchFields: (action: any) => {
      if (action.type === "REMOVE") delete value[action.path];
      else value = { ...value, ...action.formState };
    },
    setModified: () => {},
    replace: (next: any) => {
      value = next;
    },
  } as any;
}
const row = (id: string, heading = id) => ({ id, heading });
it("undo and redo a move preserve later typing and rows added by native controls", () => {
  const before = fields([row("a"), row("b"), row("c")]),
    history = new StructuralHistory("layout");
  history.checkpoint(before, "layout", { kind: "move", id: "c" });
  const form = native(
    fields([
      row("a"),
      row("c"),
      row("native-extra"),
      row("b", "Typed after the move"),
    ]),
  );
  expect(
    restoreRoot(form, "layout", history.undo(form.getFields())!),
  ).toBeUndefined();
  expect(form.getFields().layout.rows.map((r: any) => r.id)).toEqual([
    "a",
    "native-extra",
    "b",
    "c",
  ]);
  expect(form.getFields()["layout.2.heading"].value).toBe(
    "Typed after the move",
  );
  expect(form.getFields()._veRevision.value).toBe(9);
  expect(form.getFields().title.value).toBe("Current metadata");
  restoreRoot(form, "layout", history.redo(form.getFields())!);
  expect(form.getFields().layout.rows.map((r: any) => r.id)).toEqual([
    "a",
    "c",
    "native-extra",
    "b",
  ]);
  expect(form.getFields()["layout.3.heading"].value).toBe(
    "Typed after the move",
  );
});
it("undo a native add removes only its allocated ID; redo restores its latest content", () => {
  const history = new StructuralHistory("layout");
  history.checkpoint(fields([row("a")]), "layout", { kind: "add" });
  expect(history.canUndo).toBe(false);
  const form = native(fields([row("a"), row("new", "Typed into the new row")]));
  expect(history.captureResult(form.getFields())).toBe(true);
  expect(history.canUndo).toBe(true);
  form.replace(
    fields([
      row("a", "Updated original"),
      row("external"),
      row("new", "Latest new text"),
    ]),
  );
  restoreRoot(form, "layout", history.undo(form.getFields())!);
  expect(form.getFields().layout.rows.map((r: any) => r.id)).toEqual([
    "a",
    "external",
  ]);
  expect(form.getFields()["layout.0.heading"].value).toBe("Updated original");
  restoreRoot(form, "layout", history.redo(form.getFields())!);
  expect(form.getFields().layout.rows.map((r: any) => r.id)).toEqual([
    "a",
    "external",
    "new",
  ]);
  expect(form.getFields()["layout.2.heading"].value).toBe("Latest new text");
});
it("nested undo follows parent row identity after the parent moves and preserves sibling data", () => {
  const before = {
    ...fields([row("parent-a"), row("parent-b")]),
    ...fields([row("child-a"), row("child-b")], "layout.0.children"),
  };
  const history = new StructuralHistory("layout");
  history.checkpoint(before, "layout.0.children", {
    kind: "remove",
    id: "child-b",
  });
  const current = {
    ...fields([row("parent-b", "Updated sibling"), row("parent-a")]),
    ...fields([row("child-a", "New child text")], "layout.1.children"),
  };
  const form = native(current);
  restoreRoot(form, "layout", history.undo(form.getFields())!);
  expect(form.getFields().layout.rows.map((r: any) => r.id)).toEqual([
    "parent-b",
    "parent-a",
  ]);
  expect(
    form.getFields()["layout.1.children"].rows.map((r: any) => r.id),
  ).toEqual(["child-a", "child-b"]);
  expect(form.getFields()["layout.1.children.0.heading"].value).toBe(
    "New child text",
  );
  expect(form.getFields()["layout.0.heading"].value).toBe("Updated sibling");
});
it("a removed parent cannot redirect nested undo onto a different row", () => {
  const before = {
    ...fields([row("a"), row("b")]),
    ...fields([row("child")], "layout.0.children"),
  };
  const history = new StructuralHistory("layout");
  history.checkpoint(before, "layout.0.children", {
    kind: "remove",
    id: "child",
  });
  const current = {
    ...fields([row("b")]),
    ...fields([row("unrelated")], "layout.0.children"),
  };
  const form = native(current);
  expect(restoreRoot(form, "layout", history.undo(form.getFields())!)).toMatch(
    /removed/,
  );
  expect(form.getFields()["layout.0.children.0.id"].value).toBe("unrelated");
});
