import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { EditorToolbar } from "./EditorToolbar";
import { Button } from "../../primitives/button/button";
import { Layers, MousePointer2 } from "lucide-react";

const meta = {
  component: EditorToolbar,
  title: "Editor/Chrome/Toolbar",
  args: { label: "Editing toolbar", editLabel: "Edit page", onExpand: fn() },
} satisfies Meta<typeof EditorToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  args: {
    expanded: true,
    children: (
      <>
        <Button
          size="icon"
          aria-label="Select content"
          tooltip="Select content"
          aria-pressed="true"
        >
          <MousePointer2 size={18} />
        </Button>
        <Button size="icon" aria-label="Sections" tooltip="Sections">
          <Layers size={18} />
        </Button>
      </>
    ),
  },
};

export const Collapsed: Story = { args: { expanded: false, children: null } };
