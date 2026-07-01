import type { OrgPolicy, OrgRole } from '../types/admin'
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

function apiHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (json) headers['Content-Type'] = 'application/json'
  const token = getOrgSessionToken()
  if (token) headers['X-EtherMail-Session'] = token
  return headers
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

  const res = await fetch(`${API_BASE}/org/policy`, {
    credentials: 'include',
    headers: apiHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<OrgApiPolicyResponse>
}

/** Push policy changes to backend (admin only). */
export async function pushOrgPolicy(policy: OrgPolicy): Promise<void> {
  if (!hasOrgApi()) return
  const res = await fetch(`${API_BASE}/org/policy`, {
    method: 'PUT',
    credentials: 'include',
    headers: apiHeaders(true),
    body: JSON.stringify(policy),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function fetchAuditLog(since?: string | null): Promise<OrgApiAuditResponse> {
  if (!hasOrgApi()) return { events: [] }
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  const res = await fetch(`${API_BASE}/org/audit${qs}`, {
    credentials: 'include',
    headers: apiHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<OrgApiAuditResponse>
}

export async function pushAuditEvents(events: AuditEvent[]): Promise<number> {
  if (!hasOrgApi() || events.length === 0) return 0
  const res = await fetch(`${API_BASE}/org/audit`, {
    method: 'POST',
    credentials: 'include',
    headers: apiHeaders(true),
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
  const res = await fetch(`${API_BASE}/org/members`, {
    method: 'POST',
    credentials: 'include',
    headers: apiHeaders(true),
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
  const res = await fetch(`${API_BASE}/org/members/${memberId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: apiHeaders(true),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<OrgMember>
}

export async function apiRemoveMember(memberId: string): Promise<void> {
  if (!hasOrgApi()) throw new Error('Org API not configured')
  const res = await fetch(`${API_BASE}/org/members/${memberId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: apiHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function apiUpdateVaultShares(payload: {
  vaultShares: VaultShare[]
  vaultShared: Record<string, boolean>
}): Promise<void> {
  if (!hasOrgApi()) return
  const res = await fetch(`${API_BASE}/org/vault-shares`, {
    method: 'PUT',
    credentials: 'include',
    headers: apiHeaders(true),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function apiUpdateSsoConfig(config: SsoConfig): Promise<SsoConfig> {
  if (!hasOrgApi()) return config
  const res = await fetch(`${API_BASE}/org/sso`, {
    method: 'PUT',
    credentials: 'include',
    headers: apiHeaders(true),
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<SsoConfig>
}

/** Exchange SSO authorization code for org session (demo API accepts any code). */
export async function exchangeSsoCode(
  code: string,
  opts?: { email?: string },
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
  const res = await fetch(`${API_BASE}/org/auth/sso/callback`, {
    method: 'POST',
    credentials: 'include',
    headers: apiHeaders(true),
    body: JSON.stringify({ code, email: opts?.email }),
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
