import { useEtherMailStore } from '../store/useStore'
import { canUseFeatureFromStore, isFeatureVisibleFromStore } from '../lib/featureGates'
import type { FeatureId } from '../types/admin'

export function useFeatureGate(featureId: FeatureId): boolean {
  return useEtherMailStore((s) => canUseFeatureFromStore(featureId, s))
}

/** Respects enforceLocks — returns false when a denied feature should be hidden. */
export function useFeatureVisible(featureId: FeatureId): boolean {
  return useEtherMailStore((s) => isFeatureVisibleFromStore(featureId, s))
}

export function useFeatureGateContext() {
  return useEtherMailStore((s) => ({
    orgPolicy: s.orgPolicy,
    userRole: s.userRole,
    planTier: s.planTier,
  }))
}
