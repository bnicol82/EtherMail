import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { bridgeSsoToSupabaseAuth } from './auth-bridge.ts'
import { verifyIdTokenStrict } from './jwks.ts'
import { checkAiQuota, currentUsagePeriod, isAiFeature } from './quota.ts'

const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ethermail-session',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Supabase env not configured' })
  }

  const db = createClient(supabaseUrl, serviceKey)
  const url = new URL(req.url)
  let pathname = url.pathname.replace(/^\/functions\/v1\/org-api/, '') || '/'

  try {
    const session = await sessionFromRequest(db, req)

    if (req.method === 'GET' && pathname === '/health') {
      return json(200, { ok: true, backend: 'supabase' })
    }

    if (req.method === 'GET' && pathname === '/org/policy') {
      return json(200, await loadPolicyResponse(db))
    }

    if (req.method === 'PUT' && pathname === '/org/policy') {
      if (!(await requireAdmin(db, session))) return json(403, { error: 'Admin access required' })
      const body = await req.json()
      const { data: existing } = await db.from('org_policies').select('features').eq('org_id', DEMO_ORG_ID).single()
      const features = { ...(existing?.features ?? {}), ...(body.features ?? {}) }
      await db.from('org_policies').update({
        organization_name: body.organizationName ?? body.organization_name,
        features,
        enforce_locks: body.enforceLocks ?? body.enforce_locks,
        quota_overrides: body.quotaOverrides ?? body.quota_overrides,
        updated_at: new Date().toISOString(),
      }).eq('org_id', DEMO_ORG_ID)
      await audit(db, session, 'admin', 'policy_updated')
      return json(200, await loadPolicyResponse(db))
    }

    if (req.method === 'GET' && pathname === '/org/session') {
      if (!session) return json(401, { error: 'No valid session' })
      const { data: member } = await db
        .from('org_members')
        .select('*')
        .eq('id', session.memberId)
        .maybeSingle()
      if (!member) return json(401, { error: 'Member not found' })
      return json(200, {
        member: mapMember(member),
        role: session.role,
        email: session.email,
      })
    }

    if (req.method === 'POST' && pathname === '/org/gate/check') {
      const body = await req.json()
      const policy = await loadPolicy(db)
      const role = session?.role ?? 'member'
      const allowed = canUseFeature(policy.features, role, body.featureId)
      if (!allowed) {
        await audit(db, session, 'policy', 'feature_denied_server', {
          feature_id: body.featureId,
          detail: body.actionLabel,
        })
        return json(200, {
          allowed: false,
          message: gateMessage(body.featureId),
        })
      }

      if (isAiFeature(body.featureId) && role !== 'admin' && role !== 'owner') {
        const { data: org } = await db.from('organizations').select('plan_tier').eq('id', DEMO_ORG_ID).single()
        const period = currentUsagePeriod()
        const { data: usageRow } = await db
          .from('org_usage')
          .select('count')
          .eq('org_id', DEMO_ORG_ID)
          .eq('metric', 'ai_queries')
          .eq('period', period)
          .maybeSingle()
        const usageCount = usageRow?.count ?? 0
        const quota = checkAiQuota({
          planTier: org?.plan_tier ?? 'enterprise',
          quotaOverrides: policy.quota_overrides,
          usageCount,
        })
        if (!quota.allowed) {
          await audit(db, session, 'policy', 'quota_denied_server', {
            feature_id: body.featureId,
            detail: body.actionLabel ?? 'AI query',
          })
          return json(200, { allowed: false, message: quota.message })
        }
        await db.from('org_usage').upsert({
          org_id: DEMO_ORG_ID,
          metric: 'ai_queries',
          period,
          count: usageCount + 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,metric,period' })
      }

      return json(200, { allowed: true, message: null })
    }

    if (req.method === 'GET' && pathname === '/org/audit') {
      const since = url.searchParams.get('since')
      let query = db.from('audit_events').select('*').eq('org_id', DEMO_ORG_ID).order('created_at', { ascending: false }).limit(200)
      if (since) query = query.gt('created_at', since)
      const { data } = await query
      const events = (data ?? []).map(mapAuditRow).reverse()
      return json(200, { events, cursor: events.at(-1)?.timestamp })
    }

    if (req.method === 'POST' && pathname === '/org/audit') {
      const body = await req.json()
      const incoming = Array.isArray(body?.events) ? body.events : []
      if (incoming.length > 0) {
        await db.from('audit_events').insert(
          incoming.map((ev: Record<string, unknown>) => ({
            org_id: DEMO_ORG_ID,
            member_id: session?.memberId ?? null,
            category: ev.category,
            action: ev.action,
            feature_id: ev.featureId ?? null,
            detail: ev.detail ?? null,
            metadata: ev.metadata ?? null,
            created_at: ev.timestamp ?? new Date().toISOString(),
          })),
        )
      }
      return json(201, { accepted: incoming.length })
    }

    if (req.method === 'POST' && pathname === '/org/members') {
      if (!(await requireAdmin(db, session))) return json(403, { error: 'Admin access required' })
      const body = await req.json()
      const email = String(body.email ?? '').trim().toLowerCase()
      const { data, error } = await db.from('org_members').insert({
        org_id: DEMO_ORG_ID,
        email,
        name: body.name ?? email.split('@')[0],
        role: body.role ?? 'member',
        status: 'invited',
      }).select().single()
      if (error) return json(error.code === '23505' ? 409 : 400, { error: error.message })
      await audit(db, session, 'admin', 'member_invited', { detail: email })
      return json(201, mapMember(data))
    }

    const memberMatch = pathname.match(/^\/org\/members\/([^/]+)$/)
    if (memberMatch) {
      const memberId = memberMatch[1]
      if (req.method === 'PATCH') {
        if (!(await requireAdmin(db, session))) return json(403, { error: 'Admin access required' })
        const body = await req.json()
        const { data, error } = await db.from('org_members').update(body).eq('id', memberId).select().single()
        if (error) return json(404, { error: error.message })
        await audit(db, session, 'admin', 'member_updated', { detail: memberId })
        return json(200, mapMember(data))
      }
      if (req.method === 'DELETE') {
        if (!(await requireAdmin(db, session))) return json(403, { error: 'Admin access required' })
        await db.from('org_members').delete().eq('id', memberId)
        await audit(db, session, 'admin', 'member_removed', { detail: memberId })
        return json(200, { ok: true })
      }
    }

    if (req.method === 'PUT' && pathname === '/org/vault-shares') {
      if (!(await requireAdmin(db, session))) return json(403, { error: 'Admin access required' })
      const body = await req.json()
      if (body.vaultShared) {
        await db.from('org_policies').update({ vault_shared: body.vaultShared }).eq('org_id', DEMO_ORG_ID)
      }
      if (Array.isArray(body.vaultShares)) {
        for (const share of body.vaultShares) {
          const { data: row } = await db.from('vault_shares').upsert({
            org_id: DEMO_ORG_ID,
            vault_id: share.vaultId,
            permission: share.permission,
          }, { onConflict: 'org_id,vault_id' }).select().single()
          if (row?.id && Array.isArray(share.memberIds)) {
            await db.from('vault_share_members').delete().eq('share_id', row.id)
            if (share.memberIds.length > 0) {
              await db.from('vault_share_members').insert(
                share.memberIds.map((memberId: string) => ({ share_id: row.id, member_id: memberId })),
              )
            }
          }
        }
      }
      await audit(db, session, 'vault', 'vault_shares_updated')
      const response = await loadPolicyResponse(db)
      return json(200, { vaultShares: response.vaultShares, vaultShared: response.vaultShared })
    }

    if (req.method === 'PUT' && pathname === '/org/sso') {
      if (!(await requireAdmin(db, session))) return json(403, { error: 'Admin access required' })
      const body = await req.json()
      await db.from('sso_configs').update({
        enabled: body.enabled,
        provider: body.provider,
        tenant_id: body.tenantId,
        client_id: body.clientId,
        domain: body.domain,
        enforce_sso: body.enforceSso,
        updated_at: new Date().toISOString(),
      }).eq('org_id', DEMO_ORG_ID)
      await audit(db, session, 'admin', 'sso_config_updated')
      const { data } = await db.from('sso_configs').select('*').eq('org_id', DEMO_ORG_ID).single()
      return json(200, mapSso(data))
    }

    if (req.method === 'POST' && pathname === '/org/auth/sso/callback') {
      const body = await req.json()
      if (!body?.code) return json(400, { error: 'code required' })

      const { data: sso } = await db.from('sso_configs').select('*').eq('org_id', DEMO_ORG_ID).single()
      let email = String(body.email ?? '').toLowerCase()

      if (sso?.enabled && sso.provider !== 'none') {
        try {
          const exchanged = await exchangeCode(sso, body.code, body.redirectUri, body.email)
          email = exchanged.email
        } catch (err) {
          return json(400, { error: err instanceof Error ? err.message : 'SSO failed' })
        }
      } else if (!email) {
        email = 'demo@acme.com'
      }

      let { data: member } = await db.from('org_members').select('*').eq('org_id', DEMO_ORG_ID).eq('email', email).maybeSingle()
      if (!member) {
        const { data: created } = await db.from('org_members').insert({
          org_id: DEMO_ORG_ID,
          email,
          name: email.split('@')[0],
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString(),
        }).select().single()
        member = created
      } else if (member.status === 'invited') {
        const { data: updated } = await db.from('org_members').update({
          status: 'active',
          joined_at: new Date().toISOString(),
        }).eq('id', member.id).select().single()
        member = updated ?? member
      }

      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: sessionRow } = await db.from('org_sessions').insert({
        org_id: DEMO_ORG_ID,
        member_id: member!.id,
        expires_at: expires,
      }).select().single()

      await audit(db, { memberId: member!.id, email: member!.email, role: member!.role }, 'auth', 'sso_login', { detail: email })

      let supabaseAuth: Record<string, unknown> | null = null
      try {
        const bridged = await bridgeSsoToSupabaseAuth(db, email, {
          id: String(member!.id),
          role: String(member!.role),
          name: String(member!.name ?? ''),
        }, DEMO_ORG_ID)
        if (bridged) {
          supabaseAuth = {
            accessToken: bridged.accessToken,
            refreshToken: bridged.refreshToken,
            expiresIn: bridged.expiresIn,
            authUserId: bridged.authUserId,
          }
        }
      } catch (bridgeErr) {
        console.warn('Supabase Auth bridge skipped:', bridgeErr)
      }

      return json(200, {
        sessionToken: sessionRow!.token,
        member: mapMember(member),
        role: member!.role,
        supabaseAuth,
      })
    }

    if (req.method === 'POST' && pathname === '/org/auth/refresh') {
      const body = await req.json()
      const refreshToken = String(body?.refreshToken ?? '')
      if (!refreshToken) return json(400, { error: 'refreshToken required' })

      const authClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken })
      if (error || !data.session) {
        return json(401, { error: error?.message ?? 'Refresh failed' })
      }
      return json(200, {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in ?? 3600,
      })
    }

    if (req.method === 'POST' && pathname === '/org/auth/logout') {
      const token = req.headers.get('x-ethermail-session')
      if (token) {
        await db.from('org_sessions').delete().eq('token', token)
      }
      return json(200, { ok: true })
    }

    return json(404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    return json(500, { error: err instanceof Error ? err.message : 'Server error' })
  }
})

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function sessionFromRequest(db: ReturnType<typeof createClient>, req: Request) {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (bearer) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (supabaseUrl && serviceKey) {
      const authClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: userData, error } = await authClient.auth.getUser(bearer)
      if (!error && userData.user) {
        const user = userData.user
        const { data: byAuth } = await db
          .from('org_members')
          .select('*')
          .eq('org_id', DEMO_ORG_ID)
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (byAuth) {
          return {
            memberId: String(byAuth.id),
            email: String(byAuth.email),
            role: String(byAuth.role),
          }
        }
        const email = user.email?.toLowerCase()
        if (email) {
          const { data: byEmail } = await db
            .from('org_members')
            .select('*')
            .eq('org_id', DEMO_ORG_ID)
            .eq('email', email)
            .maybeSingle()
          if (byEmail) {
            if (!byEmail.auth_user_id) {
              await db.from('org_members').update({ auth_user_id: user.id }).eq('id', byEmail.id)
            }
            return {
              memberId: String(byEmail.id),
              email: String(byEmail.email),
              role: String(byEmail.role),
            }
          }
        }
      }
    }
  }

  const token = req.headers.get('x-ethermail-session')
  if (!token) return null
  const { data } = await db.from('org_sessions').select('*, org_members(*)').eq('token', token).maybeSingle()
  if (!data || new Date(data.expires_at) < new Date()) return null
  const member = data.org_members as Record<string, unknown>
  return {
    memberId: String(data.member_id),
    email: String(member.email),
    role: String(member.role),
  }
}

