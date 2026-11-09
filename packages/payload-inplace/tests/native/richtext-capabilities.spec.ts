import { expect, it } from "vitest";
import type { Field, SanitizedConfig } from "payload";
import { resolveRootSchemaPath } from "../../src/schema/resolve";
import { collectSections } from "../../src/schema/tree";
import { resolveBinding } from "../../src/schema/resolve-binding";
import { richTextCapabilities } from "../../src/adapters/richtext-capabilities";
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

it("matches native inline capabilities through unnamed tabs above and inside a blocks root", () => {
  const native = {
    name: "body",
    type: "richText",
    editor: {
      FieldComponent: {
        path: "@payloadcms/richtext-lexical/rsc#RscEntryLexicalField",
      },
      editorConfig: { features: { enabledFeatures: ["bold", "paragraph"] } },
    },
  };
  const block = {
    slug: "story",
    fields: [{ type: "tabs", tabs: [{ label: "Copy", fields: [native] }] }],
  };
  const root = {
    name: "layout",
    type: "blocks",
    blocks: [block],
    blockReferences: [],
  };
  const fields = [
    { type: "tabs", tabs: [{ label: "Content", fields: [root] }] },
  ] as unknown as Field[];
  const schemaPath = resolveRootSchemaPath(fields, "layout", "pages");
  const capabilities = richTextCapabilities(
    fields,
    "pages",
    {} as SanitizedConfig,
  );
  const sections = collectSections({
    field: root as any,
    data: [{ id: "story", blockType: "story", body: { root: {} } }],
    root: "layout",
    schemaPath,
  });
  const binding = resolveBinding({
    fields: block.fields as any,
    value: sections[0].value,
    binding: "body",
  })!;
  expect(
    capabilities[`${sections[0].schemaPath}.${binding.schemaPath}`],
  ).toEqual(["bold", "paragraph"]);
  expect(schemaPath).toBe("pages._index-0-0.layout");
  expect(sections[0].schemaPath).toBe(`${schemaPath}.story`);
});
