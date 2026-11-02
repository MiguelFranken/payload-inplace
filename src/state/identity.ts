import type { BlockIdentity } from '../types.js'
export interface IndexedBlock { id: string; path: string; parent: string; index: number; blockType: string; ancestors: string[] }
/** Index all block/array descendants without turning positions into identities. Ambiguity fails closed. */
export function indexBlocks(data: unknown, root: string): IndexedBlock[] {
  const result: IndexedBlock[] = []
  const visit = (value: unknown, path: string, ancestors: string[]) => {
    if (Array.isArray(value)) {
      const seen = new Set<string>()
      value.forEach((row, index) => {
        if (!row || typeof row !== 'object') return
        const id = String((row as any).id ?? '')
        if (id && seen.has(id)) throw new Error(`Duplicate row identity in ${path}`)
        if (id) seen.add(id)
        if (typeof (row as any).blockType === 'string') {
          if (!id) throw new Error(`Missing block identity in ${path}`)
          result.push({ id, path: `${path}.${index}`, parent: path, index, blockType: (row as any).blockType, ancestors })
        }
        visit(row, `${path}.${index}`, id ? [...ancestors, id] : ancestors)
      })
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) if (child && typeof child === 'object') visit(child, `${path}.${key}`, ancestors)
    }
  }
  visit(data, root, [])
  return result
}
/** Resolve scoped ancestry on the latest content, never on a cached numeric path. */
export function resolveIdentity(index: IndexedBlock[], identity: BlockIdentity): IndexedBlock | undefined {
  const hits = index.filter(row => row.id === identity.blockId && row.path.startsWith(`${identity.root}.`) && row.ancestors.join('/') === (identity.ancestors ?? []).join('/'))
  if (hits.length > 1) throw new Error('Ambiguous block identity')
  return hits[0]
}
