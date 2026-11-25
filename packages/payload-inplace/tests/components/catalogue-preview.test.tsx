import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { BlocksFieldClientProps } from "payload";
import { useNativeStructure } from "../../src/frontend/controllers/native-structure";
import { projectCatalogue } from "../../src/server/catalogue";

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { blocksMap: {} } }),
  useDocumentInfo: () => ({
    docConfig: { fields: [{ type: "blocks", name: "layout", blocks: [] }] },
  }),
  useField: () => ({ rows: [] }),
  useForm: () => ({
    getDataByPath: () => [],
    getField: () => undefined,
    getFields: () => ({}),
  }),
  useFormFields: (select: (state: [object]) => unknown) => select([{}]),
  useServerFunctions: () => ({}),
}));

it.each([
  { maxRows: 0, expected: 0 },
  { maxRows: 1, expected: 1 },
  { maxRows: undefined, expected: 100 },
])(
  "carries up to $expected nested example rows into the picker preview",
  ({ maxRows, expected }) => {
    const field = {
      name: "layout",
      type: "blocks",
      blocks: [
        {
          slug: "parent",
          fields: [
            {
              name: "children",
              type: "blocks",
              maxRows,
              blocks: [
                { slug: "child", fields: [{ name: "heading", type: "text" }] },
              ],
            },
          ],
        },
      ],
    } as BlocksFieldClientProps["field"];
    const children = Array.from({ length: 102 }, (_, index) => ({
      blockType: "child",
      heading: `Example ${index}`,
    }));
    const catalogue = projectCatalogue(
      { parent: { example: { children } } },
      field,
      true,
      {},
    );
    const example = catalogue.parent!.example!;
    const { result } = renderHook(() =>
      useNativeStructure({
        root: "layout",
        collection: "pages",
        nonce: "preview",
        field,
        permissions: true,
        disabled: false,
        onError: vi.fn(),
      }),
    );
    const preview = result.current.previewInsertion(
      { kind: "list", root: "layout", field: "" },
      "parent",
      example,
    );
    const expectedRows = children.slice(0, expected).map((row) => ({
      ...row,
      id: expect.stringMatching(/^ve-preview-/),
    }));
    expect(example.children).toEqual(expectedRows);
    expect(preview).toMatchObject({ row: { children: expectedRows } });
  },
);
