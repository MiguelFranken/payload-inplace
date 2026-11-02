import type { Payload } from 'payload'
/** Deterministic synthetic content only; no consumer services or customer records. */
export async function seed(payload: Payload) {
  if ((await payload.count({ collection: 'users', overrideAccess: true })).totalDocs) return
  for (const role of ['admin','editor','reader'] as const) await payload.create({ collection: 'users', overrideAccess: true, data: { email: `${role}@example.test`, password: 'synthetic-demo-password', role } })
  for (const collection of ['pages','offers']) {
    const layout = [ { blockType: 'hero', heading: 'A public synthetic page', caption: '', privateNote: 'Admin only' }, { blockType: 'text', heading: 'Second section', items: [{ label: 'Preserve nested identity' }] }, { blockType: 'serverData', heading: 'Rendered on the server' } ]
    await payload.create({ collection: collection as any, overrideAccess: true, data: { title: `${collection} demo`, slug: 'demo', unrelated: 'Keep this value', ...(collection === 'pages' ? { layout } : { detailPage: { layout } }), _status: 'published' } })
  }
}