async function requireAdmin(db: ReturnType<typeof createClient>, session: { role: string } | null) {
  if (!session) return true
  return session.role === 'admin' || session.role === 'owner'
}

async function loadPolicy(db: ReturnType<typeof createClient>) {
  const { data } = await db.from('org_policies').select('*').eq('org_id', DEMO_ORG_ID).single()
  return data!
}

async function loadPolicyResponse(db: ReturnType<typeof createClient>) {
  const policy = await loadPolicy(db)
  const { data: org } = await db.from('organizations').select('*').eq('id', DEMO_ORG_ID).single()
  const { data: members } = await db.from('org_members').select('*').eq('org_id', DEMO_ORG_ID)
  const { data: sso } = await db.from('sso_configs').select('*').eq('org_id', DEMO_ORG_ID).single()
  const { data: shares } = await db.from('vault_shares').select('*, vault_share_members(member_id)').eq('org_id', DEMO_ORG_ID)

  return {
    organizationId: DEMO_ORG_ID,
    planTier: org?.plan_tier ?? 'enterprise',
    policy: {
      organizationId: DEMO_ORG_ID,
      organizationName: policy.organization_name,
      features: policy.features ?? {},
      enforceLocks: policy.enforce_locks,
      quotaOverrides: policy.quota_overrides ?? undefined,
    },
    members: (members ?? []).map(mapMember),
    vaultShares: (shares ?? []).map((s: Record<string, unknown>) => ({
      vaultId: s.vault_id,
      permission: s.permission,
      memberIds: ((s.vault_share_members as { member_id: string }[]) ?? []).map((m) => m.member_id),
    })),
    vaultShared: policy.vault_shared ?? {},
    sso: mapSso(sso),
    syncedAt: new Date().toISOString(),
  }
}

