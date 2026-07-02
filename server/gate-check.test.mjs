import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { checkServerGate } from './lib/gate-check.mjs'

describe('gate-check', () => {
  test('admins bypass feature denials', () => {
    const result = checkServerGate({
      features: { compose_email: false },
      role: 'admin',
      featureId: 'compose_email',
      planTier: 'enterprise',
      quotaOverrides: {},
      aiUsageCount: 0,
      metadata: {},
    })
    assert.equal(result.allowed, true)
  })

  test('members respect disabled features', () => {
    const result = checkServerGate({
      features: { compose_email: false },
      role: 'member',
      featureId: 'compose_email',
      actionLabel: 'Send email',
      planTier: 'enterprise',
      quotaOverrides: {},
      aiUsageCount: 0,
      metadata: {},
    })
    assert.equal(result.allowed, false)
    assert.match(result.message, /compose email/i)
  })

  test('AI quota increments when allowed', () => {
    const result = checkServerGate({
      features: {},
      role: 'member',
      featureId: 'vault_ai',
      planTier: 'enterprise',
      quotaOverrides: { aiQueriesPerMonth: 100 },
      aiUsageCount: 5,
      metadata: {},
    })
    assert.equal(result.allowed, true)
    assert.equal(result.incrementAi, true)
  })

  test('mailbox connect quota blocks over limit', () => {
    const result = checkServerGate({
      features: {},
      role: 'member',
      featureId: 'connect_mailbox',
      planTier: 'free',
      quotaOverrides: {},
      aiUsageCount: 0,
      metadata: { connectedMailboxes: 2 },
    })
    assert.equal(result.allowed, false)
    assert.match(result.message, /mailbox/i)
  })
})
