import { expect, it } from "vitest";
import { claimNativeFields } from "../src/state/field-claims";
it("retains unchanged owner identities across native field renders", () => {
  const claims = [{ id: "panel", paths: ["layout.0.image"] }];
  expect(claimNativeFields(claims, { ...claims[0] })).toBe(claims);
});
it("rejects duplicate, ancestor and descendant owners but permits neighboring rows", () => {
  const claims = [{ id: "panel", paths: ["layout.1"] }];
  for (const path of ["layout.1", "layout", "layout.1.image"])
    expect(claimNativeFields(claims, { id: "another", paths: [path] })).toBe(
      claims,
    );
  expect(
    claimNativeFields(claims, { id: "other-row", paths: ["layout.10"] }),
  ).toHaveLength(2);
});
it("moves an existing owner atomically when a selection-relative slot changes", () => {
  const claims = [{ id: "panel", paths: ["layout.0.image"] }];
  expect(
    claimNativeFields(claims, { id: "panel", paths: ["layout.1.image"] }),
  ).toEqual([{ id: "panel", paths: ["layout.1.image"] }]);
});
it("releases old paths when a moving owner must wait for another panel", () => {
  const claims = [
    { id: "panel", paths: ["layout.0.image"] },
    { id: "other", paths: ["layout.1"] },
  ];
  expect(
    claimNativeFields(claims, { id: "panel", paths: ["layout.1.image"] }),
  ).toEqual([claims[1]]);
});
