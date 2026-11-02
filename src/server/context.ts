import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { EditContext, EditorTarget, VisualEditorOptions } from '../types.js'
import type { PayloadRequest } from 'payload'

/** Stable document key includes string/numeric identity semantics and the configured root. */
export function documentKey(target: EditorTarget): string { return JSON.stringify([target.collection, String(target.id), target.root]) }
function signature(value: string, secret: string) { return createHmac('sha256', secret).update(value).digest('base64url') }
/** Sign server-verified activation; the token is sent in a private response, never a URL. */
export function signContext(context: EditContext, secret: string): string {
  const value = Buffer.from(JSON.stringify(context)).toString('base64url')
  return `${value}.${signature(value, secret)}`
}
/** Verify integrity/expiry before trusting scope; callers still recheck current user/session/capability. */
export function verifyContext(token: string, secret: string, now = Date.now()): EditContext | null {
  if (!token || token.length > 4096) return null
  const [value, mac, extra] = token.split('.')
  if (!value || !mac || extra) return null
  const correct = signature(value, secret)
  if (mac.length !== correct.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(correct))) return null
  try {
    const c = JSON.parse(Buffer.from(value, 'base64url').toString())
    if (!c.target || typeof c.target.collection !== 'string' || !['string', 'number'].includes(typeof c.target.id) || typeof c.target.root !== 'string' || typeof c.user !== 'string' || typeof c.session !== 'string' || typeof c.nonce !== 'string' || !Number.isFinite(c.expires) || c.expires <= now) return null
    return c
  } catch { return null }
}
/** Authorize through the host capability and ordinary read/update/admin access, including update Where. */
export async function authorizeTarget(req: PayloadRequest, target: EditorTarget, options: VisualEditorOptions): Promise<Record<string, any>> {
  if (!req.user || !options.collections[target.collection]?.roots.includes(target.root)) throw new Error('Editor access denied')
  const collection = req.payload.collections[target.collection as keyof typeof req.payload.collections]?.config
  if (!collection) throw new Error('Editor target unavailable')
  const admin = collection.access?.admin ? await collection.access.admin({ req }) : true
  if (!admin) throw new Error('Editor access denied')
  const document = await req.payload.findByID({ collection: target.collection as any, id: target.id, draft: true, depth: 0, req, overrideAccess: false })
  const update = collection.access?.update ? await collection.access.update({ req, id: target.id as never, data: document }) : Boolean(req.user)
  if (!update) throw new Error('Editor access denied')
  if (typeof update === 'object') {
    const allowed = await req.payload.find({ collection: target.collection as any, where: { and: [{ id: { equals: target.id } }, update] }, draft: true, depth: 0, limit: 1, req, overrideAccess: false })
    if (!allowed.docs.length) throw new Error('Editor access denied')
  }
  if (!await options.canEdit({ req, target, document })) throw new Error('Editor access denied')
  return document
}
/** Bind to Payload's current session; logout/relogin invalidates activation even for the same account. */
export function currentSession(req: PayloadRequest): string { return String((req.user as any)?._sid ?? '') }
export function createContext(req: PayloadRequest, target: EditorTarget, ttl = 900000): EditContext {
  if (!req.user || !currentSession(req)) throw new Error('Session-backed authentication required')
  return { target, user: `${req.user.collection}:${req.user.id}`, session: currentSession(req), expires: Date.now() + Math.min(ttl, 900000), nonce: randomBytes(24).toString('base64url') }
}
/** Recheck active session and authorization on every protected server read. */
export async function readEditContext(req: PayloadRequest, token: string, options: VisualEditorOptions) {
  const context = verifyContext(token, req.payload.secret)
  if (!context || !req.user || context.user !== `${req.user.collection}:${req.user.id}` || context.session !== currentSession(req)) throw new Error('Editor session expired')
  const document = await authorizeTarget(req, context.target, options)
  return { context, document }
}
