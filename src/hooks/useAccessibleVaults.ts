import { useMemo } from 'react'
import { useEtherMailStore } from '../store/useStore'
import {
  canWriteVault,
  getAccessibleVaults,
  type VaultAccessContext,
  vaultAccessFromStore,
} from '../lib/vaultAccess'
import { VAULT_PERSONAL_ID } from '../data/seed'

export function useVaultAccessContext(): VaultAccessContext {
  const vaults = useEtherMailStore((s) => s.vaults)
  const vaultShares = useEtherMailStore((s) => s.vaultShares)
  const userRole = useEtherMailStore((s) => s.userRole)
  const orgPolicy = useEtherMailStore((s) => s.orgPolicy)
  const planTier = useEtherMailStore((s) => s.planTier)
  const orgSession = useEtherMailStore((s) => s.orgSession)

  return useMemo(
    () =>
      vaultAccessFromStore({
        vaults,
        vaultShares,
        userRole,
        orgPolicy,
        planTier,
        orgSession,
      }),
    [vaults, vaultShares, userRole, orgPolicy, planTier, orgSession],
  )
}

export function useAccessibleVaults() {
  const ctx = useVaultAccessContext()
  return useMemo(() => getAccessibleVaults(ctx), [ctx])
}

export function useCanWriteVault(vaultId: string | null | undefined) {
  const ctx = useVaultAccessContext()
  return useMemo(
    () => canWriteVault(vaultId ?? VAULT_PERSONAL_ID, ctx),
    [vaultId, ctx],
  )
}
