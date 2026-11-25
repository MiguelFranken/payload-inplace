import { expect, it, vi } from "vitest";
import {
  applyCommand,
  type BlockCommand,
} from "../../src/adapters/payload-form";
import { StructuralHistory } from "../../src/state/history";

const identity = (blockId: string, ancestors: string[] = []) => ({
  root: "layout",
  blockId,
  ancestors,
});

function fixture() {
  const json = [
    { id: "business", blockType: "text", label: "First" },
    { id: "business", blockType: "text", label: "Second" },
  ];
  const relationship = { id: "record", properties: [...json] };
  const children = [
    { id: "child", blockType: "text" },
    { id: "sibling", blockType: "text" },
  ];
  const columns = [{ id: "column", children }];
  const rows = [
    { id: "hero", blockType: "hero", json, relationship, columns },
    { id: "other", blockType: "text" },
  ];
  const nested = "layout.0.columns.0.children";
  const metadata = (rows: { id: string; blockType?: string }[]) => ({
    value: rows.length,
    rows: rows.map(({ id, blockType }) => ({ id, blockType })),
  });
  const form = {
    getDataByPath: (path: string) => (path === nested ? children : rows),
    getFields: () => ({
      layout: metadata(rows),
      "layout.0.id": { value: "hero" },
      "layout.0.json": { value: json },
      "layout.0.relationship": { value: relationship },
      "layout.0.columns": metadata(columns),
      [nested]: metadata(children),
    }),
    moveFieldRow: vi.fn(),
    removeFieldRow: vi.fn(),
    addFieldRow: vi.fn(),
    setModified: vi.fn(),
  };
  const history = new StructuralHistory("layout");
  const run = (command: BlockCommand, container = "layout") =>
    applyCommand(
      form as unknown as Parameters<typeof applyCommand>[0],
      "layout",
      "pages.layout",
      command,
      {
        container,
        disabled: false,
        min: 0,
        allowed: ["hero", "text"],
        history,
      },
    );
  return { rows, children, nested, json, relationship, form, history, run };
}

it("moves, removes and duplicates native blocks while preserving atomic field values", () => {
  const { run, form, json, relationship } = fixture();
  const before = structuredClone({ json, relationship });

  expect(
    run({ type: "move", identity: identity("hero"), over: identity("other") }),
  ).toBeUndefined();
  expect(form.moveFieldRow).toHaveBeenCalledExactlyOnceWith({
    path: "layout",
    moveFromIndex: 0,
    moveToIndex: 1,
  });
  expect(run({ type: "remove", identity: identity("hero") })).toBeUndefined();
  expect(form.removeFieldRow).toHaveBeenCalledExactlyOnceWith({
    path: "layout",
    rowIndex: 0,
  });
  expect(
    run({ type: "duplicate", identity: identity("hero") }),
  ).toBeUndefined();
  expect(form.addFieldRow).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      path: "layout",
      blockType: "hero",
      rowIndex: 1,
      subFieldState: expect.objectContaining({
        json: expect.objectContaining({ value: before.json }),
        relationship: expect.objectContaining({ value: before.relationship }),
      }),
    }),
  );
  expect({ json, relationship }).toEqual(before);
});

it("resolves real nested rows and rejects duplicate native IDs before dispatch", () => {
  const { run, form, nested, children } = fixture();
  const child = identity("child", ["hero", "column"]);
  expect(run({ type: "remove", identity: child }, nested)).toBeUndefined();
  expect(form.removeFieldRow).toHaveBeenCalledExactlyOnceWith({
    path: nested,
    rowIndex: 0,
  });

  form.removeFieldRow.mockClear();
  children.push({ ...children[0]! });
  expect(() => run({ type: "remove", identity: child }, nested)).toThrow(
    `Duplicate row identity in ${nested}`,
  );
  expect(form.removeFieldRow).not.toHaveBeenCalled();
});
