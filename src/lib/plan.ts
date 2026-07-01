export type PlanTier = 'free' | 'pro' | 'team'

export interface PlanLimits {
  maxMailboxes: number
  maxVaults: number
  aiQueriesPerMonth: number
  backgroundSync: boolean
  vaultStorageMb: number
  sharedVaults: boolean
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxMailboxes: 2,
    maxVaults: 2,
    aiQueriesPerMonth: 100,
    backgroundSync: false,
    vaultStorageMb: 100,
    sharedVaults: false,
  },
  pro: {
    maxMailboxes: Number.POSITIVE_INFINITY,
    maxVaults: Number.POSITIVE_INFINITY,
    aiQueriesPerMonth: Number.POSITIVE_INFINITY,
    backgroundSync: true,
    vaultStorageMb: 10_240,
    sharedVaults: false,
  },
  team: {
    maxMailboxes: Number.POSITIVE_INFINITY,
    maxVaults: Number.POSITIVE_INFINITY,
    aiQueriesPerMonth: Number.POSITIVE_INFINITY,
    backgroundSync: true,
    vaultStorageMb: 51_200,
    sharedVaults: true,
  },
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
}

export function planLimits(tier: PlanTier = 'free'): PlanLimits {
  return PLAN_LIMITS[tier]
}

export function canConnectMailbox(connectedCount: number, tier: PlanTier = 'free'): boolean {
  return connectedCount < planLimits(tier).maxMailboxes
}

export function canCreateVault(vaultCount: number, tier: PlanTier = 'free'): boolean {
  return vaultCount < planLimits(tier).maxVaults
}

export function canUseBackgroundSync(tier: PlanTier = 'free'): boolean {
  return planLimits(tier).backgroundSync
}
