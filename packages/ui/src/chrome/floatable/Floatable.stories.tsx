import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { editorStoryCanvas } from "../../storybook/story-canvas";
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
  play: async ({ args, canvasElement, userEvent }) => {
    const canvas = await editorStoryCanvas(canvasElement);
    await expect(canvas.getByRole("textbox", { name: "Heading" })).toHaveValue(
      "Collection introduction",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /close section settings/i }),
    );
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
  args: {
    onBack: fn(),
    children: (
      <label className="pve:grid pve:gap-2">
        Heading
        <input
          className="pve:w-full pve:box-border pve:rounded-md pve:border pve:border-solid pve:border-[var(--pve-border)] pve:bg-transparent pve:px-3 pve:py-2 pve:font-inherit pve:text-inherit"
          defaultValue="Collection introduction"
        />
      </label>
    ),
    footer: <Button variant="secondary">All section fields</Button>,
  },
};
