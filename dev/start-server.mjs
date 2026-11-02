import { spawn } from 'node:child_process'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { randomBytes } from 'node:crypto'
const port = process.env.VE_PORT || '3127'
const database = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: `visual_editor_${process.pid}` } })
const env = { ...process.env, DATABASE_URL: database.getUri(), PAYLOAD_SECRET: randomBytes(32).toString('hex'), VE_ORIGIN: `http://127.0.0.1:${port}`, NEXT_TELEMETRY_DISABLED: '1' }
let child
let stopping = false
async function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  if (child && child.exitCode === null) { child.kill(signal); await new Promise(resolve => { child.once('exit',resolve); setTimeout(resolve,10000).unref() }) }
  await database.stop()
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { void stop(signal).then(() => process.exit(0)) })
async function run(args, executable = 'node_modules/next/dist/bin/next', overrides = {}) {
  child = spawn(process.execPath, [executable, ...args], { env: { ...env, ...overrides }, stdio: 'inherit' })
  return new Promise((resolve,reject) => { child.once('error',reject); child.once('exit',code => code === 0 ? resolve() : reject(new Error(`Next exited ${code}`))) })
}
try {
  await run(['dev/prepare-db.ts'],'node_modules/tsx/dist/cli.mjs',{ VE_SEED:'1' })
  if (process.env.VE_PRODUCTION === '1') { await run(['build','dev','--turbopack']); await run(['start','dev','--hostname','127.0.0.1','--port',port]) }
  else await run(['dev','dev','--turbopack','--no-server-fast-refresh','--hostname','127.0.0.1','--port',port])
} finally { await stop() }
