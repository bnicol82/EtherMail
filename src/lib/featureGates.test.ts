import { describe, expect, it } from 'vitest'
import { canUseFeature, getEffectiveLimits, isFeatureVisible } from './featureGates'
import type { FeaturePolicy, OrgPolicy } from '../types/admin'

function policy(overrides: Partial<Omit<OrgPolicy, 'features'>> & { features?: Partial<FeaturePolicy> } = {}): OrgPolicy {
  return {
    organizationId: 'org-1',
    organizationName: 'Acme',
    enforceLocks: true,
    ...overrides,
    features: (overrides.features ?? {}) as FeaturePolicy,
  }
}

describe('canUseFeature', () => {
  it('admins and owners always pass, regardless of policy', () => {
    const ctx = { orgPolicy: policy({ features: { compose_email: false } }), userRole: 'admin' as const, planTier: 'free' as const }
    expect(canUseFeature('compose_email', ctx)).toBe(true)
    expect(canUseFeature('compose_email', { ...ctx, userRole: 'owner' })).toBe(true)
  })

  it('members default-allow when a feature is not explicitly denied', () => {
    const ctx = { orgPolicy: policy(), userRole: 'member' as const, planTier: 'free' as const }
    expect(canUseFeature('compose_email', ctx)).toBe(true)
  })

  it('members are denied when the policy explicitly sets false', () => {
    const ctx = { orgPolicy: policy({ features: { ai_bridge: false } }), userRole: 'member' as const, planTier: 'free' as const }
    expect(canUseFeature('ai_bridge', ctx)).toBe(false)
  })

  it('members pass when the policy explicitly sets true', () => {
    const ctx = { orgPolicy: policy({ features: { ai_bridge: true } }), userRole: 'member' as const, planTier: 'free' as const }
    expect(canUseFeature('ai_bridge', ctx)).toBe(true)
  })
})

describe('isFeatureVisible', () => {
  it('admins always see the control', () => {
    const ctx = { orgPolicy: policy({ features: { note_export: false }, enforceLocks: true }), userRole: 'admin' as const, planTier: 'free' as const }
    expect(isFeatureVisible('note_export', ctx)).toBe(true)
  })

  it('members see allowed features', () => {
    const ctx = { orgPolicy: policy(), userRole: 'member' as const, planTier: 'free' as const }
    expect(isFeatureVisible('note_export', ctx)).toBe(true)
  })

  it('members lose visibility of a denied feature when enforceLocks is on', () => {
    const ctx = { orgPolicy: policy({ features: { note_export: false }, enforceLocks: true }), userRole: 'member' as const, planTier: 'free' as const }
    expect(isFeatureVisible('note_export', ctx)).toBe(false)
  })

  it('members still see a denied feature (e.g. greyed out) when enforceLocks is off', () => {
    const ctx = { orgPolicy: policy({ features: { note_export: false }, enforceLocks: false }), userRole: 'member' as const, planTier: 'free' as const }
    expect(isFeatureVisible('note_export', ctx)).toBe(true)
  })
})

describe('getEffectiveLimits', () => {
  it('merges org quota overrides on top of the plan tier base limits', () => {
    const ctx = {
      orgPolicy: policy({ quotaOverrides: { maxMailboxes: 10 } }),
      userRole: 'member' as const,
      planTier: 'free' as const,
    }
    const limits = getEffectiveLimits(ctx)
    expect(limits.maxMailboxes).toBe(10)
  })

  it('falls back to the plan tier base limit when there is no override', () => {
    const ctx = { orgPolicy: policy(), userRole: 'member' as const, planTier: 'free' as const }
    const limits = getEffectiveLimits(ctx)
    expect(limits.maxMailboxes).toBeGreaterThan(0)
  })
})
