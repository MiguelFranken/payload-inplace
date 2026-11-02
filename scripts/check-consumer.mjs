import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
const report=JSON.parse(fs.readFileSync('test-results/package.json','utf8'))
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'visual-editor-consumer-'))
try {
 execFileSync('tar',['-xzf',path.resolve(report.archive),'-C',dir])
 const {getBlockAttributes}=await import(path.join(dir,'package/dist/exports/bindings.js'))
 if(Object.keys(getBlockAttributes({root:'presentation.sections',blockId:'synthetic'})).length)throw Error('Inactive consumer emits annotations')
 if(!getBlockAttributes({root:'presentation.sections',blockId:'synthetic'},true)['data-ve-block'])throw Error('Active control failed')
 console.log('Clean packed binding consumer passed')
} finally {fs.rmSync(dir,{recursive:true,force:true})}