function mapMember(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? row.email),
    role: row.role,
    status: row.status,
    invitedAt: row.invited_at ?? undefined,
    joinedAt: row.joined_at ?? undefined,
  }
}

function mapSso(row: Record<string, unknown> | null) {
  if (!row) {
    return { enabled: false, provider: 'none', tenantId: '', clientId: '', domain: '', enforceSso: false }
  }
  return {
    enabled: Boolean(row.enabled),
    provider: row.provider ?? 'none',
    tenantId: row.tenant_id ?? '',
    clientId: row.client_id ?? '',
    domain: row.domain ?? '',
    enforceSso: Boolean(row.enforce_sso),
  }
}

function mapAuditRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    timestamp: String(row.created_at),
    category: row.category,
    action: row.action,
    featureId: row.feature_id ?? undefined,
    detail: row.detail ?? undefined,
    metadata: row.metadata ?? undefined,
  }
}

async function audit(
  db: ReturnType<typeof createClient>,
  session: { memberId?: string; email?: string; role?: string } | null,
  category: string,
  action: string,
  opts: { feature_id?: string; detail?: string } = {},
) {
  await db.from('audit_events').insert({
    org_id: DEMO_ORG_ID,
    member_id: session?.memberId ?? null,
    category,
    action,
    feature_id: opts.feature_id ?? null,
    detail: opts.detail ?? null,
  })
}

