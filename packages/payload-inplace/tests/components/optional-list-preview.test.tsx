import type { BlocksFieldClientProps } from "payload";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useNativeStructure } from "../../src/frontend/controllers/native-structure";
import { InlinePreviewContext } from "../../src/frontend/inline-preview";
import { useEditorPreviewData } from "../../src/frontend/preview-data";
import {
  TransientPreviewProvider,
  useTransientPreview,
} from "../../src/frontend/transient-preview";

const { form, fields, getFormState } = vi.hoisted(() => ({
  form: {
    getData: vi.fn(),
    getDataByPath: vi.fn(),
    getField: vi.fn(),
    getFields: vi.fn(),
    dispatchFields: vi.fn(),
    addFieldRow: vi.fn(),
    setModified: vi.fn(),
  },
  fields: {},
  getFormState: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: {} }),
  useDocumentInfo: () => ({ docConfig: { fields: [groupField] } }),
  useField: () => ({}),
  useForm: () => form,
  useFormFields: (select: (state: [unknown]) => unknown) => select([fields]),
  useServerFunctions: () => ({ getFormState }),
}));

const field = {
  type: "blocks",
  name: "layout",
  required: false,
  blocks: [{ slug: "text", fields: [{ type: "text", name: "heading" }] }],
} as BlocksFieldClientProps["field"];
const groupField = { type: "group", name: "group", fields: [field] };
const root = "group.layout";
const target = { kind: "list" as const, root, field: "" };

function ActivePreview({ children }: { children: ReactNode }) {
  return (
    <InlinePreviewContext
      value={{
        active: false,
        begin: vi.fn(),
        end: vi.fn(),
        synchronized: vi.fn(),
      }}
    >
      <TransientPreviewProvider capable>{children}</TransientPreviewProvider>
    </InlinePreviewContext>
  );
}

it.each([
  { label: "absent", group: {} },
  { label: "a zero sentinel", group: { layout: 0 } },
  { label: "an empty array", group: { layout: Object.freeze([]) } },
])("previews the first section when the native list is $label", ({ group }) => {
  const initial = Object.freeze({ group: Object.freeze(group) });
  form.getData.mockReturnValue(initial);
  form.getDataByPath.mockReturnValue(initial.group.layout);
  form.getFields.mockReturnValue(fields);
  const onError = vi.fn();
  const { result } = renderHook(
    () => {
      const structure = useNativeStructure({
        root,
        field,
        collection: "pages",
        nonce: "preview-only",
        permissions: true,
        disabled: false,
        onError,
      });
      const transient = useTransientPreview();
      return {
        document: useEditorPreviewData(initial),
        prepare: structure.previewInsertion,
        preview: transient.preview,
      };
    },
    { wrapper: ActivePreview },
  );

  const original = result.current.document;
  const projection = result.current.prepare(target, "text", {
    heading: "Example",
  });
  expect(projection?.row).toMatchObject({
    blockType: "text",
    heading: "Example",
  });
  act(() => result.current.preview(projection));
  expect(result.current.document.group.layout).toEqual([projection?.row]);
  expect(original).toEqual(initial);

  act(() => result.current.preview(undefined));
  expect(result.current.document).toStrictEqual(original);
  expect(form.addFieldRow).not.toHaveBeenCalled();
  expect(form.dispatchFields).not.toHaveBeenCalled();
  expect(form.setModified).not.toHaveBeenCalled();
  expect(getFormState).not.toHaveBeenCalled();
});
