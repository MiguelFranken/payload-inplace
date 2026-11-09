import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
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
