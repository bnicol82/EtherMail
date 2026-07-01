import { hasOrgApi } from './orgApi'
import type { OrgRole } from '../types/admin'
import type { OrgSession, SsoConfig } from '../types/orgApi'

export function isOrgAdmin(role: OrgRole): boolean {
  return role === 'admin' || role === 'owner'
}

/** Members must complete SSO when enforceSso is enabled and org API is connected. */
export function requiresOrgLogin(state: {
  ssoConfig: SsoConfig
  orgSession: OrgSession | null
  userRole: OrgRole
}): boolean {
  if (!hasOrgApi()) return false
  if (!state.ssoConfig.enabled || !state.ssoConfig.enforceSso) return false
  if (state.orgSession) return false
  if (isOrgAdmin(state.userRole)) return false
  return true
}
