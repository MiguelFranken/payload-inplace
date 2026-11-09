import { expect, it } from "vitest";
import { sectionHeading } from "../../src/schema/section-heading";
import type { NativeSection } from "../../src/schema/tree";

const section = (
  fields: any[],
  value: Record<string, any>,
  permissions: any = true,
) =>
  ({
    block: { slug: "callout", fields },
    value,
    permissions,
    path: "article.sections.0",
  }) as NativeSection;
it("uses native block names then common headline fields across consumer naming conventions", () => {
  const fields: any[] = [
    { type: "text", name: "label" },
    { type: "text", name: "headline" },
    { type: "text", name: "blockName" },
  ];
  expect(
    sectionHeading(
      section(fields, { label: "Overview", headline: "The actual story" }),
    ),
  ).toBe("The actual story");
  expect(
    sectionHeading(
      section(fields, {
        blockName: "Editorial opening",
        headline: "The actual story",
      }),
    ),
  ).toBe("Editorial opening");
});
it("resolves readable nested group/tab text while ignoring unrelated relationship and JSON objects", () => {
  const fields: any[] = [
    { type: "relationship", name: "related" },
    { type: "json", name: "opaque" },
    {
      type: "tabs",
      tabs: [
        {
          name: "copy",
          fields: [
            {
              type: "group",
              name: "intro",
              fields: [{ type: "text", name: "title" }],
            },
          ],
        },
      ],
    },
  ];
  expect(
    sectionHeading(
      section(
        fields,
        {
          related: { title: "Foreign" },
          opaque: { title: "Opaque" },
          copy: { intro: { title: "Nested title" } },
        },
        {
          copy: {
            read: true,
            fields: {
              intro: {
                read: true,
                update: false,
                fields: { title: { read: true, update: false } },
              },
            },
          },
        },
      ),
    ),
  ).toBe("Nested title");
});
it("never derives labels from denied, hidden, unknown or conditionally inactive fields", () => {
  const fields: any[] = [
    { type: "text", name: "heading" },
    { type: "text", name: "headline", admin: { hidden: true } },
    { type: "text", name: "title" },
    { type: "text", name: "name" },
    { type: "text", name: "caption" },
  ];
  const value = {
    heading: "Denied",
    headline: "Hidden",
    title: "Inactive",
    name: "Unknown",
    caption: "Readable",
  };
  expect(
    sectionHeading(
      section(fields, value, {
        heading: { read: false },
        headline: { read: true },
        title: { read: true },
        caption: { read: true },
      }),
      { "article.sections.0.title": { passesCondition: false } },
    ),
  ).toBe("Readable");
  expect(sectionHeading(section(fields, value, {}))).toBeUndefined();
});
it("uses a meaningful custom text field and omits internal IDs and empty text", () => {
  expect(
    sectionHeading(
      section(
        [
          { type: "text", name: "id" },
          { type: "text", name: "headline" },
          { type: "textarea", name: "statement" },
        ],
        { id: "internal-id", headline: "  ", statement: "A custom statement" },
      ),
    ),
  ).toBe("A custom statement");
});
