import { expect, test } from "vitest";
import { sectionMoveDestinations } from "../../src/frontend/controllers/section-moves";
import type { NativeSection } from "../../src/schema/tree";

const parent = "layout";
const section = (index: number, container = parent): NativeSection =>
  ({
    identity: { root: parent, blockId: `${container}.${index}` },
    index,
    parent: container,
    readOnly: false,
  }) as NativeSection;

test("only lists other positions in the same native container", () => {
  const sections = [section(0), section(1), section(2), section(2, "nested")];
  const rows = [
    { blockType: "hero" },
    { blockType: "text" },
    { blockType: "text" },
  ];
  expect(sectionMoveDestinations(sections[1], sections, rows)).toEqual([
    sections[0],
    sections[2],
  ]);
  expect(
    sectionMoveDestinations({ ...sections[1], readOnly: true }, sections, rows),
  ).toEqual([]);
});

test("keeps a fixed first block and supports repairing an existing invalid order", () => {
  const sections = [section(0), section(1), section(2)];
  const valid = [
    { blockType: "hero" },
    { blockType: "text" },
    { blockType: "text" },
  ];
  expect(sectionMoveDestinations(sections[0], sections, valid, "hero")).toEqual(
    [],
  );
  expect(sectionMoveDestinations(sections[1], sections, valid, "hero")).toEqual(
    [sections[2]],
  );
  const invalid = [valid[1], valid[0], valid[2]];
  expect(
    sectionMoveDestinations(sections[1], sections, invalid, "hero"),
  ).toEqual([sections[0]]);
  expect(
    sectionMoveDestinations(sections[0], sections, invalid, "hero"),
  ).toEqual([sections[1], sections[2]]);
});
