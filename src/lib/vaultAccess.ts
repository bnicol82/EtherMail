import type { OrgPolicy, OrgRole } from '../types/admin'
import type { VaultShare } from '../types/orgApi'
import type { Vault } from '../types'
import { canUseFeature, featureGateFromStore } from './featureGates'
import type { PlanTier } from './plan'

export interface VaultAccessContext {
  vaults: Vault[]
  vaultShares: VaultShare[]
  userRole: OrgRole
  orgPolicy: OrgPolicy
  planTier: PlanTier
  memberId?: string | null
}

/** Vaults visible to the current user based on role, policy, and share membership. */
export function getAccessibleVaults(ctx: VaultAccessContext): Vault[] {
  if (ctx.userRole === 'admin' || ctx.userRole === 'owner') return ctx.vaults

  const gate = featureGateFromStore(ctx)
  const sharedFeatureAllowed = canUseFeature('shared_vaults', gate)

  return ctx.vaults.filter((vault) => canAccessVault(vault, ctx, sharedFeatureAllowed))
}

export function canAccessVault(
  vault: Vault,
  ctx: VaultAccessContext,
  sharedFeatureAllowed = canUseFeature('shared_vaults', featureGateFromStore(ctx)),
): boolean {
  if (ctx.userRole === 'admin' || ctx.userRole === 'owner') return true
  if (vault.kind === 'personal') return true
  if (!vault.shared) return true
  if (!sharedFeatureAllowed) return false
  if (!ctx.memberId) return false
  const share = ctx.vaultShares.find((s) => s.vaultId === vault.id)
  if (!share) return false
  return share.memberIds.includes(ctx.memberId)
}

export function vaultAccessFromStore(state: {
  vaults: Vault[]
  vaultShares: VaultShare[]
  userRole: OrgRole
  orgPolicy: OrgPolicy
  planTier: PlanTier
  orgSession: { memberId: string } | null
}): VaultAccessContext {
  return {
    vaults: state.vaults,
    vaultShares: state.vaultShares,
    userRole: state.userRole,
    orgPolicy: state.orgPolicy,
    planTier: state.planTier,
    memberId: state.orgSession?.memberId ?? null,
  }
}
