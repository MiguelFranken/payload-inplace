import { getBlockAttributes, getFieldAttributes } from '../../dist/exports/bindings.js'
/** The exact same server renderer serves public and authorized preview surfaces. */
export async function RenderPage({ document, root, active = false }: { document: any; root: string; active?: boolean }) {
  const layout = root.split('.').reduce((v,k) => v?.[k], document) ?? []
  return <main>{layout.map((block: any) => {
    const identity = { root, blockId: block.id }
    if (block.hidden) return null
    return <section key={block.id} {...getBlockAttributes(identity,active)} style={{ padding:'3rem', borderBottom:'1px solid', minHeight:'180px' }}>
      <h1 {...getFieldAttributes({ ...identity,field:'heading' },active)}>{block.heading || (active ? 'Empty heading' : '')}</h1>
      {block.caption && <p>{block.caption}</p>}
      {block.items?.map((item: any) => <p key={item.id}>{item.label}</p>)}
      {block.blockType === 'serverData' && <p>Server result: {document.slug}</p>}
      {block.image?.url && <img src={block.image.url} alt={block.image.alt || ''} width={300} />}
    </section>
  })}</main>
}
