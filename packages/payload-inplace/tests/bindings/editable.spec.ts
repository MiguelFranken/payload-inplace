import { expect, it } from "vitest";
import { editable, isBindingPath } from "../../src/exports/bindings.js";
import { documentKey, parseDocumentKey } from "../../src/exports/bindings.js";
it("binds stable nested row terminals without repeating document or block provenance", () => {
  const e = editable(
    { kind: "collection", collection: "pages", id: "a:b" },
    { enabled: true },
  );
  const block = e.block<{
    heading: string;
    items: { heading: string; links: { title: string }[] }[];
  }>({ root: "layout", blockId: "hero" });
  const row = block.row("items", "row.with.dots");
  expect(row.attrs["data-ve-field"]).toBe("items.@row%2Ewith%2Edots");
  expect(row.field("heading")["data-ve-field"]).toBe(
    "items.@row%2Ewith%2Edots.heading",
  );
  expect(row.row("links", "link").field("title")["data-ve-field"]).toBe(
    "items.@row%2Ewith%2Edots.links.@link.title",
  );
  expect(block.group(["heading", "items"])["data-ve-fields"]).toBe(
    '["heading","items"]',
  );
  expect(block.list("items")["data-ve-list"]).toBe("items");
  expect(e.list("layout")["data-ve-block"]).toBeUndefined();
  // @ts-expect-error Known block paths reject unknown fields.
  block.field("missing");
  // @ts-expect-error Scalars cannot be addressed as array rows.
  block.row("heading", "id");
});
it("disabled bindings emit no metadata and unsafe dynamic paths fail closed", () => {
  const e = editable({ kind: "global", global: "header" });
  const block = e.block({ root: "layout", blockId: "a" });
  expect(block.field("__proto__.name")).toEqual({});
  expect(block.list("rows")).toEqual({});
  expect(e.list("layout")).toEqual({});
  for (const path of [
    "",
    "a..b",
    "constructor.name",
    "a.__proto__.b",
    "items.@%XX.name",
  ])
    expect(isBindingPath(path)).toBe(false);
  expect(() =>
    editable({ kind: "global", global: "header" }, { enabled: true })
      .block({ root: "layout", blockId: "a" })
      .field("constructor.name"),
  ).toThrow(TypeError);
});
it("round-trips encoded document references and rejects malformed metadata", () => {
  const ref = {
    kind: "collection",
    collection: "pages:de",
    id: "with:colon.and.dots",
  } as const;
  expect(parseDocumentKey(documentKey(ref))).toEqual(ref);
  expect(parseDocumentKey("c:pages:%XX")).toBeUndefined();
  expect(parseDocumentKey("g:header:extra")).toBeUndefined();
});

it("supports dynamic schema rows and groups without exposing internal prefix arguments", () => {
  const e = editable(
    { kind: "collection", collection: "pages", id: "1" },
    { enabled: true },
  );
  const b = e.block({ root: "layout", blockId: "b" });
  expect(
    b.row("cards", "a").scope("link").field("label")["data-ve-field"],
  ).toBe("cards.@a.link.label");
  // @ts-expect-error Internal prefixes are not part of the consumer API.
  e.block({ root: "layout", blockId: "b" }, "private");
});
