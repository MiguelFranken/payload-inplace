import { expect, it } from "vitest";
import { stableDataPath } from "../src/stable-path";
import { readStableValue, writeStableValue } from "../src/stable-value";

it("maps named-tab and nested array paths to encoded stable identities after reordering", () => {
  const doc = {
    presentation: {
      layout: [
        {
          id: "section.with.dot",
          chapters: [
            { id: "a/b", heading: "A" },
            { id: "second", heading: "B" },
          ],
        },
      ],
    },
  };
  expect(stableDataPath(doc, "presentation.layout.0.chapters.0.heading")).toBe(
    "presentation.layout.@section%2Ewith%2Edot.chapters.@a%2Fb.heading",
  );
  doc.presentation.layout[0].chapters.reverse();
  expect(stableDataPath(doc, "presentation.layout.0.chapters.0.heading")).toBe(
    "presentation.layout.@section%2Ewith%2Edot.chapters.@second.heading",
  );
});

const rowIds = [42, "日本語", "100%", "with.dot", "with/slash"] as const;

function nestedDocument() {
  return {
    layout: rowIds.map((id, outerIndex) => ({
      id,
      title: `Section ${outerIndex}`,
      items: rowIds.map((id, innerIndex) => ({
        id,
        title: `${outerIndex}:${innerIndex}`,
        caption: "Keep",
      })),
    })),
  };
}

it("round-trips every nested leaf after both native row lists reorder", () => {
  const original = nestedDocument();
  const reordered = nestedDocument();
  reordered.layout.reverse();
  for (const section of reordered.layout) section.items.reverse();
  const expected = structuredClone(reordered);

  for (const [outerIndex, section] of original.layout.entries()) {
    for (const [innerIndex, item] of section.items.entries()) {
      const path = stableDataPath(
        original,
        `layout.${outerIndex}.items.${innerIndex}.title`,
      );
      expect(path).toBeDefined();
      expect(readStableValue(reordered, path!)).toBe(item.title);
      writeStableValue(reordered, path!, `Updated ${item.title}`);
      expected.layout[rowIds.length - 1 - outerIndex]!.items[
        rowIds.length - 1 - innerIndex
      ]!.title = `Updated ${item.title}`;
      expect(reordered).toEqual(expected);
    }
  }
});

it.each(["removed", "ambiguous"])(
  "fails closed when a nested row becomes %s after conversion",
  (change) => {
    const document = nestedDocument();
    const items = document.layout[0]!.items;
    const path = stableDataPath(document, "layout.0.items.4.title");
    expect(path).toBeDefined();

    if (change === "removed") items.pop();
    else items.unshift({ ...items[4]!, title: "Duplicate" });
    const before = structuredClone(document);

    expect(() => readStableValue(document, path!)).toThrow("row identity");
    expect(() => writeStableValue(document, path!, "Wrong row")).toThrow(
      "row identity",
    );
    expect(document).toEqual(before);
  },
);
it("declines missing/non-identified rows and unsafe paths without returning a different target", () => {
  for (const path of [
    "layout.0.heading",
    "layout.00.heading",
    "layout.2.heading",
    "__proto__.name",
    "constructor.name",
    "layout..heading",
  ])
    expect(
      stableDataPath({ layout: [{ heading: "No ID" }] }, path),
    ).toBeUndefined();
});
