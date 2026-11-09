import { describe, it, expect } from "vitest";
import {
  mergePreviewData,
  normalizePreviewRows,
} from "../../src/state/preview-data";
describe("native optimistic projection", () => {
  it("keeps populated relationships only for the same ID and matches reordered rows by stable IDs", () => {
    const initial = {
      layout: [
        { id: "a", heading: "A", image: { id: 1, url: "/one.png" } },
        { id: "b", heading: "B", image: { id: 2, url: "/two.png" } },
      ],
    };
    const current = {
      layout: [
        { id: "b", heading: "New B", image: 2 },
        { id: "a", heading: "New A", image: 3 },
      ],
      _veActivation: "private",
    };
    expect(mergePreviewData(initial, current)).toEqual({
      layout: [
        { id: "b", heading: "New B", image: { id: 2, url: "/two.png" } },
        { id: "a", heading: "New A", image: 3 },
      ],
    });
    expect(initial.layout[0].heading).toBe("A");
  });
  it("does not resurrect deleted rows, cleared relationships or removed array values", () => {
    expect(
      mergePreviewData(
        {
          layout: [{ id: "a" }, { id: "b" }],
          image: { id: 1, url: "/one.png" },
          values: ["old"],
        },
        { layout: [], image: null, values: ["new"] },
      ),
    ).toEqual({ layout: [], image: null, values: ["new"] });
  });
});

it("normalizes only native row-count sentinels, preserving real numeric fields", () => {
  expect(
    normalizePreviewRows(
      { layout: [{ id: "a", items: 0, count: 0 }] },
      { "layout.0.items": { rows: [] } },
    ),
  ).toEqual({ layout: [{ id: "a", items: [], count: 0 }] });
});
