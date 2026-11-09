import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Floatable } from "./Floatable";
import { Button } from "../../primitives/button/button";

const meta = {
  component: Floatable,
  title: "Editor/Chrome/Floatable",
  args: { title: "Section settings", onClose: fn(), autoFocus: false },
} satisfies Meta<typeof Floatable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Settings: Story = {
  args: {
    onBack: fn(),
    children: (
      <label className="pve:grid pve:gap-2">
        Heading
        <input defaultValue="Collection introduction" />
      </label>
    ),
    footer: <Button variant="secondary">All section fields</Button>,
  },
};
