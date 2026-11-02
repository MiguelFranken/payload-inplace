import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { visualEditor } from '../dist/index.js'
import { seed } from './seed'
import type { Block, CollectionConfig } from 'payload'
const dirname = path.dirname(fileURLToPath(import.meta.url))
const editor = ({ req }: any) => Boolean(req.user && ['admin', 'editor'].includes(req.user.role))
const blocks: Block[] = [
  { slug: 'hero', labels: { singular: 'Hero', plural: 'Heroes' }, fields: [
    { name: 'heading', type: 'text', required: true }, { name: 'caption', type: 'text' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'privateNote', type: 'text', access: { read: ({ req }) => req.user?.role === 'admin', update: ({ req }) => req.user?.role === 'admin' } },
  ] },
  { slug: 'text', labels: { singular: 'Text', plural: 'Texts' }, fields: [
    { name: 'heading', type: 'text' }, { name: 'body', type: 'richText' },
    { name: 'hidden', type: 'checkbox' }, { name: 'items', type: 'array', fields: [{ name: 'label', type: 'text' }] },
  ] },
  { slug: 'serverData', labels: { singular: 'Server data', plural: 'Server data' }, fields: [{ name: 'heading', type: 'text' }] },
]
const content = (slug: string, nested = false): CollectionConfig => ({
  slug, admin: { useAsTitle: 'title', listSearchableFields: ['title', 'slug'] },
  access: { read: ({ req }) => req.user ? true : { _status: { equals: 'published' } }, create: editor, update: editor, delete: editor },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  fields: [{ name: 'title', type: 'text', required: true }, { name: 'slug', type: 'text', required: true, unique: true },
    ...(nested ? [{ type: 'tabs' as const, tabs: [{ name: 'detailPage', label: 'Presentation', fields: [{ name: 'layout', type: 'blocks' as const, blocks }] }] }] : [{ name: 'layout', type: 'blocks' as const, blocks }]),
    { name: 'unrelated', type: 'text' },
  ],
})
export const editorOptions = {
  collections: { pages: { roots: ['layout'] }, offers: { roots: ['detailPage.layout'] } },
  previewOrigin: process.env.VE_ORIGIN || 'http://127.0.0.1:3127',
  canEdit: ({ req }: any) => editor({ req }),
  disabled: process.env.VE_DISABLED === '1',
}
export default buildConfig({
  admin: { user: 'users', importMap: { baseDir: dirname, importMapFile: path.join(dirname,'app/(payload)/admin/importMap.js') } },
  collections: [
    { slug: 'users', auth: true, admin: { useAsTitle: 'email' }, access: { admin: ({ req }) => Boolean(req.user), create: ({ req }) => req.user?.role === 'admin', update: ({ req }) => req.user?.role === 'admin', delete: ({ req }) => req.user?.role === 'admin' }, fields: [{ name: 'role', type: 'select', options: ['admin','editor','reader'], required: true, defaultValue: 'reader', saveToJWT: true, access: { update: ({ req }) => req.user?.role === 'admin' } }] },
    { slug: 'media', upload: { staticDir: path.join(dirname,'media') }, access: { read: () => true, create: editor, update: editor, delete: editor }, fields: [{ name: 'alt', type: 'text' }] },
    content('pages'), content('offers', true),
  ],
  db: process.env.VE_DATABASE === 'postgres' ? postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL }, push: true }) : mongooseAdapter({ ensureIndexes: true, url: process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/visual-editor-demo' }),
  editor: lexicalEditor(), plugins: [visualEditor(editorOptions)],
  secret: process.env.PAYLOAD_SECRET || 'synthetic-demo-only-not-a-production-secret',
  onInit: process.env.VE_SEED === '1' ? seed : undefined, typescript: { autoGenerate: false, outputFile: path.join(dirname,'payload-types.ts') },
})
