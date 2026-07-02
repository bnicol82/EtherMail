import { useMemo } from 'react'
import { useEtherMailStore } from '../store/useStore'
import { getAccessibleVaults, vaultAccessFromStore } from '../lib/vaultAccess'

export function useAccessibleVaults() {
  const vaults = useEtherMailStore((s) => s.vaults)
  const vaultShares = useEtherMailStore((s) => s.vaultShares)
  const userRole = useEtherMailStore((s) => s.userRole)
  const orgPolicy = useEtherMailStore((s) => s.orgPolicy)
  const planTier = useEtherMailStore((s) => s.planTier)
  const orgSession = useEtherMailStore((s) => s.orgSession)

  return useMemo(
    () =>
      getAccessibleVaults(
        vaultAccessFromStore({
          vaults,
          vaultShares,
          userRole,
          orgPolicy,
          planTier,
          orgSession,
        }),
      ),
    [vaults, vaultShares, userRole, orgPolicy, planTier, orgSession],
  )
}
