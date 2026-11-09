import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
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
