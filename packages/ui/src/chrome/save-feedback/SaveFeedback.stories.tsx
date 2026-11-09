import type { Meta, StoryObj } from "@storybook/react-vite";
import { SaveFeedback } from "./SaveFeedback";

const meta = {
  component: SaveFeedback,
  title: "Editor/Chrome/Save feedback",
  args: {
    expanded: true,
    saving: true,
    pending: true,
    failed: false,
    label: "Saving…",
  },
  decorators: [
    (Story) => (
      <div className="pve:relative pve:ms-16 pve:h-12">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SaveFeedback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saving: Story = {};
export const Error: Story = {
  args: { saving: false, failed: true, label: "Could not save draft" },
};
