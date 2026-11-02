import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const output=execFileSync('corepack',['pnpm','pack','--pack-destination','.'],{encoding:'utf8'})
const archive=output.trim().split('\n').at(-1)
const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).split('\n')
for(const entry of ['index.js','index.d.ts','exports/client.js','exports/preview.js','exports/bindings.js','exports/server.js','exports/types.d.ts','admin/styles.css']) if(!entries.includes(`package/dist/${entry}`)) throw Error(`Missing ${entry}`)
for(const entry of entries) if(/(?:node_modules|dev\/|test-results|\.env|\.git\/)/.test(entry)) throw Error(`Unexpected private/dev package entry ${entry}`)
const visit=(file,seen=new Set())=>{
 file=path.resolve(file);if(seen.has(file))return seen;seen.add(file)
 const source=fs.readFileSync(file,'utf8')
 for(const match of source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) { const spec=match[1];if(spec.startsWith('.'))visit(path.resolve(path.dirname(file),spec),seen);else if(/payload|lexical|dnd|node:/.test(spec))throw Error(`Public binding graph imports ${spec}`) }
 if(/use client|\.css|VisualBlocksField|PreviewBridge/.test(source))throw Error(`Public binding graph leaked client/editor work: ${file}`)
 return seen
}
const graph=[...visit('dist/exports/bindings.js')]
for(const file of ['dist/exports/client.js','dist/exports/preview.js'])if(!fs.readFileSync(file,'utf8').startsWith('"use client"'))throw Error(`Missing directive ${file}`)
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/package.json',JSON.stringify({archive,sha256:createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),graph},null,2))
console.log(`Packed boundary checks passed: ${archive}`)
