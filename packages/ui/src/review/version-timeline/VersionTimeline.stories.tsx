import type { Meta, StoryObj } from "@storybook/react-vite";
import { editorStoryCanvas } from "../../storybook/story-canvas";
import { expect, fn } from "storybook/test";
import { VersionTimeline } from "./VersionTimeline";

const meta = {
  component: VersionTimeline,
  title: "Editor/Review/Version timeline",
  args: {
    page: 1,
    busy: false,
    selectionDisabled: false,
    hasNextPage: false,
    loading: false,
    error: null,
    onChoose: fn(),
    onPageChange: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof VersionTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SavedVersions: Story = {
  play: async ({ args, canvasElement, userEvent }) => {
    const canvas = await editorStoryCanvas(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /compare.*17/i }));
    await expect(args.onChoose).toHaveBeenCalledOnce();
    await expect(args.onChoose).toHaveBeenCalledWith("published");
  },
  args: {
    versions: [
      {
        id: "draft",
        date: "9 Nov, 13:20",
        status: "draft",
        revision: "18",
        selected: true,
      },
      {
        id: "published",
        date: "8 Nov, 18:05",
        status: "published",
        revision: "17",
        selected: false,
      },
    ],
  },
};
export const Loading: Story = { args: { loading: true, busy: true } };
