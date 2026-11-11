import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { editorStoryCanvas } from "../../storybook/story-canvas";
import { ComparisonToolbar } from "./ComparisonToolbar";

const meta = {
  component: ComparisonToolbar,
  title: "Editor/Review/Compare sections",
  args: {
    side: "draft",
    highlight: "sections",
    status: "3 changed sections",
    hint: "Switch to Published to see removed sections.",
    ready: true,
    hasPublished: true,
    canNavigate: true,
    onSide: fn(),
    onHighlight: fn(),
    onNext: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ComparisonToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {
  play: async ({ args, canvasElement, userEvent }) => {
    const canvas = await editorStoryCanvas(canvasElement);
    await expect(canvas.getByRole("button", { name: "Draft" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Published" }));
    await expect(args.onSide).toHaveBeenCalledWith("published");
    await userEvent.click(
      canvas.getByRole("button", { name: "Next changed section" }),
    );
    await expect(args.onNext).toHaveBeenCalledOnce();
    const elements = canvas.getByRole("button", { name: "Elements" });
    await elements.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onHighlight).toHaveBeenCalledWith("elements");
  },
};

export const Unpublished: Story = {
  args: {
    status: "This page has no published version.",
    hint: undefined,
    hasPublished: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = await editorStoryCanvas(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Published" }),
    ).toBeDisabled();
  },
};

export const Error: Story = {
  args: {
    ready: false,
    hint: undefined,
    status: "Could not load the comparison. Try again or reopen the editor.",
    onRetry: fn(),
  },
};
