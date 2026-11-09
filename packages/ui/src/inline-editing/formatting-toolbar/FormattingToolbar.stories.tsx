import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FormattingToolbar } from "./FormattingToolbar";

const meta = {
  component: FormattingToolbar,
  title: "Editor/Inline editing/Formatting toolbar",
  args: {
    formats: ["bold"],
    features: [
      "bold",
      "italic",
      "underline",
      "paragraph",
      "heading",
      "heading:h2",
      "link",
    ],
    disabled: false,
    onFormat: fn(),
    onLink: fn(() => true),
    onSettings: fn(),
  },
} satisfies Meta<typeof FormattingToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveSelection: Story = {
  decorators: [
    (Story) => (
      <div className="pve:pt-14 pve:[--pve-rich-x:32px] pve:[--pve-rich-y:32px]">
        <Story />
        <p className="pve:m-0 pve:max-w-sm pve:rounded-md pve:border pve:border-solid pve:border-[var(--pve-accent,#3451eb)] pve:p-3">
          We make <strong>objects for everyday living</strong> in small
          collections.
        </p>
      </div>
    ),
  ],
};
