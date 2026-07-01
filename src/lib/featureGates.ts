import type { FeatureDefinition, FeatureId, OrgPolicy, OrgRole } from '../types/admin'
import { FEATURE_CATALOG } from '../types/admin'
import type { PlanTier } from './plan'
import { planLimits } from './plan'

export interface FeatureGateContext {
  orgPolicy: OrgPolicy
  userRole: OrgRole
  planTier: PlanTier
}

const FEATURE_MAP = new Map<FeatureId, FeatureDefinition>(
  FEATURE_CATALOG.map((f) => [f.id, f]),
)

/** Org admins and owners bypass feature denials when managing the org (not for members) */
function isOrgAdmin(role: OrgRole): boolean {
  return role === 'admin' || role === 'owner'
}

/**
 * Returns whether a feature is allowed for the current user.
 * Members respect org policy; admins always pass (for preview/testing).
 */
export function canUseFeature(featureId: FeatureId, ctx: FeatureGateContext): boolean {
  if (isOrgAdmin(ctx.userRole)) return true
  return ctx.orgPolicy.features[featureId] ?? true
}

export function getFeatureDenialReason(featureId: FeatureId): string {
  const def = FEATURE_MAP.get(featureId)
  const label = def?.label ?? featureId
  return `Your organization has disabled ${label}. Contact your admin.`
}

export function getDeniedFeatures(ctx: FeatureGateContext): FeatureDefinition[] {
  if (isOrgAdmin(ctx.userRole)) return []
  return FEATURE_CATALOG.filter((f) => !canUseFeature(f.id, ctx))
}

export function getEffectiveLimits(ctx: FeatureGateContext) {
  const base = planLimits(ctx.planTier)
  const overrides = ctx.orgPolicy.quotaOverrides ?? {}
  return {
    ...base,
    ...overrides,
    maxMailboxes: overrides.maxMailboxes ?? base.maxMailboxes,
    maxVaults: overrides.maxVaults ?? base.maxVaults,
    aiQueriesPerMonth: overrides.aiQueriesPerMonth ?? base.aiQueriesPerMonth,
    vaultStorageMb: overrides.vaultStorageMb ?? base.vaultStorageMb,
  }
}

/** Hook-friendly selector inputs from store slices */
export function featureGateFromStore(state: {
  orgPolicy: OrgPolicy
  userRole: OrgRole
  planTier: PlanTier
}): FeatureGateContext {
  return {
    orgPolicy: state.orgPolicy,
    userRole: state.userRole,
    planTier: state.planTier,
  }
}

export function canUseFeatureFromStore(
  featureId: FeatureId,
  state: { orgPolicy: OrgPolicy; userRole: OrgRole; planTier: PlanTier },
): boolean {
  return canUseFeature(featureId, featureGateFromStore(state))
}

/**
 * When enforceLocks is on, denied features are hidden from members.
 * Admins always see controls for configuration.
 */
export function isFeatureVisible(featureId: FeatureId, ctx: FeatureGateContext): boolean {
  if (isOrgAdmin(ctx.userRole)) return true
  if (canUseFeature(featureId, ctx)) return true
  return !ctx.orgPolicy.enforceLocks
}

export function isFeatureVisibleFromStore(
  featureId: FeatureId,
  state: { orgPolicy: OrgPolicy; userRole: OrgRole; planTier: PlanTier },
): boolean {
  return isFeatureVisible(featureId, featureGateFromStore(state))
}
