import { expect, it } from "vitest";
import { indexBlocks, resolveIdentity } from "../src/identity";

it("matches ordered ancestor IDs exactly even when sibling branches reuse a leaf ID", () => {
  const leaf = { id: "shared", blockType: "hero" };
  const single = { id: "a/b", children: [leaf] };
  const nested = { id: "a", groups: [{ id: "b", children: [leaf] }] };
  const resolve = (rows: unknown[], ancestors: string[]) =>
    resolveIdentity(indexBlocks(rows, "layout"), {
      root: "layout",
      blockId: leaf.id,
      ancestors,
    })?.path;

  expect(resolve([single], ["a", "b"])).toBeUndefined();
  expect(resolve([nested], ["a/b"])).toBeUndefined();
  expect(resolve([single, nested], ["a/b"])).toBe("layout.0.children.0");
  expect(resolve([single, nested], ["a", "b"])).toBe(
    "layout.1.groups.0.children.0",
  );
  expect(resolve([nested, single], ["a/b"])).toBe("layout.1.children.0");
  expect(resolve([nested, single], ["a", "b"])).toBe(
    "layout.0.groups.0.children.0",
  );
  expect(resolve([nested, single], ["b", "a"])).toBeUndefined();
});
