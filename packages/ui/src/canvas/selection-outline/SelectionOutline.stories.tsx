import type { Meta, StoryObj } from "@storybook/react-vite";
import { Settings2 } from "lucide-react";
import { SelectionOutline } from "./SelectionOutline";
import { Button } from "../../primitives/button/button";

const meta = {
  component: SelectionOutline,
  title: "Editor/Canvas/Selection outline",
} satisfies Meta<typeof SelectionOutline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectedHeading: Story = {
  render: () => (
    <SelectionOutline
      hover={(element) => {
        if (!element) return;
        element.hidden = false;
        element.dataset.veSelectionOutline = "";
        element.style.setProperty("--pve-left", "16px");
        element.style.setProperty("--pve-top", "68px");
        element.style.setProperty("--pve-width", "240px");
        element.style.setProperty("--pve-height", "80px");
      }}
      caption={(element) => {
        if (element) element.textContent = "Heading";
      }}
      actionLabel="Heading"
      actions={
        <Button size="small-icon" aria-label="Heading settings">
          <Settings2 size={14} />
        </Button>
      }
    />
  ),
};
