const PLAN_AI_LIMITS = {
  free: 100,
  pro: Number.POSITIVE_INFINITY,
  team: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
}

export function currentUsagePeriod() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function isAiFeature(featureId) {
  return featureId === 'vault_ai' || featureId === 'external_ai'
}

export function effectiveAiQueryLimit(planTier, quotaOverrides = {}) {
  const base = PLAN_AI_LIMITS[planTier] ?? PLAN_AI_LIMITS.free
  const override = quotaOverrides.aiQueriesPerMonth
  if (override !== undefined && override !== null) return override
  return base
}

export function getAiUsageCount(store) {
  const period = currentUsagePeriod()
  if (!store.usage || store.usage.period !== period) return 0
  return store.usage.aiQueries ?? 0
}

export function incrementAiUsage(store) {
  const period = currentUsagePeriod()
  if (!store.usage || store.usage.period !== period) {
    store.usage = { period, aiQueries: 0 }
  }
  store.usage.aiQueries += 1
  return store.usage.aiQueries
}

const PLAN_MAILBOX_LIMITS = {
  free: 2,
  pro: Number.POSITIVE_INFINITY,
  team: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
}

export function effectiveMailboxLimit(planTier, quotaOverrides = {}) {
  const base = PLAN_MAILBOX_LIMITS[planTier] ?? PLAN_MAILBOX_LIMITS.free
  const override = quotaOverrides.maxMailboxes
  if (override !== undefined && override !== null) return override
  return base
}

export function checkMailboxQuota({ planTier, quotaOverrides, connectedMailboxes }) {
  const limit = effectiveMailboxLimit(planTier, quotaOverrides)
  if (!Number.isFinite(limit)) return { allowed: true }
  if (connectedMailboxes >= limit) {
    return {
      allowed: false,
      message: `Mailbox limit (${limit}) reached. Contact your administrator.`,
    }
  }
  return { allowed: true }
}

export function usageSummary(store, planTier) {
  const quotaOverrides = store.policy?.quotaOverrides ?? {}
  const aiUsed = getAiUsageCount(store)
  const aiLimit = effectiveAiQueryLimit(planTier, quotaOverrides)
  const mailboxLimit = effectiveMailboxLimit(planTier, quotaOverrides)
  const connectedMailboxes = store.connectedMailboxes ?? 0
  return {
    period: currentUsagePeriod(),
    aiQueries: {
      used: aiUsed,
      limit: Number.isFinite(aiLimit) ? aiLimit : null,
    },
    mailboxes: {
      used: connectedMailboxes,
      limit: Number.isFinite(mailboxLimit) ? mailboxLimit : null,
    },
  }
}

export function checkAiQuota({ planTier, quotaOverrides, usageCount }) {
  const limit = effectiveAiQueryLimit(planTier, quotaOverrides)
  if (!Number.isFinite(limit)) return { allowed: true }
  if (usageCount >= limit) {
    return {
      allowed: false,
      message: `Monthly AI query limit (${limit}) reached. Contact your administrator.`,
    }
  }
  return { allowed: true }
}
