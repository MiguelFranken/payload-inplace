import { execFileSync,spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
const name=`payload-visual-editor-${process.pid}`
const password=randomBytes(16).toString('hex')
try {
 execFileSync('docker',['run','--rm','-d','--name',name,'-e',`POSTGRES_PASSWORD=${password}`,'-e','POSTGRES_DB=visual_editor','-p','127.0.0.1::5432','postgres:17-alpine'],{stdio:['ignore','pipe','inherit']})
 const port=execFileSync('docker',['port',name,'5432/tcp'],{encoding:'utf8'}).trim().split(':').at(-1)
 for(let attempt=0;attempt<60;attempt++) { if(spawnSync('docker',['exec',name,'pg_isready','-U','postgres'],{stdio:'ignore'}).status===0)break;await new Promise(r=>setTimeout(r,250));if(attempt===59)throw Error('Postgres readiness failed') }
 const test=spawnSync('corepack',['pnpm','test:int:postgres'],{env:{...process.env,DATABASE_URL:`postgresql://postgres:${password}@127.0.0.1:${port}/visual_editor`},stdio:'inherit'})
 process.exitCode=test.status ?? 1
} finally { spawnSync('docker',['rm','-f',name],{stdio:'ignore'}) }
