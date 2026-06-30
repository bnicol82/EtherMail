import type { EmailAccount } from '../types'
import { VAULT_PERSONAL_ID, VAULT_WORK_ID } from '../data/seed'

/** Resolve which vault an email account belongs to (work vs personal). */
export function accountVaultId(account: EmailAccount): string {
  if (account.defaultVaultId) return account.defaultVaultId
  if (account.id === 'acc-outlook') return VAULT_WORK_ID
  return VAULT_PERSONAL_ID
}

export function repairAccountVaults(accounts: EmailAccount[]): EmailAccount[] {
  return accounts.map((a) => ({
    ...a,
    defaultVaultId: a.id === 'acc-outlook' ? VAULT_WORK_ID : VAULT_PERSONAL_ID,
  }))
}
