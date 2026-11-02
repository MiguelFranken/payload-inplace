import type { PayloadRequest } from 'payload'

/** Exact document scope for authoring. Root paths are validated against configured block schemas. */
export interface EditorTarget { collection: string; id: string | number; root: string }
/** Serializable identity survives reordering; numeric data paths are resolved immediately before commands. */
export interface BlockIdentity { root: string; blockId: string; ancestors?: string[] }
/** Host permission is additional to native collection/document/field access. Never serialize this callback. */
export interface VisualEditorOptions {
  collections: Record<string, { roots: string[] }>
  previewOrigin: string
  previewPath?: string
  disabled?: boolean
  canEdit: (args: { req: PayloadRequest; target: EditorTarget; document: Record<string, unknown> }) => boolean | Promise<boolean>
  sessionTTL?: number
}
/** Authenticated activation is short lived and bound to the current Payload session and exact target. */
export interface EditContext { target: EditorTarget; user: string; session: string; expires: number; nonce: string }
