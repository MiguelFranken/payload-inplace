import { expect, it } from "vitest";
import type { Field, SanitizedConfig } from "payload";
import { richTextCapabilities } from "../src/adapters/richtext-capabilities.js";
it("projects only native v3 Lexical capabilities by native schema paths and retains heading constraints", () => {
  const native = {
    name: "body",
    type: "richText",
    editor: {
      FieldComponent: {
        path: "@payloadcms/richtext-lexical/rsc#RscEntryLexicalField",
      },
      features: [
        { key: "heading", serverFeatureProps: { enabledHeadingSizes: ["h3"] } },
      ],
      editorConfig: { features: { enabledFeatures: ["bold", "heading"] } },
    },
  };
  const fields = [
    {
      name: "layout",
      type: "blocks",
      blocks: [
        {
          slug: "story",
          fields: [
            native,
            {
              ...native,
              name: "custom",
              admin: { components: { Field: "consumer#Field" } },
            },
          ],
        },
      ],
    },
  ] as unknown as Field[];
  const result = richTextCapabilities(fields, "pages", {} as SanitizedConfig);
  expect(result).toEqual({
    "pages.layout.story.body": ["bold", "heading", "heading:h3"],
  });
});
