import path from "node:path";
import { buildConfig, type PayloadRequest, type Payload } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  visualEditor,
  type VisualEditorOptions,
} from "@miguelfranken/payload-visual-editor";
import { postgresConcurrency } from "@miguelfranken/payload-visual-editor/postgres";
const write = ({ req }: { req: PayloadRequest }): boolean =>
  req.user?.role === "author";
export const editorOptions: VisualEditorOptions = {
  collections: { stories: { roots: ["article.sections"] } },
  previewOrigin: "http://127.0.0.1:3147",
  editorPath: "/compose",
  disabled: process.env.CONSUMER_DISABLED === "1",
  canEdit: ({ req }) => req.user?.role === "author",
  concurrency: postgresConcurrency(),
  blockControls: {
    callout: { inlineEdit: ["headline", "summary"] },
    quotation: { inlineEdit: ["headline", "attribution"] },
  },
  fieldPanels: [{ id: "document", label: "Story details", fields: ["name"] }],
};
async function seed(payload: Payload) {
  if (
    (await payload.count({ collection: "users", overrideAccess: true }))
      .totalDocs
  )
    return;
  for (const role of ["author", "reader"])
    await payload.create({
      collection: "users",
      overrideAccess: true,
      data: {
        email: `${role}@consumer.test`,
        password: "synthetic-consumer-password",
        role,
      },
    });
  await payload.create({
    collection: "stories",
    overrideAccess: true,
    data: {
      name: "Installed story",
      slug: "packed-proof",
      unrelated: "Keep unrelated data",
      _status: "published",
      article: {
        sections: [
          {
            blockType: "callout",
            headline: "A separately installed story",
            summary: "A different collection and nested root.",
            tone: "bright",
          },
          {
            blockType: "quotation",
            headline: "A native quote",
            attribution: "Synthetic author",
          },
        ],
      },
    },
  });
}
export default buildConfig({
  serverURL: "http://127.0.0.1:3147",
  secret: process.env.PAYLOAD_SECRET!,
  admin: { user: "users", importMap: { baseDir: path.resolve(".") } },
  typescript: { autoGenerate: false },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    push: true,
  }),
  editor: lexicalEditor(),
  plugins: [visualEditor(editorOptions)],
  onInit: process.env.CONSUMER_SEED === "1" ? seed : undefined,
  collections: [
    {
      slug: "users",
      auth: true,
      access: { admin: write, create: write, update: write, delete: write },
      fields: [
        {
          name: "role",
          type: "select",
          options: ["author", "reader"],
          required: true,
          access: { update: write },
        },
      ],
    },
    {
      slug: "assets",
      upload: { staticDir: process.env.CONSUMER_MEDIA! },
      access: { read: () => true, create: write, update: write, delete: write },
      fields: [{ name: "alt", type: "text" }],
    },
    {
      slug: "stories",
      access: {
        admin: write,
        create: write,
        update: write,
        delete: write,
        read: ({ req }) =>
          req.user?.role === "author"
            ? true
            : { _status: { equals: "published" } },
      },
      versions: {
        drafts: { autosave: { interval: 1000 }, validate: true },
        maxPerDoc: 20,
      },
      admin: { useAsTitle: "name" },
      fields: [
        { name: "name", type: "text", required: true },
        { name: "slug", type: "text", required: true, unique: true },
        { name: "unrelated", type: "text", admin: { hidden: true } },
        {
          name: "article",
          type: "group",
          fields: [
            {
              name: "sections",
              type: "blocks",
              blocks: [
                {
                  slug: "callout",
                  fields: [
                    { name: "headline", type: "text", required: true },
                    { name: "summary", type: "textarea" },
                    {
                      name: "tone",
                      type: "select",
                      options: [
                        { label: "Bright", value: "bright" },
                        { label: "Quiet", value: "quiet" },
                      ],
                      defaultValue: "bright",
                    },
                    { name: "image", type: "upload", relationTo: "assets" },
                    { name: "body", type: "richText" },
                  ],
                },
                {
                  slug: "quotation",
                  fields: [
                    { name: "headline", type: "text" },
                    { name: "attribution", type: "text" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
