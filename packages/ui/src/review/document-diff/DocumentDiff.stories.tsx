import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DocumentDiff } from "./DocumentDiff";

const meta = {
  component: DocumentDiff,
  title: "Editor/Review/Document diff",
  args: { beforeLabel: "Published", afterLabel: "Draft", changes: [] },
} satisfies Meta<typeof DocumentDiff>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Changed: Story = {
  args: {
    onLocate: fn(),
    changes: [
      {
        path: "layout.hero.heading",
        labels: ["Hero", "Heading"],
        kind: "changed",
        before: "Objects for the home",
        after: "Objects for everyday living",
        text: {
          prefix: "Objects for ",
          removed: "the home",
          added: "everyday living",
          suffix: "",
        },
      },
      {
        path: "layout.story",
        labels: ["Studio story"],
        kind: "moved",
        before: "",
        after: "",
        from: 4,
        to: 2,
        text: { prefix: "", removed: "", added: "", suffix: "" },
      },
    ],
  },
};
export const NoChanges: Story = {};
