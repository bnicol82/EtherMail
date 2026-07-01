import { useEtherMailStore } from '../store/useStore'
import { canUseFeatureFromStore } from '../lib/featureGates'
import type { FeatureId } from '../types/admin'

export function useFeatureGate(featureId: FeatureId): boolean {
  return useEtherMailStore((s) => canUseFeatureFromStore(featureId, s))
}

export function useFeatureGateContext() {
  return useEtherMailStore((s) => ({
    orgPolicy: s.orgPolicy,
    userRole: s.userRole,
    planTier: s.planTier,
  }))
}
