import type { Meta, StoryObj } from "@storybook/react-vite";
import { editorStoryCanvas } from "../../storybook/story-canvas";
import { expect, fn } from "storybook/test";
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
  play: async ({ args, canvasElement, userEvent }) => {
    const canvas = await editorStoryCanvas(canvasElement);
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const italic = canvas.getByRole("button", { name: "Italic" });
    await expect(italic).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(italic);
    await expect(args.onFormat).toHaveBeenCalledOnce();
    await expect(args.onFormat).toHaveBeenCalledWith("italic");
  },
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
