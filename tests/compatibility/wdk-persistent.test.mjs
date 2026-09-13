// Real native storage diagnostics only; no channels, unlock, funds or atomic approval.
import assert from 'node:assert/strict'
import test from 'node:test'
import { randomBytes, createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync
} from 'node:fs'
import path from 'node:path'
const root = path.resolve('.state/persistent-tests')
mkdirSync(root, { recursive: true, mode: 0o700 })
const artifact = readFileSync(
  'node_modules/@utexo/rgb-lightning-node-nodejs/index-linux-x64-gnu.node'
)
assert.equal(
  createHash('sha256').update(artifact).digest('hex'),
  '7fa8b97123d9b527ea628ec5d61c0ca0429583713faf7b83b92a2432197527ef'
)
function fixture (t) {
  const dir = mkdtempSync(path.join(root, 'unfunded-'))
  const storePath = path.join(dir, 'signer')
  mkdirSync(storePath, { mode: 0o700 })
  const seed = randomBytes(32)
  t.after(() => {
    seed.fill(0)
    rmSync(dir, { recursive: true, force: true })
  })
  return { seed, storePath, nodePath: path.join(dir, 'node') }
}
function probe (f, mode, changes = {}) {
  const result = spawnSync(
    process.execPath,
    ['tests/compatibility/wdk-persistent-child.mjs'],
    {
      input: JSON.stringify({
        ...f,
        seed: f.seed.toString('hex'),
        mode,
        ...changes
      }),
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 65536
    }
  )
  // Never echo native diagnostics that could include sensitive state.
  assert.equal(
    result.error,
    undefined,
    'child must finish within its deadline'
  )
  assert.equal(
    result.signal,
    null,
    'native failure must not terminate the process'
  )
  if (result.status !== 0) {
    assert.equal(result.status, 2)
    assert.deepEqual(JSON.parse(result.stdout), { rejected: true })
    return { rejected: true }
  }
  return JSON.parse(result.stdout)
}
test('actual WDK persistent constructor writes state and survives three process restarts', (t) => {
  const f = fixture(t)
  const first = probe(f, 'create')
  assert.equal(first.disposed, true)
  assert.ok(readdirSync(f.storePath).includes('redb')) // Ephemeral create cannot satisfy this.
  for (let i = 0; i < 3; i++) assert.deepEqual(probe(f, 'resume'), first)
})
test('resume missing storage rejects without creating a database', (t) => {
  const f = fixture(t)
  assert.equal(probe(f, 'resume').rejected, true)
  assert.deepEqual(readdirSync(f.storePath), [])
})
test('create refuses existing signer state', (t) => {
  const f = fixture(t)
  assert.equal(probe(f, 'create').disposed, true)
  assert.equal(probe(f, 'create').rejected, true)
})
test('resume corrupt storage rejects', (t) => {
  const f = fixture(t)
  writeFileSync(path.join(f.storePath, 'redb'), 'corrupt', { mode: 0o600 })
  assert.equal(probe(f, 'resume').rejected, true)
})
test('resume different identity rejects rather than regenerating a signer', (t) => {
  const f = fixture(t)
  const first = probe(f, 'create')
  assert.equal(first.disposed, true)
  const wrong = randomBytes(32)
  t.after(() => wrong.fill(0))
  assert.equal(probe({ ...f, seed: wrong }, 'resume').rejected, true)
  assert.deepEqual(probe(f, 'resume'), first)
})
test('resume wrong absent path rejects', (t) => {
  const f = fixture(t)
  assert.equal(
    probe(f, 'resume', { storePath: path.join(f.storePath, 'absent') })
      .rejected,
    true
  )
})
test('second process cannot open the WDK-owned active signer database', async (t) => {
  const f = fixture(t)
  const { default: Manager } = await import(
    '../../index-node.js'
  )
  const manager = new Manager(f.seed, {
    network: 'regtest',
    dataDir: f.nodePath,
    permissiveSignerPolicy: false,
    signerStorage: { path: f.storePath, mode: 'create' }
  })
  try {
    await manager.getAccount()
    assert.equal(probe(f, 'resume').rejected, true)
  } finally {
    manager.dispose()
  }
  assert.equal(probe(f, 'resume').disposed, true)
})

test(
  'strict unfunded WDK unlock, process shutdown and reopen',
  {
    skip: process.env.WDK_REGTEST !== '1'
  },
  (t) => {
    const f = fixture(t)
    const first = probe(f, 'create', { unlock: true })
    assert.equal(first.disposed, true)
    assert.deepEqual(probe(f, 'resume', { unlock: true }), first)
  }
)
test('missing VLS state cannot be recreated beside existing node state', (t) => {
  const f = fixture(t)
  mkdirSync(f.nodePath)
  writeFileSync(path.join(f.nodePath, 'existing-state'), 'unfunded-fixture')
  assert.equal(probe(f, 'create').rejected, true)
  assert.deepEqual(readdirSync(f.storePath), [])
})
