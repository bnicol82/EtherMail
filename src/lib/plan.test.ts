import { describe, expect, it } from 'vitest'
import { canConnectMailbox, canCreateVault, canUseBackgroundSync, planLimits } from './plan'

describe('planLimits', () => {
  it('defaults to the free tier when no tier is given', () => {
    expect(planLimits()).toEqual(planLimits('free'))
  })

  it('gives paid tiers unlimited mailboxes/vaults/AI queries', () => {
    for (const tier of ['pro', 'team', 'enterprise'] as const) {
      const limits = planLimits(tier)
      expect(limits.maxMailboxes).toBe(Number.POSITIVE_INFINITY)
      expect(limits.maxVaults).toBe(Number.POSITIVE_INFINITY)
      expect(limits.aiQueriesPerMonth).toBe(Number.POSITIVE_INFINITY)
    }
  })
})

describe('canConnectMailbox', () => {
  it('allows connecting under the free-tier limit', () => {
    expect(canConnectMailbox(0, 'free')).toBe(true)
    expect(canConnectMailbox(1, 'free')).toBe(true)
  })

  it('blocks connecting at or above the free-tier limit', () => {
    expect(canConnectMailbox(2, 'free')).toBe(false)
    expect(canConnectMailbox(5, 'free')).toBe(false)
  })

  it('never blocks on unlimited tiers', () => {
    expect(canConnectMailbox(1000, 'enterprise')).toBe(true)
  })
})

describe('canCreateVault', () => {
  it('blocks at or above the free-tier vault limit', () => {
    expect(canCreateVault(1, 'free')).toBe(true)
    expect(canCreateVault(2, 'free')).toBe(false)
  })
})

describe('canUseBackgroundSync', () => {
  it('is false on free, true on paid tiers', () => {
    expect(canUseBackgroundSync('free')).toBe(false)
    expect(canUseBackgroundSync('pro')).toBe(true)
    expect(canUseBackgroundSync('team')).toBe(true)
    expect(canUseBackgroundSync('enterprise')).toBe(true)
  })
})
