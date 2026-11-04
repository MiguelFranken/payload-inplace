import { expect, it } from "vitest";
import {
  structureError,
  structureTransitionError,
} from "../../src/state/policy.js";
const hero = { blockType: "hero" },
  dates = { blockType: "dates" },
  text = { blockType: "text" };
const policy = { first: "hero", exactlyOne: ["hero", "dates"] };
it("lets an empty draft build two required sections one step at a time", () => {
  expect(structureTransitionError([], [hero], policy)).toBeUndefined();
  expect(
    structureTransitionError([hero], [hero, text], policy),
  ).toBeUndefined();
  expect(
    structureTransitionError([hero, text], [hero, text, dates], policy),
  ).toBeUndefined();
  expect(structureError([hero, text], policy)).toContain("dates");
  expect(structureError([hero, text, dates], policy)).toBeUndefined();
});
it("protects existing required sections and the leading hero", () => {
  for (const next of [[hero], [hero, dates, dates], [dates, hero], [dates]])
    expect(structureTransitionError([hero, dates], next, policy)).toBeTruthy();
  expect(structureTransitionError([], [text], policy)).toBeTruthy();
});
it("allows a duplicate legacy singleton to be repaired without permitting more duplicates", () => {
  expect(
    structureTransitionError([hero, dates, dates], [hero, dates], policy),
  ).toBeUndefined();
  expect(
    structureTransitionError(
      [hero, dates, dates],
      [hero, dates, dates, dates],
      policy,
    ),
  ).toBeTruthy();
});
