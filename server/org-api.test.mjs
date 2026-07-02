import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resetStore(storePath, seedPath) {
  fs.copyFileSync(seedPath, storePath)
}

async function startTestServer() {
  const storePath = path.join(os.tmpdir(), `ethermail-org-store-${randomUUID()}.json`)
  const seedPath = path.join(__dirname, 'org-store.seed.json')
  resetStore(storePath, seedPath)

  process.env.ORG_API_STORE_PATH = storePath
  process.env.ORG_API_SKIP_LISTEN = '1'

  const { server, sessions } = await import('./org-api.mjs')
  sessions.clear()

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  return {
    baseUrl,
    storePath,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
      fs.rmSync(storePath, { force: true })
      delete process.env.ORG_API_STORE_PATH
      delete process.env.ORG_API_SKIP_LISTEN
    },
  }
}

async function loginMember(baseUrl, email) {
  const res = await fetch(`${baseUrl}/org/auth/sso/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'test-code', email }),
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok(body.sessionToken)
  return body
}

describe('org-api', () => {
  /** @type {{ baseUrl: string, close: () => Promise<void> }} */
  let ctx

  before(async () => {
    ctx = await startTestServer()
  })

  after(async () => {
    await ctx.close()
  })

  test('GET /health', async () => {
    const res = await fetch(`${ctx.baseUrl}/health`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.ok, true)
  })

  test('GET /org/policy returns demo organization', async () => {
    const res = await fetch(`${ctx.baseUrl}/org/policy`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.organizationId, 'org-demo')
    assert.ok(Array.isArray(body.members))
    assert.ok(body.policy)
  })

  test('SSO callback creates session and GET /org/session validates it', async () => {
    const login = await loginMember(ctx.baseUrl, 'mike@acme.com')
    assert.equal(login.role, 'member')

    const res = await fetch(`${ctx.baseUrl}/org/session`, {
      headers: { 'X-EtherMail-Session': login.sessionToken },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.email, 'mike@acme.com')
    assert.equal(body.role, 'member')
  })

  test('POST /org/gate/check enforces disabled features for members', async () => {
    const admin = await loginMember(ctx.baseUrl, 'sarah@acme.com')
    const policyRes = await fetch(`${ctx.baseUrl}/org/policy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-EtherMail-Session': admin.sessionToken,
      },
      body: JSON.stringify({ features: { external_ai: false } }),
    })
    assert.equal(policyRes.status, 200)

    const member = await loginMember(ctx.baseUrl, 'mike@acme.com')
    const res = await fetch(`${ctx.baseUrl}/org/gate/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EtherMail-Session': member.sessionToken,
      },
      body: JSON.stringify({
        featureId: 'external_ai',
        actionLabel: 'External AI query',
      }),
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.allowed, false)
    assert.match(body.message, /external ai/i)
  })

  test('PUT /org/policy requires admin session', async () => {
    const member = await loginMember(ctx.baseUrl, 'mike@acme.com')
    const memberRes = await fetch(`${ctx.baseUrl}/org/policy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-EtherMail-Session': member.sessionToken,
      },
      body: JSON.stringify({ organizationName: 'Hacked Org' }),
    })
    assert.equal(memberRes.status, 403)

    const admin = await loginMember(ctx.baseUrl, 'sarah@acme.com')
    const adminRes = await fetch(`${ctx.baseUrl}/org/policy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-EtherMail-Session': admin.sessionToken,
      },
      body: JSON.stringify({ organizationName: 'Updated Org Name' }),
    })
    assert.equal(adminRes.status, 200)
    const body = await adminRes.json()
    assert.equal(body.policy.organizationName, 'Updated Org Name')
  })

  test('GET /org/usage requires session', async () => {
    const anon = await fetch(`${ctx.baseUrl}/org/usage`)
    assert.equal(anon.status, 401)

    const login = await loginMember(ctx.baseUrl, 'mike@acme.com')
    const res = await fetch(`${ctx.baseUrl}/org/usage?connectedMailboxes=1`, {
      headers: { 'X-EtherMail-Session': login.sessionToken },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(typeof body.aiQueries?.used === 'number')
    assert.ok(body.aiQueries?.limit === null || typeof body.aiQueries?.limit === 'number')
  })

  test('POST /org/audit accepts client events', async () => {
    const login = await loginMember(ctx.baseUrl, 'sarah@acme.com')
    const res = await fetch(`${ctx.baseUrl}/org/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EtherMail-Session': login.sessionToken,
      },
      body: JSON.stringify({
        events: [
          {
            category: 'vault',
            action: 'note_created',
            detail: 'Test note',
          },
        ],
      }),
    })
    assert.equal(res.status, 201)
    const body = await res.json()
    assert.equal(body.accepted, 1)

    const auditRes = await fetch(`${ctx.baseUrl}/org/audit`)
    assert.equal(auditRes.status, 200)
    const audit = await auditRes.json()
    assert.ok(audit.events.some((e) => e.action === 'note_created'))
  })
})
