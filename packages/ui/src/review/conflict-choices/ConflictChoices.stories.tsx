import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { editorStoryCanvas } from "../../storybook/story-canvas";
import { useState } from "react";
import { ConflictChoices } from "./ConflictChoices";

const meta = {
  component: ConflictChoices,
  title: "Editor/Review/Conflict choices",
  args: {
    choices: {},
    onChoice: fn(),
    rows: [
      {
        path: "heading",
        labels: ["Introduction", "Heading"],
        structural: false,
        local: "Studio collection",
        latest: "The living collection",
      },
    ],
  },
} satisfies Meta<typeof ConflictChoices>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverlappingChanges: Story = {
  play: async ({ args, canvasElement, userEvent }) => {
    const canvas = await editorStoryCanvas(canvasElement);
    const latest = canvas.getByRole("radio", { name: "Use latest saved copy" });
    const local = canvas.getByRole("radio", { name: "Keep your copy" });
    await userEvent.click(latest);
    await expect(latest).toBeChecked();
    await expect(args.onChoice).toHaveBeenLastCalledWith("heading", "latest");
    await userEvent.keyboard("{ArrowUp}");
    await expect(local).toBeChecked();
    await expect(args.onChoice).toHaveBeenLastCalledWith("heading", "local");
  },
  render: function Choices(args) {
    const [choices, setChoices] = useState(args.choices);
    return (
      <ConflictChoices
        {...args}
        choices={choices}
        onChoice={(path, choice) => {
          setChoices((current) => ({ ...current, [path]: choice }));
          args.onChoice(path, choice);
        }}
      />
    );
  },
};
