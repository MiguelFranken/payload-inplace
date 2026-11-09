import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

export default {
  framework: "@storybook/react-vite",
  stories: ["../../../packages/ui/src/**/*.stories.tsx"],
  async viteFinal(config) {
    return { ...config, plugins: [...(config.plugins ?? []), tailwindcss()] };
  },
} satisfies StorybookConfig;
