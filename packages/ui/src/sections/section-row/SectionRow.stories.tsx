import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SectionRow } from "./SectionRow";
import { Button } from "../../primitives/button/button";
import { GripVertical, LockKeyhole } from "lucide-react";

const meta = {
  component: SectionRow,
  title: "Editor/Sections/Section row",
  args: {
    blockId: "hero",
    label: "Collection introduction",
    heading: "Objects for everyday living",
    position: "1",
    onPick: fn(),
    onLocate: fn(),
    onSettings: fn(),
  },
} satisfies Meta<typeof SectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Reorderable: Story = {
  args: {
    handle: (
      <Button size="icon" aria-label="Move section">
        <GripVertical size={16} />
      </Button>
    ),
  },
};
export const FixedFirst: Story = {
  args: {
    lock: "Fixed first",
    handle: (
      <Button size="icon" disabled aria-label="Fixed first">
        <LockKeyhole size={14} />
      </Button>
    ),
  },
};
