import type { FeatureId, OrgPolicy, OrgRole } from '../types/admin'
import type { PlanTier } from './plan'
import { canUseFeature, featureGateFromStore, getFeatureDenialReason } from './featureGates'
import { createAuditEvent } from './auditLog'
import type { AuditEvent } from '../types/audit'

export interface PolicyCheckState {
  orgPolicy: OrgPolicy
  userRole: OrgRole
  planTier: PlanTier
}

export interface EnforceResult {
  allowed: boolean
  message?: string
  audit?: AuditEvent
}

/** Check feature access; returns denial message + audit event when blocked */
export function checkFeature(
  state: PolicyCheckState,
  featureId: FeatureId,
  actionLabel?: string,
): EnforceResult {
  if (canUseFeature(featureId, featureGateFromStore(state))) {
    return { allowed: true }
  }
  const message = getFeatureDenialReason(featureId)
  return {
    allowed: false,
    message,
    audit: createAuditEvent('policy', 'feature_denied', {
      featureId,
      detail: actionLabel ?? featureId,
    }),
  }
}

export function logFeatureUsed(
  featureId: FeatureId,
  actionLabel: string,
  metadata?: Record<string, string>,
): AuditEvent {
  return createAuditEvent('policy', 'feature_used', {
    featureId,
    detail: actionLabel,
    metadata,
  })
}
