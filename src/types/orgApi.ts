import type { OrgPolicy, OrgRole } from './admin'
import type { AuditEvent } from './audit'

/** SSO provider configuration — synced from admin panel / IdP */
export interface SsoConfig {
  enabled: boolean
  provider: 'entra' | 'okta' | 'google_workspace' | 'none'
  tenantId: string
  clientId: string
  domain: string
  /** When true, password/local login is disabled for members */
  enforceSso: boolean
}

export interface OrgMember {
  id: string
  email: string
  name: string
  role: OrgRole
  status: 'active' | 'invited'
  invitedAt?: string
  joinedAt?: string
}

export type VaultSharePermission = 'read' | 'write' | 'admin'

export interface VaultShare {
  vaultId: string
  memberIds: string[]
  permission: VaultSharePermission
}

export interface OrgApiPolicyResponse {
  organizationId: string
  policy: OrgPolicy
  members: OrgMember[]
  vaultShares: VaultShare[]
  sso: SsoConfig
  syncedAt: string
  planTier?: string
  vaultShared?: Record<string, boolean>
}

export interface OrgApiAuditResponse {
  events: AuditEvent[]
  cursor?: string
}

export interface OrgSession {
  sessionToken: string
  memberId: string
  email: string
  role: OrgRole
  authUserId?: string
}

export interface SupabaseAuthSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  authUserId?: string
}

export interface SsoCallbackResponse {
  sessionToken: string
  member: OrgMember
  role: OrgRole
  supabaseAuth?: SupabaseAuthSession | null
}

export interface OrgSessionResponse {
  member: OrgMember
  role: OrgRole
  email: string
}
