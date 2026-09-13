import { mkdtempSync, rmSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
const paths = []
afterEach(() => { for (const path of paths.splice(0)) rmSync(path, { recursive: true, force: true }) })
export function persistentConfig (config = {}) {
  const root = resolve('.state/unit-tests')
  mkdirSync(root, { recursive: true, mode: 0o700 })
  const path = mkdtempSync(join(root, 'signer-'))
  paths.push(path)
  return { permissiveSignerPolicy: false, signerStorage: { path, mode: 'create' }, ...config }
}
