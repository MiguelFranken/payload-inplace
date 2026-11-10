import type { BlocksFieldClientProps } from "payload";
import { describe, expect, it, vi } from "vitest";
import { getArrayItemPath } from "@payload-inplace/core/annotations";
import { locateVersionChange } from "../../src/frontend/controllers/version-location";
import { collectSections, type NativeSection } from "../../src/schema/tree";

const root = "page.layout";
const field = {
  name: "layout",
  type: "blocks",
  blocks: [
    {
      slug: "group",
      fields: [
        {
          name: "columns",
          type: "array",
          fields: [
            {
              name: "blocks",
              type: "blocks",
              blocks: [
                { slug: "text", fields: [{ name: "title", type: "text" }] },
              ],
            },
          ],
        },
      ],
    },
  ],
} as BlocksFieldClientProps["field"];

const parentPath = getArrayItemPath(root, "parent");
const columnPath = getArrayItemPath(`${parentPath}.columns`, "right.1");
const blockPath = getArrayItemPath(`${columnPath}.blocks`, "child");
const titlePath = `${blockPath}.title`;

function group(id: string, titles: string[]) {
  return {
    id,
    blockType: "group",
    columns: titles.map((title, index) => ({
      id: index ? "right.1" : "left",
      blocks: [{ id: "child", blockType: "text", title }],
    })),
  };
}

function setup() {
  const parent = group("parent", ["left", "right"]);
  const other = group("parent-extra", ["unrelated"]);
  const layout = [parent, other];
  const document = { page: { layout } };
  const sections = () => collectSections({ data: layout, root, field });
  return { document, layout, parent, sections };
}

describe("locateVersionChange", () => {
  it("finds an exact nested identity after native rows reorder", () => {
    const { document, layout, parent, sections } = setup();
    layout.reverse();
    parent.columns.reverse();
    const show = vi.fn(() => true);

    expect(locateVersionChange(titlePath, document, sections(), show)).toBe(
      true,
    );
    expect(show).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        path: "page.layout.1.columns.0.blocks.0",
        identity: { root, blockId: "child", ancestors: ["parent", "right.1"] },
      }),
    );
  });

  it("falls back to the rendered ancestor when the closest block is hidden", () => {
    const { document, sections } = setup();
    const show = vi.fn((section: NativeSection) => section.depth === 0);

    expect(locateVersionChange(blockPath, document, sections(), show)).toBe(
      true,
    );
    expect(
      show.mock.calls.map(([section]) => section.identity.blockId),
    ).toEqual(["child", "parent"]);
  });

  it("locates the parent of a removed nested block", () => {
    const { document, parent, sections } = setup();
    parent.columns[1]!.blocks.length = 0;
    const show = vi.fn(() => true);

    expect(locateVersionChange(blockPath, document, sections(), show)).toBe(
      true,
    );
    expect(show).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        identity: { root, blockId: "parent", ancestors: [] },
      }),
    );
  });

  it("does not confuse an ID prefix with an exact row segment", () => {
    const { document, sections } = setup();
    const show = vi.fn(() => true);

    expect(
      locateVersionChange(
        `${getArrayItemPath(root, "parent-ex")}.title`,
        document,
        sections(),
        show,
      ),
    ).toBe(false);
    expect(show).not.toHaveBeenCalled();
  });

  it("rejects a stale section index that points at another nested identity", () => {
    const { document, parent, sections } = setup();
    const stale = sections();
    parent.columns.reverse();
    const show = vi.fn(() => true);

    expect(locateVersionChange(titlePath, document, stale, show)).toBe(true);
    expect(show).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        identity: { root, blockId: "parent", ancestors: [] },
      }),
    );
  });

  it("reports unavailable when no ancestor renders", () => {
    const { document, sections } = setup();
    expect(
      locateVersionChange(titlePath, document, sections(), () => false),
    ).toBe(false);
  });
});
