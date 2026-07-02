import type { OrgPolicy, OrgRole } from '../types/admin'
import type { VaultShare, VaultSharePermission } from '../types/orgApi'
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

export function getVaultSharePermission(
  vaultId: string,
  ctx: VaultAccessContext,
): VaultSharePermission | null {
  const vault = ctx.vaults.find((v) => v.id === vaultId)
  if (!vault?.shared) return 'admin'
  const share = ctx.vaultShares.find((s) => s.vaultId === vaultId)
  return share?.permission ?? null
}

/** Whether the user may edit notes/files in a vault. */
export function canWriteVault(vaultId: string, ctx: VaultAccessContext): boolean {
  const vault = ctx.vaults.find((v) => v.id === vaultId)
  if (!vault) return false
  if (ctx.userRole === 'admin' || ctx.userRole === 'owner') return true
  if (!canAccessVault(vault, ctx)) return false
  if (vault.kind === 'personal' || !vault.shared) return true
  const permission = getVaultSharePermission(vaultId, ctx)
  return permission === 'write' || permission === 'admin'
}

export function filterNotesByVaultAccess<T extends { vaultId?: string }>(
  notes: T[],
  ctx: VaultAccessContext,
): T[] {
  const allowed = new Set(getAccessibleVaults(ctx).map((v) => v.id))
  return notes.filter((note) => allowed.has(note.vaultId ?? 'vault-personal'))
}

export function vaultAccessDeniedMessage(vaultName: string, write = false) {
  return write
    ? `You have read-only access to ${vaultName}.`
    : `You do not have access to ${vaultName}.`
}

/** Returns denial info when a vault mutation should be blocked. */
export function denyVaultWrite(
  vaultId: string | undefined | null,
  ctx: VaultAccessContext,
): { message: string; detail: string } | null {
  const id = vaultId ?? 'vault-personal'
  if (canWriteVault(id, ctx)) return null
  const vault = ctx.vaults.find((v) => v.id === id)
  return {
    message: vaultAccessDeniedMessage(vault?.name ?? 'this vault', true),
    detail: vault?.name ?? id,
  }
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
