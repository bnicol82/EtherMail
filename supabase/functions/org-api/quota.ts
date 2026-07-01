const PLAN_AI_LIMITS: Record<string, number> = {
  free: 100,
  pro: Number.POSITIVE_INFINITY,
  team: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
}

export function currentUsagePeriod() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function isAiFeature(featureId: string) {
  return featureId === 'vault_ai' || featureId === 'external_ai'
}

export function effectiveAiQueryLimit(
  planTier: string,
  quotaOverrides: Record<string, unknown> | null | undefined,
) {
  const base = PLAN_AI_LIMITS[planTier] ?? PLAN_AI_LIMITS.free
  const override = quotaOverrides?.aiQueriesPerMonth
  if (typeof override === 'number') return override
  return base
}

export function checkAiQuota({
  planTier,
  quotaOverrides,
  usageCount,
}: {
  planTier: string
  quotaOverrides: Record<string, unknown> | null | undefined
  usageCount: number
}) {
  const limit = effectiveAiQueryLimit(planTier, quotaOverrides)
  if (!Number.isFinite(limit)) return { allowed: true as const }
  if (usageCount >= limit) {
    return {
      allowed: false as const,
      message: `Monthly AI query limit (${limit}) reached. Contact your administrator.`,
    }
  }
  return { allowed: true as const }
}
