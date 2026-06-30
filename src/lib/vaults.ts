import { SEED_EMAILS } from '../data/seed'
import { VAULT_PERSONAL_ID, VAULT_WORK_ID } from '../data/seed'
import type { Email, EmailAccount } from '../types'

const DEMO_CONNECTED_IDS = new Set(['acc-outlook', 'acc-gmail'])

/** Resolve which vault an email account belongs to (work vs personal). */
export function accountVaultId(account: EmailAccount): string {
  if (account.defaultVaultId) return account.defaultVaultId
  if (account.id === 'acc-outlook') return VAULT_WORK_ID
  return VAULT_PERSONAL_ID
}

/** Ensure demo Gmail/Outlook accounts stay connected with correct vault mapping. */
export function repairDemoAccounts(accounts: EmailAccount[]): EmailAccount[] {
  return accounts.map((a) => {
    if (!DEMO_CONNECTED_IDS.has(a.id)) return repairAccountVaults([a])[0]
    return {
      ...a,
      connected: true,
      connectedAt: a.connectedAt ?? '2026-06-01T00:00:00Z',
      syncMode: a.syncMode ?? 'demo',
      defaultVaultId: a.id === 'acc-outlook' ? VAULT_WORK_ID : VAULT_PERSONAL_ID,
    }
  })
}

export function repairAccountVaults(accounts: EmailAccount[]): EmailAccount[] {
  return accounts.map((a) => ({
    ...a,
    defaultVaultId: a.id === 'acc-outlook' ? VAULT_WORK_ID : VAULT_PERSONAL_ID,
  }))
}

/** Re-add seed emails for connected accounts that were removed (e.g. after disconnect). */
export function mergeMissingSeedEmails(emails: Email[], accounts: EmailAccount[]): Email[] {
  const connectedIds = new Set(accounts.filter((a) => a.connected).map((a) => a.id))
  const existingIds = new Set(emails.map((e) => e.id))
  const missing = SEED_EMAILS.filter((e) => connectedIds.has(e.accountId) && !existingIds.has(e.id))
  return missing.length > 0 ? [...emails, ...missing] : emails
}

export function repairDemoMailbox(accounts: EmailAccount[], emails: Email[]): {
  accounts: EmailAccount[]
  emails: Email[]
} {
  const repairedAccounts = repairDemoAccounts(accounts)
  const repairedEmails = mergeMissingSeedEmails(emails, repairedAccounts)
  return { accounts: repairedAccounts, emails: repairedEmails }
}
