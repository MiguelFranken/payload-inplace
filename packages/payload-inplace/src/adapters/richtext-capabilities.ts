import type { Field, SanitizedConfig } from "payload";
import { getFieldPaths } from "payload/shared";

/** Only a native v3 Lexical adapter without a consumer Field override may opt into inline editing. */
export type RichTextCapabilities = Readonly<Record<string, readonly string[]>>;

export function richTextCapabilities(
  fields: Field[],
  parentSchemaPath: string,
  config: SanitizedConfig,
): RichTextCapabilities {
  const result: Record<string, string[]> = {};
  function walk(
    fields: Field[],
    parentSchemaPath: string,
    parentIndexPath = "",
  ) {
    fields.forEach((field, index) => {
      const paths = getFieldPaths({
        field,
        index,
        parentSchemaPath,
        parentIndexPath,
        parentPath: "",
      });
      if (
        field.type === "richText" &&
        !field.admin?.components?.Field &&
        field.editor &&
        typeof field.editor === "object"
      ) {
        const component = field.editor.FieldComponent;
        const source =
          typeof component === "string"
            ? component
            : component && typeof component === "object" && "path" in component
              ? component.path
              : "";
        const editor =
          "editorConfig" in field.editor
            ? field.editor.editorConfig
            : undefined;
        if (
          source === "@payloadcms/richtext-lexical/rsc#RscEntryLexicalField" &&
          editor &&
          typeof editor === "object" &&
          "features" in editor
        ) {
          const features = editor.features;
          if (
            features &&
            typeof features === "object" &&
            "enabledFeatures" in features &&
            Array.isArray(features.enabledFeatures)
          ) {
            const keys = features.enabledFeatures.filter(
              (key): key is string => typeof key === "string",
            );
            const providers =
              "features" in field.editor && Array.isArray(field.editor.features)
                ? field.editor.features
                : [];
            const heading = providers.find(
              (feature: unknown) =>
                feature &&
                typeof feature === "object" &&
                "key" in feature &&
                feature.key === "heading",
            );
            const props =
              heading &&
              typeof heading === "object" &&
              "serverFeatureProps" in heading
                ? heading.serverFeatureProps
                : undefined;
            const sizes: unknown[] =
              props &&
              typeof props === "object" &&
              "enabledHeadingSizes" in props &&
              Array.isArray(props.enabledHeadingSizes)
                ? props.enabledHeadingSizes
                : ["h1", "h2", "h3", "h4", "h5", "h6"];
            result[paths.schemaPath] = [
              ...keys,
              ...(keys.includes("heading")
                ? sizes
                    .filter(
                      (size): size is string =>
                        typeof size === "string" && /^h[1-6]$/.test(size),
                    )
                    .map((size) => `heading:${size}`)
                : []),
            ];
          }
        }
      } else if (field.type === "blocks") {
        for (const entry of field.blockReferences?.length
          ? field.blockReferences
          : field.blocks) {
          const block =
            typeof entry === "string"
              ? config.blocks?.find((block) => block.slug === entry)
              : entry;
          if (block)
            walk(
              block.fields,
              `${paths.schemaPath}.${block.slug}`,
              paths.indexPath,
            );
        }
      } else if (field.type === "tabs") {
        field.tabs.forEach((tab, index) => {
          const tabPaths = getFieldPaths({
            field: tab,
            index,
            parentPath: "",
            parentSchemaPath: paths.schemaPath,
            parentIndexPath: paths.indexPath,
          });
          walk(tab.fields, tabPaths.schemaPath, tabPaths.indexPath);
        });
      } else if ("fields" in field)
        walk(field.fields, paths.schemaPath, paths.indexPath);
    });
  }
  walk(fields, parentSchemaPath);
  return result;
}
