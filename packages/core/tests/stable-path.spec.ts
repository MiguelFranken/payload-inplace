import { expect, it } from "vitest";
import { stableDataPath } from "../src/stable-path.js";
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
