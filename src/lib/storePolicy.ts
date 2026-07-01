import type { FeatureId, OrgPolicy, OrgRole } from '../types/admin'
import type { AuditCategory, AuditEvent } from '../types/audit'
import type { PlanTier } from './plan'
import { createAuditEvent, trimAuditLog } from './auditLog'
import { checkFeature, logFeatureUsed } from './policyEnforcement'

export type PolicySlice = {
  orgPolicy: OrgPolicy
  userRole: OrgRole
  planTier: PlanTier
  auditLog: AuditEvent[]
}

export function gateOrToast(
  state: PolicySlice,
  featureId: FeatureId,
  actionLabel: string,
): { ok: true } | { ok: false; patch: { policyToast: string; auditLog: AuditEvent[] } } {
  const result = checkFeature(state, featureId, actionLabel)
  if (result.allowed) return { ok: true }
  return {
    ok: false,
    patch: {
      policyToast: result.message ?? 'Action not allowed',
      auditLog: trimAuditLog([...state.auditLog, result.audit!]),
    },
  }
}

export function appendAudit(
  state: PolicySlice,
  category: AuditCategory,
  action: string,
  opts?: { featureId?: FeatureId; detail?: string; actorEmail?: string; metadata?: Record<string, string> },
): AuditEvent[] {
  return trimAuditLog([...state.auditLog, createAuditEvent(category, action, opts)])
}

export function auditAiQuery(state: PolicySlice, mode: string, query: string): AuditEvent[] {
  return trimAuditLog([
    ...state.auditLog,
    logFeatureUsed(mode === 'vault' ? 'vault_ai' : 'external_ai', 'ai_query', {
      mode,
      preview: query.slice(0, 80),
    }),
  ])
}
