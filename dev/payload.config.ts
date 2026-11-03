import path from "node:path";
import { fileURLToPath } from "node:url";
import { en } from "@payloadcms/translations/languages/en";
import { de } from "@payloadcms/translations/languages/de";
import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { postgresConcurrency } from "../dist/exports/postgres.js";
import { visualEditor } from "../dist/index.js";
import { seed } from "./seed";
import type { VisualEditorOptions } from "../dist/exports/types.js";
import type { Block, CollectionConfig } from "payload";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const editor = ({ req }: any) =>
  Boolean(req.user && ["admin", "editor"].includes(req.user.role));
const blocks: Block[] = [
  {
    slug: "hero",
    labels: { singular: "Hero", plural: "Heroes" },
    fields: [
      { name: "heading", type: "text", required: true },
      { name: "caption", type: "text" },
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
        fields: [{ name: "label", type: "text" }],
      },
    ],
  },
  {
    slug: "serverData",
    labels: { singular: "Server data", plural: "Server data" },
    fields: [{ name: "heading", type: "text" }],
  },
];
const content = (slug: string, nested = false): CollectionConfig => ({
  slug,
  admin: { useAsTitle: "title", listSearchableFields: ["title", "slug"] },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: "published" } }),
    create: editor,
    update: editor,
    delete: editor,
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
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
      name: "meta",
      label: "Search appearance",
      type: "group",
      fields: [
        { name: "title", label: "Search title", type: "text" },
        { name: "description", label: "Search description", type: "textarea" },
        {
          name: "synonyms",
          type: "array",
          fields: [{ name: "word", type: "text" }],
        },
      ],
    },
  ],
});
export const editorOptions: VisualEditorOptions = {
  operationalWrites: {
    offers: {
      paths: ["unrelated"],
      authorize: (req) => req.context.reviewedDemoOperation === true,
    },
  },
  fieldPanels: [
    {
      id: "search-appearance",
      label: { en: "Search appearance", de: "Suchdarstellung" },
      fields: ["meta.title", "meta.description"],
      scope: "document",
    },
    {
      id: "appearance",
      label: { en: "Appearance", de: "Darstellung" },
      fields: ["appearance.tone", "appearance.align"],
      scope: "selection",
      blockTypes: ["hero"],
    },
  ],
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
    offers: { roots: ["detailPage.layout"] },
  },
  policies: {
    pages: { layout: { first: "hero", exactlyOne: ["hero"] } },
    offers: { "detailPage.layout": { first: "hero", exactlyOne: ["hero"] } },
  },
  previewOrigin: process.env.VE_ORIGIN || "http://127.0.0.1:3127",
  canEdit: ({ req }: any) => editor({ req }),
  disabled: process.env.VE_DISABLED === "1",
};
export default buildConfig({
  i18n: { fallbackLanguage: "en", supportedLanguages: { en, de } },
  admin: {
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
      },
      access: {
        read: () => true,
        create: editor,
        update: editor,
        delete: editor,
      },
      fields: [{ name: "alt", type: "text" }],
    },
    content("pages"),
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
