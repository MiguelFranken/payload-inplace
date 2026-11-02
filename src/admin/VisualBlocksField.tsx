'use client'
import type { BlocksFieldClientProps, ClientBlock, SanitizedFieldPermissions } from 'payload'
import { BlocksField, Button, RenderFields, SaveDraftButton, PublishButton, useConfig, useDocumentInfo, useForm, useFormFields, useFormModified, useFormProcessing, useFormBackgroundProcessing, useField } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EditContext } from '../types.js'
import { PROTOCOL, validateMessage } from '../preview/protocol.js'
import './styles.css'

/** A single native field owner switches presentation while retaining the existing document Form/state. */
export function VisualBlocksField(props: BlocksFieldClientProps & { root: string; previewPath: string }) {
  const [context,setContext] = useState<EditContext | null>(null)
  const [error,setError] = useState('')
  const info = useDocumentInfo()
  const { config } = useConfig()
  const button = useRef<HTMLButtonElement>(null)
  async function open() {
    setError('')
    try {
      const response = await fetch(`${config.routes.api}/visual-editor/activate`,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({collection:info.collectionSlug,id:info.id,root:props.root}) })
      if (!response.ok) throw new Error('Editing is unavailable. Check your permissions or reopen the document.')
      setContext((await response.json()).context)
    } catch (e) { setError((e as Error).message) }
  }
  return <>
    {info.id && <Button buttonStyle="secondary" ref={button} type="button" onClick={()=>void open()}>Open visual editor</Button>}
    {error && <p role="alert">{error} Standard CMS editing remains available.</p>}
    {context ? <Workspace {...props} context={context} onClose={()=>{setContext(null); requestAnimationFrame(()=>button.current?.focus())}} /> : <BlocksField {...props} />}
  </>
}

