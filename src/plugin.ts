import type { Config, Plugin } from 'payload'
import type { VisualEditorOptions } from './types.js'
import { resolveRoot } from './schema/resolve.js'
import { authorizeTarget, createContext, signContext } from './server/context.js'

/** Compose opt-in roots without replacing native persistence, existing hooks or unrelated controls. */
export function visualEditor(options: VisualEditorOptions): Plugin {
  const origin = new URL(options.previewOrigin).origin
  return (config: Config): Config => {
    if (options.disabled) return config
    const collections = (config.collections ?? []).map(collection => {
      const setting = options.collections[collection.slug]
      if (!setting) return collection
      // Clone only the schema tree to preserve callback identities without mutating host configuration.
      function clone<T>(value: T): T { if (Array.isArray(value)) return value.map(clone) as T; if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,clone(v)])) as T; return value }
      const fields = clone(collection.fields)
      for (const root of setting.roots) {
        const field = resolveRoot(fields, root)
        if (field.admin?.components?.Field) throw new Error(`Visual editor cannot replace existing custom field at ${collection.slug}.${root}`)
        field.admin = { ...field.admin, components: { ...field.admin?.components, Field: { path: '@miguelfranken/payload-visual-editor/client#VisualBlocksField', clientProps: { root, previewPath: options.previewPath ?? '/visual-editor/preview' } } } }
      }
      return { ...collection, fields }
    })
    return { ...config, collections, endpoints: [...(config.endpoints ?? []), {
      path: '/visual-editor/activate', method: 'post', handler: async req => {
        const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' }
        if (req.headers.get('origin') !== origin) return Response.json({ error: 'Invalid origin' }, { status: 403, headers })
        try {
          const target = await req.json?.()
          if (!target || typeof target.collection !== 'string' || !['string','number'].includes(typeof target.id) || typeof target.root !== 'string') return Response.json({ error: 'Invalid target' }, { status: 400, headers })
          await authorizeTarget(req, target, options)
          const context = createContext(req, target, options.sessionTTL)
          const token = signContext(context, req.payload.secret)
          return Response.json({ context }, { headers: { ...headers, 'Set-Cookie': `payload-ve=${token}; HttpOnly; SameSite=Strict; Path=${options.previewPath ?? '/visual-editor/preview'}; Max-Age=${Math.floor((context.expires-Date.now())/1000)}${origin.startsWith('https:') ? '; Secure' : ''}` } })
        } catch { return Response.json({ error: 'Editor access denied or target unavailable' }, { status: 403, headers }) }
      },
    }] }
  }
}
