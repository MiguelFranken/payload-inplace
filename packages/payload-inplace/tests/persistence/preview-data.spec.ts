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

it("merges polymorphic relationship lists by collection and ID across reorders", () => {
  const photo = {
    relationTo: "photos",
    value: { id: 7, slug: "photo", url: "/photo.png" },
  };
  const file = {
    relationTo: "files",
    value: { id: 7, slug: "file", url: "/file.pdf" },
  };
  expect(
    mergePreviewData(
      [photo, file],
      [
        { relationTo: "files", value: 7 },
        { relationTo: "photos", value: { id: "7", slug: "edited" } },
        { relationTo: "files", value: { id: 8, filename: "new.pdf" } },
      ],
    ),
  ).toEqual([
    file,
    {
      relationTo: "photos",
      value: { ...photo.value, id: "7", slug: "edited" },
    },
    { relationTo: "files", value: { id: 8, filename: "new.pdf" } },
  ]);
  expect(
    mergePreviewData([photo], [{ relationTo: "files", value: 7 }]),
  ).toEqual([{ relationTo: "files", value: 7 }]);
});

it("drops fields from a different partially populated single-collection reference", () => {
  const initial = { asset: { id: 7, slug: "old", url: "/old.png" } };
  const current = { asset: { id: 8, filename: "new.png" } };

  expect(mergePreviewData(initial, current)).toEqual(current);
  expect(mergePreviewData(current, initial)).toEqual(initial);
  expect(
    mergePreviewData(initial, { asset: { id: "7", slug: "new" } }),
  ).toEqual({
    asset: { id: "7", slug: "new", url: "/old.png" },
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
