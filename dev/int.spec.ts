import { beforeAll,afterAll,expect,it } from 'vitest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { getPayload,createLocalReq } from 'payload'
import type { Payload } from 'payload'
import { authorizeTarget } from '../src/server/context.js'
let database: MongoMemoryReplSet | undefined, payload:Payload
beforeAll(async()=>{
  if(process.env.VE_DATABASE !== 'postgres') { database=await MongoMemoryReplSet.create({replSet:{count:1,dbName:'visual_editor_integration'}});process.env.DATABASE_URL=database.getUri() }
  else if(!process.env.DATABASE_URL?.includes('visual_editor')) throw new Error('Provide an isolated visual_editor Postgres database')
  process.env.VE_SEED='1'
  const config=(await import('./payload.config.js')).default
  payload=await getPayload({config})
})
afterAll(async()=>{await payload?.destroy();await database?.stop()})
it('persists drafts through native Payload while published content stays unchanged',async()=>{
 const pages=await payload.find({collection:'pages',overrideAccess:true,limit:1})
 const original:any=pages.docs[0]
 const users=await payload.find({collection:'users',where:{role:{equals:'admin'}},overrideAccess:true})
 const user=users.docs[0];const req=await createLocalReq({user:{...user,collection:'users'}},payload)
 const layout=original.layout.map((row:any,i:number)=>i===0?{...row,heading:'A saved draft'}:row)
 await payload.update({collection:'pages',id:original.id,data:{layout,_status:'draft'},draft:true,req,overrideAccess:false})
 const draft:any=await payload.findByID({collection:'pages',id:original.id,draft:true,req,overrideAccess:false})
 expect(draft.layout[0].heading).toBe('A saved draft')
 expect(draft.layout[1].items[0].id).toBe(original.layout[1].items[0].id)
 expect(draft.unrelated).toBe('Keep this value')
 const published:any=await payload.findByID({collection:'pages',id:original.id,draft:false,overrideAccess:false})
 expect(published.layout[0].heading).toBe(original.layout[0].heading)
 await payload.update({collection:'pages',id:original.id,data:{...draft,_status:'published'},req,overrideAccess:false})
 const final:any=await payload.findByID({collection:'pages',id:original.id,draft:false,overrideAccess:false})
 expect(final.layout[0].heading).toBe('A saved draft')
})
it('enforces actual read/update/host capability with a permitted control',async()=>{
 const pages=await payload.find({collection:'offers',overrideAccess:true,limit:1});const id=pages.docs[0].id
 const {editorOptions}=await import('./payload.config.js')
 const users=await payload.find({collection:'users',overrideAccess:true})
 for(const role of ['editor','reader']) {
  const user=users.docs.find(u=>u.role===role)!;const req=await createLocalReq({user:{...user,collection:'users'}},payload)
  const result=authorizeTarget(req,{collection:'offers',id,root:'detailPage.layout'},editorOptions)
  if(role==='editor') expect((await result).id).toBe(id);else await expect(result).rejects.toThrow()
 }
 const req=await createLocalReq({},payload)
 await expect(authorizeTarget(req,{collection:'offers',id,root:'detailPage.layout'},editorOptions)).rejects.toThrow()
})
