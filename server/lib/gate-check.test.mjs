import { describe, expect, it } from 'vitest'
import { canUseFeatureOnServer, checkServerGate, gateDenialMessage } from './gate-check.mjs'

describe('canUseFeatureOnServer', () => {
  it('admins and owners always pass', () => {
    expect(canUseFeatureOnServer({ compose_email: false }, 'admin', 'compose_email')).toBe(true)
    expect(canUseFeatureOnServer({ compose_email: false }, 'owner', 'compose_email')).toBe(true)
  })

  it('members default-allow when features is missing or not an object', () => {
    expect(canUseFeatureOnServer(undefined, 'member', 'compose_email')).toBe(true)
    expect(canUseFeatureOnServer(null, 'member', 'compose_email')).toBe(true)
  })

  it('members default-allow when the feature is not explicitly denied', () => {
    expect(canUseFeatureOnServer({}, 'member', 'compose_email')).toBe(true)
  })

  it('members are denied only when the feature is explicitly false', () => {
    expect(canUseFeatureOnServer({ ai_bridge: false }, 'member', 'ai_bridge')).toBe(false)
    expect(canUseFeatureOnServer({ ai_bridge: true }, 'member', 'ai_bridge')).toBe(true)
  })
})

describe('checkServerGate', () => {
  it('returns allowed: true with no message when the feature is usable', () => {
    const result = checkServerGate({ features: {}, role: 'member', featureId: 'compose_email' })
    expect(result).toEqual({ allowed: true })
  })

  it('returns allowed: false with a denial message and audit payload when blocked', () => {
    const result = checkServerGate({
      features: { ai_bridge: false },
      role: 'member',
      featureId: 'ai_bridge',
      actionLabel: 'AI Bridge',
    })
    expect(result.allowed).toBe(false)
    expect(result.message).toBe(gateDenialMessage('ai_bridge'))
    expect(result.audit).toMatchObject({
      category: 'policy',
      action: 'feature_denied_server',
      featureId: 'ai_bridge',
      detail: 'AI Bridge',
    })
  })
})

describe('gateDenialMessage', () => {
  it('turns snake_case feature ids into a readable label', () => {
    expect(gateDenialMessage('ai_bridge')).toBe('Your organization has disabled ai bridge. Contact your admin.')
  })
})
