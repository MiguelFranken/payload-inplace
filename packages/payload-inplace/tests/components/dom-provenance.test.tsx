import { expect, it } from "vitest";
import { editable } from "@payload-inplace/core/editable";
import { findBoundBlock } from "../../src/preview/dom-target";
it("keeps equal row IDs in separate documents out of another scope’s canvas geometry", () => {
  const identity = { root: "layout", blockId: "same-id" };
  const global = { kind: "global" as const, global: "header" },
    page = { kind: "collection" as const, collection: "pages", id: 1 };
  const root = document.createElement("main");
  const make = (reference: typeof global | typeof page) => {
    const node = document.createElement("section");
    for (const [key, value] of Object.entries(
      editable(reference, { enabled: true }).block(identity).attrs,
    ))
      node.setAttribute(key, value);
    root.append(node);
    return node;
  };
  const first = make(global),
    second = make(page);
  expect(findBoundBlock(root, identity, page)).toBe(second);
  expect(findBoundBlock(root, identity, global)).toBe(first);
  expect(findBoundBlock(root, identity)).toBeUndefined();
});
