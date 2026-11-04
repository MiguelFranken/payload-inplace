import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { en } from "@payloadcms/translations/languages/en";
import { de } from "@payloadcms/translations/languages/de";
import { buildConfig, validations } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { postgresConcurrency } from "../../packages/payload-inplace/dist/exports/postgres.js";
import { visualEditor } from "../../packages/payload-inplace/dist/index.js";
import { seed } from "./seed";
import { commerceCollections } from "./commerce/schema";
import { commercePath } from "./commerce/paths";
import type { VisualEditorOptions } from "../../packages/payload-inplace/dist/exports/types.js";
import type {
  Block,
  CollectionConfig,
  TextFieldSingleValidation,
} from "payload";
const validateDemoTitle: TextFieldSingleValidation = (value, options) =>
  value === "Rejected title"
    ? "Use a different title."
    : validations.text(value, options);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const editor = ({ req }: any) =>
  Boolean(req.user && ["admin", "editor"].includes(req.user.role));
const blocks: Block[] = [
  {
    slug: "hero",
    labels: { singular: "Hero", plural: "Heroes" },
    fields: [
      { name: "heading", type: "text", required: true },
      {
        name: "caption",
        type: "text",
        admin: {
          components: {
            beforeInput: [
              {
                path: "/components/NativeSuspensionProbe",
                exportName: "NativeSuspensionProbe",
                clientProps: { enabled: process.env.VE_TEST_SCHEMA === "1" },
              },
            ],
          },
        },
      },
      { name: "image", type: "upload", relationTo: "media" },
      {
        name: "appearance",
        label: "Appearance",
        type: "group",
        fields: [
          {
            name: "tone",
            label: "Background",
            type: "select",
            defaultValue: "light",
            options: [
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ],
          },
          {
            name: "align",
            label: "Text alignment",
            type: "select",
            defaultValue: "start",
            options: [
              { label: "Start", value: "start" },
              { label: "Center", value: "center" },
            ],
          },
        ],
      },
      {
        name: "privateNote",
        type: "text",
        access: {
          read: ({ req }) => req.user?.role === "admin",
          update: ({ req }) => req.user?.role === "admin",
        },
      },
    ],
  },
  {
    slug: "text",
    labels: { singular: "Text", plural: "Texts" },
    fields: [
      { name: "heading", type: "text" },
      { name: "body", type: "richText" },
      { name: "hidden", type: "checkbox" },
      {
        name: "items",
        type: "array",
        fields: [
          { name: "label", type: "text" },
          { name: "note", type: "textarea" },
        ],
      },
    ],
  },
  {
    slug: "serverData",
    labels: { singular: "Server data", plural: "Server data" },
    fields: [{ name: "heading", type: "text" }],
  },
];
const content = (
  slug: string,
  nested = false,
  validateDrafts = false,
): CollectionConfig => ({
  slug,
  admin: { useAsTitle: "title", listSearchableFields: ["title", "slug"] },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: "published" } }),
    create: editor,
    update: editor,
    delete: editor,
  },
  versions: {
    drafts: { autosave: { interval: 1500 }, validate: validateDrafts },
    maxPerDoc: 50,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      ...(validateDrafts ? { validate: validateDemoTitle } : {}),
      hooks: {
        beforeValidate: [
          ({ value }) => (typeof value === "string" ? value.trim() : value),
        ],
      },
    },
    { name: "slug", type: "text", required: true, unique: true },
    ...(nested
      ? [
          {
            type: "tabs" as const,
            tabs: [
              {
                name: "detailPage",
                label: "Presentation",
                fields: [{ name: "layout", type: "blocks" as const, blocks }],
              },
            ],
          },
        ]
      : [
          {
            type: "tabs" as const,
            tabs: [
              {
                label: "Content",
                fields: [{ name: "layout", type: "blocks" as const, blocks }],
              },
            ],
          },
        ]),
    { name: "unrelated", type: "text" },
    {
      type: "tabs",
      tabs: [
        {
          name: "meta",
          label: "Search appearance",
          fields: [
            {
              name: "title",
              label: "Search title",
              type: "text",
              admin: {
                components: {
                  Field: "./components/NativeSearchTitle#NativeSearchTitle",
                },
              },
            },
            {
              name: "description",
              label: "Search description",
              type: "textarea",
            },
            {
              name: "synonyms",
              type: "array",
              fields: [{ name: "word", type: "text" }],
            },
          ],
        },
      ],
    },
  ],
});
export const editorOptions: VisualEditorOptions = {
  resolvePagePath: ({ target, document }) =>
    commercePath(target.collection, String(document.slug)) ||
    (document.slug?.startsWith("inplace-")
      ? `/${target.collection}/${document.slug}`
      : undefined),
  operationalWrites: {
    offers: {
      paths: ["unrelated"],
      authorize: (req) => req.context.reviewedDemoOperation === true,
    },
  },
  fieldPanels: [
    {
      id: "search-appearance",
      canUse: ({ target }) =>
        ["pages", "offers", "validatedPages"].includes(target.collection),
      label: { en: "Search appearance", de: "Suchdarstellung" },
      fields: ["meta.title", "meta.description"],
      scope: "document",
    },
    {
      id: "product-search",
      label: "Search appearance",
      scope: "document",
      fields: ["search.title", "search.description"],
      canUse: ({ target }) => target.collection === "products",
    },
    {
      id: "appearance",
      label: { en: "Appearance", de: "Darstellung" },
      fields: ["appearance.tone", "appearance.align"],
      scope: "selection",
      blockTypes: ["hero"],
    },
  ],
  catalogue: {
    editorial: {
      description: "An image-led story with editable rich text.",
      group: "Storytelling",
      thumbnail: { src: "/api/media/file/studio.png", alt: "" },
      example: {
        heading: "A story worth sharing.",
        description:
          "A quiet space to introduce your materials, process and people.",
        background: "sage",
        eyebrow: "Inside the studio",
      },
    },
    faq: {
      description: "Clear answers, one question at a time.",
      group: "Information",
      example: {
        heading: "Your questions, answered.",
        background: "canvas",
        items: [
          {
            question: "What makes this collection special?",
            answer: "Considered details and honest materials.",
          },
        ],
      },
    },
    text: {
      description: "A flexible text section.",
      group: "Content",
      example: {
        heading: "Your next chapter",
        text: "A preview of your next section.",
      },
    },
  },
  blockControls: {
    hero: {
      fields: ["heading", "caption", "image"],
      inlineEdit: ["heading", "caption"],
    },
  },
  extensions: [
    {
      id: "page-details",
      kind: "panel",
      label: { en: "Page details", de: "Seitendetails" },
      showInDock: false,
      Component: "./components/DemoPageTools#DemoPageDetails",
    },
    {
      id: "page-tools-control",
      kind: "control",
      label: "Page details",
      Component: "./components/DemoPageTools#DemoPageTools",
    },
    {
      id: "check-content",
      kind: "action",
      confirmation: {
        title: "Check saved draft",
        description: "Run the app-defined read-only section check.",
        confirmLabel: "Run check",
      },
      label: { en: "Check saved content", de: "Gespeicherte Inhalte prüfen" },
      run: async ({ document, target }) => {
        const rows =
          target.root
            .split(".")
            .reduce((value: any, key) => value?.[key], document) || [];
        return {
          message: `${rows.length} sections in the saved draft. This app-defined check does not publish or send anything.`,
        };
      },
    },
  ],
  concurrency:
    process.env.VE_DATABASE === "postgres" ? postgresConcurrency() : undefined,
  collections: {
    pages: { roots: ["layout"] },
    validatedPages: { roots: ["layout"] },
    offers: { roots: ["detailPage.layout"] },
    shops: { roots: ["layout"] },
    products: { roots: ["presentation.layout"] },
  },
  policies: {
    shops: {
      layout: { first: "collectionHero", exactlyOne: ["collectionHero"] },
    },
    products: {
      "presentation.layout": {
        first: "productDetails",
        exactlyOne: ["productDetails"],
      },
    },
    pages: { layout: { first: "hero", exactlyOne: ["hero"] } },
    offers: { "detailPage.layout": { first: "hero", exactlyOne: ["hero"] } },
  },
  previewOrigin: process.env.VE_ORIGIN || "http://127.0.0.1:3127",
  canEdit: ({ req }: any) => editor({ req }),
  disabled: process.env.VE_DISABLED === "1",
};
export default buildConfig({
  sharp,
  i18n: { fallbackLanguage: "en", supportedLanguages: { en, de } },
  admin: {
    autoLogin: {
      email: "admin@example.test",
      password: "synthetic-demo-password",
      prefillOnly: true,
    },
    user: "users",
    importMap: {
      baseDir: dirname,
      importMapFile: path.join(dirname, "app/(payload)/admin/importMap.js"),
    },
  },
  collections: [
    {
      slug: "users",
      auth: true,
      admin: { useAsTitle: "email" },
      access: {
        admin: ({ req }) => Boolean(req.user),
        create: ({ req }) => req.user?.role === "admin",
        update: ({ req }) => req.user?.role === "admin",
        delete: ({ req }) => req.user?.role === "admin",
      },
      fields: [
        {
          name: "role",
          type: "select",
          options: ["admin", "editor", "reader"],
          required: true,
          defaultValue: "reader",
          saveToJWT: true,
          access: { update: ({ req }) => req.user?.role === "admin" },
        },
      ],
    },
    {
      slug: "media",
      upload: {
        staticDir: process.env.VE_MEDIA_DIR || path.join(dirname, "media"),
        imageSizes: [
          {
            name: "card",
            width: 1200,
            withoutEnlargement: true,
            formatOptions: { format: "webp", options: { quality: 85 } },
          },
        ],
      },
      access: {
        read: () => true,
        create: editor,
        update: editor,
        delete: editor,
      },
      fields: [{ name: "alt", type: "text" }],
    },
    ...commerceCollections,
    content("pages"),
    content("validatedPages", false, true),
    content("offers", true),
  ],
  db:
    process.env.VE_DATABASE === "postgres"
      ? postgresAdapter({
          pool: { connectionString: process.env.DATABASE_URL },
          push: true,
        })
      : mongooseAdapter({
          ensureIndexes: true,
          url:
            process.env.DATABASE_URL ||
            "mongodb://127.0.0.1:27017/visual-editor-demo",
        }),
  editor: lexicalEditor(),
  plugins: [visualEditor(editorOptions)],
  secret:
    process.env.PAYLOAD_SECRET || "synthetic-demo-only-not-a-production-secret",
  onInit: process.env.VE_SEED === "1" ? seed : undefined,
  typescript: {
    autoGenerate: false,
    outputFile: path.join(dirname, "payload-types.ts"),
  },
});
