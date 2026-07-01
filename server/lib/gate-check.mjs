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

export function checkServerGate({ features, role, featureId, actionLabel }) {
  const allowed = canUseFeatureOnServer(features, role, featureId)
  if (allowed) return { allowed: true }
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
