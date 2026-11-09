import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MediaLibrary } from "./MediaLibrary";

const meta = {
  component: MediaLibrary,
  title: "Editor/Media/Library",
  args: {
    busy: false,
    disabled: false,
    error: null,
    query: "",
    items: [],
    onQueryChange: fn(),
    onRetry: fn(),
    onSelect: fn(),
    isSelected: (asset) => asset.id === "chair",
    openNative: fn(),
  },
} satisfies Meta<typeof MediaLibrary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = {
  args: {
    items: [
      {
        id: "chair",
        collection: "media",
        label: "Arc lounge chair",
        mimeType: "image/png",
      },
      {
        id: "studio",
        collection: "media",
        label: "Studio portrait",
        mimeType: "image/webp",
      },
    ],
    onLoadMore: fn(),
    onUpload: fn(),
  },
};
export const Empty: Story = {};
export const SearchFailed: Story = { args: { error: "mediaSearchFailed" } };
