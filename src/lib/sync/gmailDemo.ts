import { SEED_EMAILS } from '../../data/seed'
import type { Email } from '../../types'

const GMAIL_ACCOUNT_ID = 'acc-gmail'

/** Hours offset from now for each demo message (newest first). */
const DEMO_TIME_OFFSETS_HOURS = [2, 5, 8, 26, 30, 50, 72, 96, 120, 140]

function isoHoursAgo(hours: number): string {
  const d = new Date()
  d.setTime(d.getTime() - hours * 60 * 60 * 1000)
  return d.toISOString()
}

/**
 * Personal Gmail demo inbox — mirrors live sync shape (`gmail-*` ids) with fresh dates.
 * Sourced from seed templates so demo connect replaces stale personal mail.
 */
export function buildGmailDemoEmails(): Email[] {
  const templates = SEED_EMAILS.filter((e) => e.accountId === GMAIL_ACCOUNT_ID)
  return templates.map((email, index) => {
    const hoursAgo = DEMO_TIME_OFFSETS_HOURS[index] ?? 24 + index * 12
    return {
      ...email,
      id: `gmail-demo-${email.id}`,
      date: isoHoursAgo(hoursAgo),
      read: hoursAgo > 24,
    }
  })
}

export interface GmailDemoSyncResult {
  emails: Email[]
  imported: number
  inbox: number
  sent: number
}

export function syncGmailDemoInbox(accountId: string): GmailDemoSyncResult {
  if (accountId !== GMAIL_ACCOUNT_ID) {
    return { emails: [], imported: 0, inbox: 0, sent: 0 }
  }

  const emails = buildGmailDemoEmails()
  const inbox = emails.filter((e) => (e.folder ?? 'inbox') === 'inbox').length
  const sent = emails.filter((e) => e.folder === 'sent').length

  return {
    emails,
    imported: emails.length,
    inbox,
    sent,
  }
}

export function isGmailDemoEmailId(id: string): boolean {
  return id.startsWith('gmail-demo-')
}

export function isGmailLiveEmailId(id: string): boolean {
  return id.startsWith('gmail-') && !id.startsWith('gmail-demo-')
}
