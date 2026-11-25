import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { InlinePreviewContext } from "../../src/frontend/inline-preview";
import { useEditorPreviewData } from "../../src/frontend/preview-data";

const { form } = vi.hoisted(() => ({
  form: { getData: vi.fn(), getFields: vi.fn() },
}));

vi.mock("@payloadcms/ui", () => ({
  useForm: () => form,
  useFormFields: (select: (state: [unknown]) => unknown) =>
    select([form.getFields()]),
}));

type Document = {
  asset: {
    relationTo: string;
    value: number | { id: number; slug?: string; filename?: string };
  };
};

function Renderer({ initial }: { initial: Document }) {
  const { relationTo, value } = useEditorPreviewData(initial).asset;
  const label =
    typeof value === "number" ? value : (value.slug ?? value.filename);
  return (
    <output aria-label="Rendered asset">
      {relationTo}: {label}
    </output>
  );
}

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
      {children}
    </InlinePreviewContext>
  );
}

it.each([
  ["photos", "files"],
  ["files", "photos"],
])(
  "refreshes the active renderer when a %s reference becomes %s with the same ID",
  (previous, current) => {
    const initial = {
      asset: { relationTo: previous, value: { id: 7, slug: "original" } },
    };
    form.getFields.mockReturnValue({});
    form.getData.mockReturnValue({ asset: { relationTo: previous, value: 7 } });
    const view = render(<Renderer initial={initial} />, {
      wrapper: ActivePreview,
    });
    const asset = screen.getByLabelText("Rendered asset");
    expect(asset.textContent).toBe(`${previous}: original`);

    form.getFields.mockReturnValue({});
    form.getData.mockReturnValue({ asset: { relationTo: current, value: 7 } });
    view.rerender(<Renderer initial={initial} />);
    expect(asset.textContent).toBe(`${current}: 7`);

    form.getFields.mockReturnValue({});
    form.getData.mockReturnValue({
      asset: { relationTo: current, value: { id: 7, filename: "new asset" } },
    });
    view.rerender(<Renderer initial={initial} />);
    expect(asset.textContent).toBe(`${current}: new asset`);
  },
);
