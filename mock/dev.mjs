import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = []
let stopping = false

function run(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  })
  children.push(child)
  return child
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 100).unref()
}

const api = run(process.execPath, ['mock/server.mjs'])
api.on('exit', (code) => {
  if (!stopping && code !== 0) stop(code ?? 1)
})

const ui = run(npm, ['run', 'dev', '--', '--host', '127.0.0.1'], {
  VITE_API_TARGET: 'http://127.0.0.1:8787',
})
ui.on('exit', (code) => {
  if (!stopping) stop(code ?? 0)
})

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
console.log('Demo UI: http://127.0.0.1:3000 (Ctrl+C stops both processes)')
