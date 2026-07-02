/**
 * Local org policy API for EtherMail enterprise demo.
 * Run: npm run org-api
 * Point VITE_ORG_API_URL at http://localhost:8787 (vite proxy uses /api in dev).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { checkServerGate } from './lib/gate-check.mjs'
import { exchangeSsoAuthorizationCode } from './lib/sso-exchange.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.ORG_API_PORT || 8787)
const STORE_PATH = path.join(__dirname, 'org-store.json')
const SEED_PATH = path.join(__dirname, 'org-store.seed.json')

/** @type {Map<string, { memberId: string, email: string, role: string }>} */
const sessions = new Map()

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.copyFileSync(SEED_PATH, STORE_PATH)
  }
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
}

function saveStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-EtherMail-Session',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      if (chunks.length === 0) return resolve(null)
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function policyResponse(store) {
  return {
    organizationId: store.organizationId,
    policy: store.policy,
    members: store.members,
    vaultShares: store.vaultShares,
    sso: store.sso,
    syncedAt: new Date().toISOString(),
    planTier: store.planTier,
    vaultShared: store.vaultShared ?? {},
  }
}

function sessionFromReq(req) {
  const header = req.headers['x-ethermail-session']
  if (typeof header === 'string' && sessions.has(header)) return sessions.get(header)
  return null
}