function Workspace(props: BlocksFieldClientProps & { root:string; previewPath:string; context:EditContext; onClose:()=>void }) {
  const { field,permissions,readOnly,context,previewPath,onClose } = props
  const path = props.path || props.root
  const schemaPath = props.schemaPath || path
  const { config } = useConfig()
  const { data,id,collectionSlug,hasSavePermission } = useDocumentInfo()
  const form = useForm()
  const modified = useFormModified()
  const processing = useFormProcessing()
  const background = useFormBackgroundProcessing()
  const { rows = [],blocksFilterOptions } = useField<number>({path,hasRows:true})
  const selectedRows = useFormFields(([fields])=>fields[path]?.rows)
  const [selected,setSelected] = useState<string | undefined>(rows[0]?.id)
  const [width,setWidth] = useState('100%')
  const [state,setState] = useState('Loading preview')
  const iframe = useRef<HTMLIFrameElement>(null)
  const out = useRef(0), incoming = useRef(-1)
  const documentKey = JSON.stringify([collectionSlug,String(id),props.root])
  const origin = window.location.origin
  const index = (selectedRows || rows).findIndex(row=>row.id === selected)
  const row = rows[index]
  const blocks = (field.blockReferences || field.blocks).map(block=>typeof block === 'string' ? (config.blocksMap as Record<string,ClientBlock>)?.[block] : block).filter(Boolean) as ClientBlock[]
  const block = blocks.find(b=>b.slug === row?.blockType)
  const disabled = readOnly || !hasSavePermission || form.disabled || processing
  const send = (payload:any) => iframe.current?.contentWindow?.postMessage({protocol:PROTOCOL,session:context.nonce,document:documentKey,sequence:out.current++,...payload},origin)
  useEffect(()=>{
    const listener = (event:MessageEvent) => {
      if (!validateMessage(event,{source:iframe.current?.contentWindow || null,origin,session:context.nonce,document:documentKey,after:incoming.current})) return
      incoming.current=event.data.sequence
      if (event.data.type === 'select' && event.data.identity.root === props.root && !(event.data.identity.ancestors?.length)) setSelected(event.data.identity.blockId)
      if (event.data.type === 'rendered') setState(event.data.revision === String(data?.updatedAt) ? 'Preview current' : 'Saved; preview pending')
    }
    window.addEventListener('message',listener)
    return ()=>window.removeEventListener('message',listener)
  },[origin,context.nonce,documentKey,props.root,data?.updatedAt])
  useEffect(()=>{ send({type:'refresh'}); setState('Saved; preview pending') },[data?.updatedAt])
  useEffect(()=>{ if (selected) send({type:'highlight',identity:{root:props.root,blockId:selected,ancestors:[]}}) },[selected,props.root])
  useEffect(()=>{ const timer = setTimeout(()=>{send({type:'stop'});onClose()},Math.max(0,context.expires-Date.now())); return ()=>clearTimeout(timer) },[context.expires])
  const action = (type:'up'|'down'|'duplicate'|'remove') => {
    if (disabled || index < 0) return
    if (type === 'up' || type === 'down') { const to = index + (type === 'up' ? -1 : 1); if (to < 0 || to >= rows.length) return; form.moveFieldRow({path,moveFromIndex:index,moveToIndex:to}) }
    if (type === 'duplicate') { if (field.maxRows && rows.length >= field.maxRows) return; form.dispatchFields({type:'DUPLICATE_ROW',path,rowIndex:index}) }
    if (type === 'remove') { if (rows.length <= (field.minRows || (field.required ? 1 : 0))) return; form.removeFieldRow({path,rowIndex:index}); setSelected(rows[index-1]?.id || rows[index+1]?.id) }
    form.setModified(true)
  }
  let blockPermissions: any = permissions
  if (permissions !== true) {
    const specific = (permissions as any)?.blocks?.[block?.slug || ''] ?? (permissions as any)?.blocks
    blockPermissions = specific === true ? true : specific?.fields ?? { read:false,create:false,update:false }
  }
  const allowedBlocks = blocks.filter(b=>!blocksFilterOptions || blocksFilterOptions.includes(b.slug))
  return createPortal(<div className="ve-workspace" role="region" aria-label="Visual editor">
    <header className="ve-toolbar"><strong>Visual editor</strong><span role="status">{processing || background ? 'Saving' : modified ? 'Edited' : state}</span><label>Viewport <select aria-label="Viewport" value={width} onChange={e=>setWidth(e.target.value)}><option value="100%">Desktop</option><option value="390px">Mobile</option></select></label><SaveDraftButton/><PublishButton/><Button type="button" buttonStyle="secondary" onClick={onClose}>Close editor</Button></header>
    <div className="ve-layout"><aside className="ve-tree" aria-label="Sections"><h2>Sections</h2>{rows.map((r,i)=><button type="button" key={r.id} aria-pressed={r.id===selected} onClick={()=>setSelected(r.id)}>{i+1}. {r.blockType}</button>)}<label>Add section <select aria-label="Add section" disabled={disabled || Boolean(field.maxRows && rows.length>=field.maxRows)} value="" onChange={e=>{if(e.target.value){form.addFieldRow({path,schemaPath,blockType:e.target.value,rowIndex:rows.length});form.setModified(true)}}}><option value="">Choose block</option>{allowedBlocks.map(b=><option key={b.slug} value={b.slug}>{b.slug}</option>)}</select></label></aside>
    <div className="ve-canvas"><iframe ref={iframe} title="Storefront preview" src={previewPath} style={{width}} /></div>
    <aside className="ve-inspector" aria-label="Block inspector"><h2>{block?.slug || 'Select a section'}</h2>{row && <nav aria-label="Section actions">{(['up','down','duplicate','remove'] as const).map(type=><Button type="button" buttonStyle="secondary" size="small" key={type} disabled={disabled} onClick={()=>action(type)}>{type}</Button>)}</nav>}
      {block ? <RenderFields key={row?.id} fields={block.fields} parentIndexPath="" parentPath={`${path}.${index}`} parentSchemaPath={schemaPath+block.slug} permissions={blockPermissions as SanitizedFieldPermissions} readOnly={disabled} forceRender /> : <p>Use standard CMS editing for unavailable blocks. Existing values are retained.</p>}
    </aside></div>
  </div>,document.body)
}
