import { expect, it } from "vitest";
import { operationalSnapshotMatches } from "../../src/server/operational-write";

const live = {
  id: 1,
  _status: "published",
  _veRevision: 1,
  title: "Live",
  layout: [{ id: "hero", blockType: "hero", heading: "Published heading" }],
  scheduling: { capacity: 10, venue: "Studio" },
};

const paths = ["scheduling.capacity"];
it("permits only the bounded operational change in a complete live snapshot", () => {
  expect(
    operationalSnapshotMatches(
      {
        ...live,
        _veRevision: 2,
        scheduling: { ...live.scheduling, capacity: 12 },
      },
      live,
      paths,
    ),
  ).toBe(true);
});
it("rejects sparse patches, editorial drafts, sibling changes and unknown additions", () => {
  for (const candidate of [
    { scheduling: { capacity: 12 } },
    { ...live, title: "Unpublished title" },
    {
      ...live,
      layout: [{ ...live.layout[0], heading: "Unpublished heading" }],
    },
    { ...live, scheduling: { capacity: 12, venue: "Elsewhere" } },
    { ...live, unexpected: "value" },
  ])
    expect(operationalSnapshotMatches(candidate, live, paths)).toBe(false);
});
it("rejects empty and unsafe field scopes", () => {
  for (const paths of [
    [],
    ["__proto__.polluted"],
    ["scheduling.0"],
    ["constructor.prototype"],
  ])
    expect(operationalSnapshotMatches(live, live, paths)).toBe(false);
});
