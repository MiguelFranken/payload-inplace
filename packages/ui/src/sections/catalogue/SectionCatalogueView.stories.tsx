import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, waitFor } from "storybook/test";
import { editorStoryCanvas } from "../../storybook/story-canvas";
import { useState } from "react";
import { SectionCatalogueView } from "./SectionCatalogueView";

const meta = {
  component: SectionCatalogueView,
  title: "Editor/Sections/Catalogue",
  args: {
    open: false,
    label: "Add section",
    hasChoices: true,
    onOpenChange: fn(),
    onChoose: fn(),
    items: [
      {
        id: "hero",
        label: "Collection introduction",
        description: "Headline, image and link",
        group: "Storefront",
      },
      {
        id: "story",
        label: "Studio story",
        description: "Photo and editorial copy",
        group: "Editorial",
      },
      {
        id: "faq",
        label: "Questions",
        description: "Expandable answers",
        group: "Content",
      },
    ],
  },
} satisfies Meta<typeof SectionCatalogueView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Searchable: Story = {
  render: function Catalogue(args) {
    const [open, setOpen] = useState(args.open);
    return (
      <div className="pve:pt-[max(16rem,55vh)]">
        <SectionCatalogueView
          {...args}
          open={open}
          onOpenChange={setOpen}
          onChoose={(id) => {
            args.onChoose(id);
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

export const FilteredSelection: Story = {
  ...Searchable,
  play: async ({ args, canvasElement, userEvent }) => {
    const canvas = await editorStoryCanvas(canvasElement);
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Add section" }),
    );
    const search = await canvas.findByRole("combobox", {
      name: /search sections/i,
    });
    await fireEvent.input(search, { target: { value: "Studio" } });
    await waitFor(async () => {
      await expect(
        canvas.queryByRole("option", { name: "Questions" }),
      ).not.toBeInTheDocument();
    });
    await userEvent.click(canvas.getByRole("option", { name: "Studio story" }));
    await expect(args.onChoose).toHaveBeenCalledOnce();
    await expect(args.onChoose).toHaveBeenCalledWith("story");
    await expect(search).not.toBeInTheDocument();
  },
};