function requireAdmin(req, res, store) {
  const session = sessionFromReq(req)
  if (!session) return true
  const member = store.members.find((m) => m.id === session.memberId)
  if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
    json(res, 403, { error: 'Admin access required' })
    return false
  }
  return true
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {})
    return
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  let store = loadStore()

  try {
    if (req.method === 'POST' && url.pathname === '/org/gate/check') {
      const body = await readBody(req)
      const session = sessionFromReq(req)
      const role = session?.role ?? 'member'
      const result = checkServerGate({
        features: store.policy?.features ?? {},
        role,
        featureId: body?.featureId,
        actionLabel: body?.actionLabel,
      })
      if (!result.allowed) {
        store.auditEvents.push(
          auditRow(store, 'policy', 'feature_denied_server', {
            featureId: body?.featureId,
            detail: body?.actionLabel,
            actorEmail: session?.email,
          }),
        )
        saveStore(store)
      }
      json(res, 200, { allowed: result.allowed, message: result.message ?? null })
      return
    }

    if (req.method === 'GET' && url.pathname === '/org/policy') {
      json(res, 200, policyResponse(store))
      return
    }

    if (req.method === 'PUT' && url.pathname === '/org/policy') {
      if (!requireAdmin(req, res, store)) return
      const body = await readBody(req)
      store.policy = { ...store.policy, ...body, features: { ...store.policy.features, ...body.features } }
      store.auditEvents.push(auditRow(store, 'admin', 'policy_updated'))
      saveStore(store)
      json(res, 200, policyResponse(store))
      return
    }

    if (req.method === 'GET' && url.pathname === '/org/audit') {
      const since = url.searchParams.get('since')
      let events = store.auditEvents ?? []
      if (since) events = events.filter((e) => e.timestamp > since)
      json(res, 200, { events: events.slice(-200), cursor: events.at(-1)?.timestamp })
      return
    }

    if (req.method === 'POST' && url.pathname === '/org/audit') {
      const body = await readBody(req)
      const incoming = Array.isArray(body?.events) ? body.events : []
      const session = sessionFromReq(req)
      for (const ev of incoming) {
        store.auditEvents.push({
          id: ev.id || randomUUID(),
          timestamp: ev.timestamp || new Date().toISOString(),
          category: ev.category,
          action: ev.action,
          actorEmail: ev.actorEmail ?? session?.email,
          featureId: ev.featureId,
          detail: ev.detail,
          metadata: ev.metadata,
        })
      }
      store.auditEvents = store.auditEvents.slice(-1000)
      saveStore(store)
      json(res, 201, { accepted: incoming.length })
      return
    }

    if (req.method === 'POST' && url.pathname === '/org/members') {
      if (!requireAdmin(req, res, store)) return
      const body = await readBody(req)
      const email = String(body?.email ?? '').trim().toLowerCase()
      if (!email) {
        json(res, 400, { error: 'email required' })
        return
      }
      if (store.members.some((m) => m.email.toLowerCase() === email)) {
        json(res, 409, { error: 'Member already exists' })
        return
      }
      const member = {
        id: `member-${Date.now()}`,
        email,
        name: String(body?.name ?? email.split('@')[0]),
        role: body?.role ?? 'member',
        status: 'invited',
        invitedAt: new Date().toISOString(),
      }
      store.members.push(member)
      store.auditEvents.push(auditRow(store, 'admin', 'member_invited', { detail: email }))
      saveStore(store)
      json(res, 201, member)
      return
    }

    const memberMatch = url.pathname.match(/^\/org\/members\/([^/]+)$/)
    if (memberMatch) {
      const memberId = memberMatch[1]
      const idx = store.members.findIndex((m) => m.id === memberId)
      if (idx < 0) {
        json(res, 404, { error: 'Member not found' })
        return
      }
      if (req.method === 'PATCH') {
        if (!requireAdmin(req, res, store)) return
        const body = await readBody(req)
        store.members[idx] = { ...store.members[idx], ...body }
        store.auditEvents.push(auditRow(store, 'admin', 'member_updated', { detail: memberId }))
        saveStore(store)
        json(res, 200, store.members[idx])
        return
      }
      if (req.method === 'DELETE') {
        if (!requireAdmin(req, res, store)) return
        const removed = store.members.splice(idx, 1)[0]
        store.vaultShares = store.vaultShares.map((vs) => ({
          ...vs,
          memberIds: vs.memberIds.filter((id) => id !== memberId),
        }))
        store.auditEvents.push(auditRow(store, 'admin', 'member_removed', { detail: removed.email }))
        saveStore(store)
        json(res, 200, { ok: true })
        return
      }
    }

    if (req.method === 'PUT' && url.pathname === '/org/vault-shares') {
      if (!requireAdmin(req, res, store)) return
      const body = await readBody(req)
      if (Array.isArray(body?.vaultShares)) store.vaultShares = body.vaultShares
      if (body?.vaultShared && typeof body.vaultShared === 'object') {
        store.vaultShared = body.vaultShared
      }
      store.auditEvents.push(auditRow(store, 'vault', 'vault_shares_updated'))
      saveStore(store)
      json(res, 200, { vaultShares: store.vaultShares, vaultShared: store.vaultShared })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/org/sso') {
      if (!requireAdmin(req, res, store)) return
      const body = await readBody(req)
      store.sso = { ...store.sso, ...body }
      store.auditEvents.push(auditRow(store, 'admin', 'sso_config_updated'))
      saveStore(store)
      json(res, 200, store.sso)
      return
    }

    if (req.method === 'POST' && url.pathname === '/org/auth/sso/callback') {
      const body = await readBody(req)
      const code = body?.code
      if (!code) {
        json(res, 400, { error: 'code required' })
        return
      }

      let email = String(body?.email ?? '').toLowerCase()
      try {
        if (store.sso?.enabled && store.sso.provider !== 'none') {
          const exchanged = await exchangeSsoAuthorizationCode({
            code,
            provider: store.sso.provider,
            tenantId: store.sso.tenantId,
            clientId: store.sso.clientId,
            redirectUri: body?.redirectUri,
            domain: store.sso.domain,
            demoEmail: body?.email,
          })
          email = exchanged.email
        } else if (!email) {
          email = 'demo@acme.com'
        }
      } catch (err) {
        json(res, 400, {
          error: err instanceof Error ? err.message : 'SSO exchange failed',
        })
        return
      }

      let member = store.members.find((m) => m.email.toLowerCase() === email)
      if (!member) {
        member = {
          id: `member-${Date.now()}`,
          email,
          name: email.split('@')[0],
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString(),
        }
        store.members.push(member)
      } else if (member.status === 'invited') {
        member.status = 'active'
        member.joinedAt = new Date().toISOString()
      }
      const sessionToken = randomUUID()
      sessions.set(sessionToken, { memberId: member.id, email: member.email, role: member.role })
      store.auditEvents.push(auditRow(store, 'auth', 'sso_login', { detail: email, actorEmail: email }))
      saveStore(store)
      json(res, 200, {
        sessionToken,
        member,
        role: member.role,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/org/auth/refresh') {
      const body = await readBody(req)
      if (!body?.refreshToken) {
        json(res, 400, { error: 'refreshToken required' })
        return
      }
      json(res, 200, {
        accessToken: `local-${randomUUID()}`,
        refreshToken: body.refreshToken,
        expiresIn: 3600,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/org/auth/logout') {
      const token = req.headers['x-ethermail-session']
      if (typeof token === 'string') sessions.delete(token)
      json(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, { ok: true })
      return
    }

    json(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    json(res, 500, { error: err instanceof Error ? err.message : 'Server error' })
  }
})

function auditRow(store, category, action, opts = {}) {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    category,
    action,
    detail: opts.detail,
    actorEmail: opts.actorEmail,
    featureId: opts.featureId,
    metadata: opts.metadata,
  }
}

server.listen(PORT, () => {
  if (!fs.existsSync(STORE_PATH)) loadStore()
  console.log(`EtherMail org API listening on http://localhost:${PORT}`)
})
