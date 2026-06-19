import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir, platform, arch } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

const HUB = 'https://evomap.ai'
const evomapDir = join(homedir(), '.evomap')
const nodeIdPath = join(evomapDir, 'node_id')
const nodeSecretPath = join(evomapDir, 'node_secret')

function messageId() {
  return `msg_${Date.now()}_${randomBytes(2).toString('hex')}`
}

async function readTrimmed(path) {
  try {
    return (await readFile(path, 'utf8')).trim()
  } catch {
    return null
  }
}

async function hasPrivateDirectory(path) {
  try {
    const info = await stat(path)
    return info.isDirectory()
  } catch {
    return false
  }
}

async function loadExistingCredentials() {
  const nodeId = await readTrimmed(nodeIdPath)
  const nodeSecret = await readTrimmed(nodeSecretPath)
  if (!nodeId || !nodeSecret) return null
  if (!nodeId.startsWith('node_')) return null
  if (!/^[a-f0-9]{64}$/i.test(nodeSecret)) return null
  return { nodeId, nodeSecret }
}

async function helloExisting({ nodeId, nodeSecret }) {
  const response = await fetch(`${HUB}/a2a/hello`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${nodeSecret}`,
    },
    body: JSON.stringify({
      protocol: 'gep-a2a',
      protocol_version: '1.0.0',
      message_type: 'hello',
      message_id: messageId(),
      sender_id: nodeId,
      timestamp: new Date().toISOString(),
      payload: {},
    }),
  })

  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

async function registerFresh() {
  const response = await fetch(`${HUB}/a2a/hello`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      protocol: 'gep-a2a',
      protocol_version: '1.0.0',
      message_type: 'hello',
      message_id: messageId(),
      timestamp: new Date().toISOString(),
      payload: {
        capabilities: {
          demo: ['evopi-web', 'pigenome', 'goal-studio', 'piroom'],
        },
        model: 'codex-agent',
        name: 'EvoPi Agent',
        env_fingerprint: {
          platform: platform(),
          arch: arch(),
          project: 'evopi-web',
        },
      },
    }),
  })

  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

async function saveCredentials(nodeId, nodeSecret) {
  await mkdir(evomapDir, { recursive: true, mode: 0o700 })
  if (!(await hasPrivateDirectory(evomapDir))) {
    throw new Error('Could not create ~/.evomap as a private directory.')
  }
  await writeFile(nodeIdPath, `${nodeId}\n`, { mode: 0o600 })
  await writeFile(nodeSecretPath, `${nodeSecret}\n`, { mode: 0o600 })
}

function unwrapPayload(data) {
  return data?.payload ?? data ?? {}
}

async function main() {
  const save = process.argv.includes('--save')
  const fresh = process.argv.includes('--fresh')

  if (!fresh) {
    const existing = await loadExistingCredentials()
    if (existing) {
      const probe = await helloExisting(existing)
      const payload = unwrapPayload(probe.data)
      console.log(`Existing EvoMap node found: ${existing.nodeId}`)
      if (probe.ok && payload.claimed) {
        console.log('Status: already bound to an EvoMap account.')
        return
      }
      if (probe.ok && payload.claim_url) {
        console.log(`Claim URL: ${payload.claim_url}`)
        console.log('Open this URL to bind the node to your EvoMap account.')
        return
      }
      console.log(`Status probe failed with HTTP ${probe.status}.`)
      return
    }
  }

  const registration = await registerFresh()
  const payload = unwrapPayload(registration.data)
  if (!registration.ok) {
    console.error(`Registration failed with HTTP ${registration.status}.`)
    console.error(JSON.stringify(registration.data, null, 2))
    process.exit(1)
  }

  const nodeId = payload.your_node_id
  const nodeSecret = payload.node_secret
  const claimUrl = payload.claim_url

  console.log(`New EvoMap node registered: ${nodeId}`)
  console.log(`Claim URL: ${claimUrl}`)
  console.log('Open this URL to bind the node to your EvoMap account.')
  console.log('A node_secret was issued but is not printed.')

  if (save) {
    if (!nodeId || !nodeSecret) {
      throw new Error('Registration response did not include credentials.')
    }
    await saveCredentials(nodeId, nodeSecret)
    console.log('Credentials saved privately under ~/.evomap/.')
  } else {
    console.log('Credentials were not saved. Run again with --save only after explicit user authorization.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