function canUseFeature(features: Record<string, boolean>, role: string, featureId: string) {
  if (role === 'admin' || role === 'owner') return true
  return features[featureId] !== false
}

function gateMessage(featureId: string) {
  return `Your organization has disabled ${featureId.replace(/_/g, ' ')}. Contact your admin.`
}

function emailFromIdToken(idToken: string) {
  const parts = idToken.split('.')
  if (parts.length < 2) return null
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  return payload.email ?? payload.preferred_username ?? payload.upn ?? null
}

async function exchangeCode(
  sso: Record<string, unknown>,
  code: string,
  redirectUri: string | undefined,
  demoEmail: string | undefined,
) {
  const provider = String(sso.provider)
  const clientId = String(sso.client_id ?? '')
  const secret =
    Deno.env.get(`SSO_${provider.toUpperCase()}_CLIENT_SECRET`) ??
    Deno.env.get('SSO_CLIENT_SECRET')

  if (!secret || !clientId) {
    return { email: (demoEmail ?? 'demo@acme.com').toLowerCase() }
  }

  const tokenUrl =
    provider === 'entra'
      ? `https://login.microsoftonline.com/${sso.tenant_id || 'common'}/oauth2/v2.0/token`
      : provider === 'okta'
        ? `https://${sso.domain}/oauth2/v1/token`
        : 'https://oauth2.googleapis.com/token'

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: secret,
    redirect_uri: redirectUri ?? '',
    scope: 'openid profile email',
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`)
  const tokens = await res.json()

  let email: string | null = null
  if (tokens.id_token) {
    try {
      const verified = await verifyIdTokenStrict(
        tokens.id_token,
        provider,
        String(sso.tenant_id ?? ''),
        clientId,
        String(sso.domain ?? ''),
      )
      email = verified.email
    } catch (verifyErr) {
      if (!secret || !clientId) {
        email = emailFromIdToken(tokens.id_token)
      } else {
        throw verifyErr
      }
    }
  }
  email = email ?? (tokens.email ? String(tokens.email).toLowerCase() : null)
  if (!email) throw new Error('No email in SSO token')
  return { email: String(email).toLowerCase() }
}
