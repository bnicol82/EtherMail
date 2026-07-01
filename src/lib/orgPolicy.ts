import type { FeatureId, FeaturePolicy, OrgPolicy } from '../types/admin'
import { FEATURE_CATALOG } from '../types/admin'

const ALL_FEATURE_IDS = FEATURE_CATALOG.map((f) => f.id) as FeatureId[]

/** Build a policy map with every feature set to the same value */
export function buildFeaturePolicy(allowed: boolean): FeaturePolicy {
  return Object.fromEntries(ALL_FEATURE_IDS.map((id) => [id, allowed])) as FeaturePolicy
}

export const DEFAULT_ORG_POLICY: OrgPolicy = {
  organizationId: 'org-demo',
  organizationName: 'Demo Organization',
  features: buildFeaturePolicy(true),
  enforceLocks: true,
}

/** Conservative defaults for regulated enterprises — deny high-risk features */
export const ENTERPRISE_STRICT_POLICY: Partial<FeaturePolicy> = {
  external_ai: false,
  ai_bridge: false,
  oauth_byo_client: false,
  note_export: false,
  note_share: false,
  voice_chat: false,
  voice_input: false,
  gmail_live_sync: false,
  shared_vaults: false,
}

export function mergeOrgPolicy(base: OrgPolicy, patch: Partial<OrgPolicy>): OrgPolicy {
  return {
    ...base,
    ...patch,
    features: {
      ...base.features,
      ...patch.features,
    },
    quotaOverrides: patch.quotaOverrides
      ? { ...base.quotaOverrides, ...patch.quotaOverrides }
      : base.quotaOverrides,
  }
}

export function setOrgFeatureAllowed(
  policy: OrgPolicy,
  featureId: FeatureId,
  allowed: boolean,
): OrgPolicy {
  return {
    ...policy,
    features: { ...policy.features, [featureId]: allowed },
  }
}

export function applyStrictEnterpriseDefaults(policy: OrgPolicy): OrgPolicy {
  return mergeOrgPolicy(policy, {
    features: { ...policy.features, ...ENTERPRISE_STRICT_POLICY },
  })
}

export function countDeniedFeatures(policy: OrgPolicy): number {
  return ALL_FEATURE_IDS.filter((id) => !policy.features[id]).length
}
