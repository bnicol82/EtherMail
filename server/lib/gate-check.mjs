import { checkAiQuota, currentUsagePeriod, isAiFeature, checkMailboxQuota } from './quota-check.mjs'

/** Server-side feature gate — mirrors client featureGates.ts */
export function canUseFeatureOnServer(features, role, featureId) {
  if (role === 'admin' || role === 'owner') return true
  if (!features || typeof features !== 'object') return true
  return features[featureId] !== false
}

export function gateDenialMessage(featureId) {
  const label = featureId.replace(/_/g, ' ')
  return `Your organization has disabled ${label}. Contact your admin.`
}

export function checkServerGate({
  features,
  role,
  featureId,
  actionLabel,
  planTier,
  quotaOverrides,
  aiUsageCount,
  metadata,
}) {
  const allowed = canUseFeatureOnServer(features, role, featureId)
  if (!allowed) {
    return {
      allowed: false,
      message: gateDenialMessage(featureId),
      audit: {
        category: 'policy',
        action: 'feature_denied_server',
        featureId,
        detail: actionLabel ?? featureId,
      },
    }
  }

  if (featureId === 'vault_ai' || featureId === 'external_ai') {
    const quota = checkAiQuota({
      planTier: planTier ?? 'enterprise',
      quotaOverrides: quotaOverrides ?? {},
      usageCount: aiUsageCount ?? 0,
    })
    if (!quota.allowed) {
      return {
        allowed: false,
        message: quota.message,
        audit: {
          category: 'policy',
          action: 'quota_denied_server',
          featureId,
          detail: actionLabel ?? 'AI query',
        },
        incrementAi: false,
      }
    }
    return { allowed: true, incrementAi: true }
  }

  if (featureId === 'connect_mailbox') {
    const connected = metadata?.connectedMailboxes
    if (typeof connected === 'number') {
      const quota = checkMailboxQuota({
        planTier: planTier ?? 'enterprise',
        quotaOverrides: quotaOverrides ?? {},
        connectedMailboxes: connected,
      })
      if (!quota.allowed) {
        return {
          allowed: false,
          message: quota.message,
          audit: {
            category: 'policy',
            action: 'quota_denied_server',
            featureId,
            detail: actionLabel ?? 'Connect mailbox',
          },
          incrementAi: false,
        }
      }
    }
  }

  return { allowed: true, incrementAi: false }
}
