import type { OrgPolicy } from '../types/admin'
import type { OrgApiPolicyResponse } from '../types/orgApi'
import { DEFAULT_ORG_POLICY } from './orgPolicy'

const API_BASE = import.meta.env.VITE_ORG_API_URL ?? ''

/** True when a remote org policy API is configured */
export function hasOrgApi(): boolean {
  return Boolean(API_BASE)
}

/**
 * Fetch org policy from backend. Falls back to local defaults when no API URL is set.
 * Production: GET /api/org/policy with SSO bearer token.
 */
export async function fetchOrgPolicy(localFallback: OrgPolicy): Promise<OrgApiPolicyResponse> {
  if (!hasOrgApi()) {
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

  const res = await fetch(`${API_BASE}/org/policy`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Policy sync failed (${res.status})`)
  return res.json() as Promise<OrgApiPolicyResponse>
}

/**
 * Push policy changes to backend (admin only).
 * Demo: no-op when API URL unset.
 */
export async function pushOrgPolicy(policy: OrgPolicy): Promise<void> {
  if (!hasOrgApi()) return
  const res = await fetch(`${API_BASE}/org/policy`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(policy),
  })
  if (!res.ok) throw new Error(`Policy push failed (${res.status})`)
}

/** Seed response for offline demo */
export function demoOrgPolicyResponse(): OrgApiPolicyResponse {
  return {
    organizationId: DEFAULT_ORG_POLICY.organizationId,
    policy: DEFAULT_ORG_POLICY,
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
