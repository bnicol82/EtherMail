import type { OrgPolicy, OrgRole, FeatureId } from '../types/admin'
import type { AuditEvent } from '../types/audit'
import type {
  OrgApiAuditResponse,
  OrgApiPolicyResponse,
  OrgMember,
  SsoCallbackResponse,
  SsoConfig,
  VaultShare,
} from '../types/orgApi'
import { DEFAULT_ORG_POLICY } from './orgPolicy'

const API_BASE = import.meta.env.VITE_ORG_API_URL ?? ''
const SESSION_KEY = 'ethermail-org-session'
const SUPABASE_AUTH_KEY = 'ethermail-supabase-auth'

export interface StoredSupabaseAuth {
  accessToken: string
  refreshToken: string
  expiresAt: number
  authUserId?: string
}

/** True when a remote org policy API is configured */
export function hasOrgApi(): boolean {
  return Boolean(API_BASE)
}

export function getOrgSessionToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(SESSION_KEY)
}

export function setOrgSessionToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return
  if (token) localStorage.setItem(SESSION_KEY, token)
  else localStorage.removeItem(SESSION_KEY)
}

export function getSupabaseAuth(): StoredSupabaseAuth | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(SUPABASE_AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSupabaseAuth
  } catch {
    return null
  }
}

export function setSupabaseAuth(tokens: StoredSupabaseAuth | null): void {
  if (typeof localStorage === 'undefined') return
  if (tokens) localStorage.setItem(SUPABASE_AUTH_KEY, JSON.stringify(tokens))
  else localStorage.removeItem(SUPABASE_AUTH_KEY)
}

function apiHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (json) headers['Content-Type'] = 'application/json'
  const supa = getSupabaseAuth()
  if (supa?.accessToken && supa.expiresAt > Date.now()) {
    headers.Authorization = `Bearer ${supa.accessToken}`
  }
  const token = getOrgSessionToken()
  if (token) headers['X-EtherMail-Session'] = token
  return headers
}

const REFRESH_BUFFER_MS = 60_000

/** Refresh Supabase access token when near expiry (best-effort). */
export async function ensureAuthFresh(): Promise<void> {
  if (!hasOrgApi()) return
  const auth = getSupabaseAuth()
  if (!auth?.refreshToken) return
  if (auth.expiresAt > Date.now() + REFRESH_BUFFER_MS) return

  try {
    const res = await fetch(`${API_BASE}/org/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: apiHeaders(true),
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    })
    if (!res.ok) return
    const body = (await res.json()) as {
      accessToken: string
      refreshToken: string
      expiresIn: number
    }
    setSupabaseAuth({
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: Date.now() + body.expiresIn * 1000,
      authUserId: auth.authUserId,
    })
  } catch {
    // Fall back to org session token
  }
}

async function orgApiFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureAuthFresh()
  const json = init?.body !== undefined
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...apiHeaders(json), ...init?.headers },
  })
}

/** Revoke org session on server (best-effort). */
export async function logoutOrgSessionApi(): Promise<void> {
  if (!hasOrgApi()) return
  try {
    await orgApiFetch('/org/auth/logout', { method: 'POST' })
  } catch {
    // best effort
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

/**
 * Fetch org policy from backend. Falls back to local defaults when no API URL is set.
 */
export async function fetchOrgPolicy(localFallback: OrgPolicy): Promise<OrgApiPolicyResponse> {
  if (!hasOrgApi()) {
    return offlinePolicyResponse(localFallback)
  }

  const res = await orgApiFetch('/org/policy', {
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<OrgApiPolicyResponse>
}

/** Push policy changes to backend (admin only). */
export async function pushOrgPolicy(policy: OrgPolicy): Promise<void> {
  if (!hasOrgApi()) return
  const res = await orgApiFetch('/org/policy', {
    method: 'PUT',
    body: JSON.stringify(policy),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function fetchAuditLog(since?: string | null): Promise<OrgApiAuditResponse> {
  if (!hasOrgApi()) return { events: [] }
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  const res = await orgApiFetch(`/org/audit${qs}`, {
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<OrgApiAuditResponse>
}

export async function pushAuditEvents(events: AuditEvent[]): Promise<number> {
  if (!hasOrgApi() || events.length === 0) return 0
  const res = await orgApiFetch('/org/audit', {
    method: 'POST',
    body: JSON.stringify({ events }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { accepted?: number }
  return body.accepted ?? events.length
}

export async function apiInviteMember(member: {
  email: string
  name: string
  role: OrgRole
}): Promise<OrgMember> {
  if (!hasOrgApi()) throw new Error('Org API not configured')
  const res = await orgApiFetch('/org/members', {
    method: 'POST',
    body: JSON.stringify(member),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<OrgMember>
}

export async function apiUpdateMember(
  memberId: string,
  patch: Partial<Pick<OrgMember, 'role' | 'status' | 'name'>>,
): Promise<OrgMember> {
  if (!hasOrgApi()) throw new Error('Org API not configured')
  const res = await orgApiFetch(`/org/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<OrgMember>
}

export async function apiRemoveMember(memberId: string): Promise<void> {
  if (!hasOrgApi()) throw new Error('Org API not configured')
  const res = await orgApiFetch(`/org/members/${memberId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function apiUpdateVaultShares(payload: {
  vaultShares: VaultShare[]
  vaultShared: Record<string, boolean>
}): Promise<void> {
  if (!hasOrgApi()) return
  const res = await orgApiFetch('/org/vault-shares', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function apiUpdateSsoConfig(config: SsoConfig): Promise<SsoConfig> {
  if (!hasOrgApi()) return config
  const res = await orgApiFetch('/org/sso', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<SsoConfig>
}

/** Server-side policy gate — authoritative when org API is connected. */
export async function checkServerGate(
  featureId: FeatureId,
  actionLabel?: string,
): Promise<{ allowed: boolean; message?: string }> {
  if (!hasOrgApi()) return { allowed: true }
  const res = await orgApiFetch('/org/gate/check', {
    method: 'POST',
    body: JSON.stringify({ featureId, actionLabel }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<{ allowed: boolean; message?: string }>
}

/** Exchange SSO authorization code for org session (demo API accepts any code). */
export async function exchangeSsoCode(
  code: string,
  opts?: { email?: string; redirectUri?: string },
): Promise<SsoCallbackResponse> {
  if (!hasOrgApi()) {
    return {
      sessionToken: `local-${Date.now()}`,
      member: {
        id: 'member-demo',
        email: opts?.email ?? 'demo@acme.com',
        name: 'Demo User',
        role: 'member',
        status: 'active',
        joinedAt: new Date().toISOString(),
      },
      role: 'member',
    }
  }
  const res = await orgApiFetch('/org/auth/sso/callback', {
    method: 'POST',
    body: JSON.stringify({ code, email: opts?.email, redirectUri: opts?.redirectUri }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<SsoCallbackResponse>
}

function offlinePolicyResponse(localFallback: OrgPolicy): OrgApiPolicyResponse {
  return {
    organizationId: localFallback.organizationId,
    policy: localFallback,
    members: [],
    vaultShares: [],
    sso: {
      enabled: false,
      provider: 'none',
      tenantId: '',
      clientId: '',
      domain: '',
      enforceSso: false,
    },
    syncedAt: new Date().toISOString(),
  }
}

/** Seed response for offline demo */
export function demoOrgPolicyResponse(): OrgApiPolicyResponse {
  return offlinePolicyResponse(DEFAULT_ORG_POLICY)
}
