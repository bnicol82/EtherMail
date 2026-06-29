import type { Email } from '../types'

export type FollowUpReason =
  | 'unread_stale'
  | 'starred_waiting'
  | 'action_required'
  | 'no_reply_sent'
  | 'deadline'

export interface FollowUpHint {
  emailId: string
  subject: string
  fromName: string
  reason: FollowUpReason
  label: string
  daysSince: number
  severity: 'info' | 'warning' | 'urgent'
}

const ACTION_RE =
  /\b(reminder|invitation|action required|follow[- ]?up|deadline|please (review|submit|respond|reply|confirm)|can you|need your|waiting for)\b/i

const DEADLINE_RE = /reminder|deadline|submit|due|expires/i

const STALE_DAYS = 3
const SENT_NO_REPLY_DAYS = 5

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function sentEmailsAwaitingReply(emails: Email[]): Map<string, number> {
  const sent = emails.filter((e) => (e.folder ?? 'inbox') === 'sent')
  const inbox = emails.filter((e) => (e.folder ?? 'inbox') === 'inbox')
  const awaiting = new Map<string, number>()

  for (const s of sent) {
    const age = daysSince(s.date)
    if (age < SENT_NO_REPLY_DAYS) continue

    const threadSubject = s.subject.replace(/^re:\s*/i, '').trim()
    const hasReply = inbox.some(
      (e) =>
        e.from === s.to &&
        e.subject.replace(/^re:\s*/i, '').trim().toLowerCase() === threadSubject.toLowerCase() &&
        new Date(e.date) > new Date(s.date),
    )

    if (!hasReply) {
      awaiting.set(s.id, age)
    }
  }

  return awaiting
}

/** Detect emails that likely need a follow-up from the user */
export function detectFollowUps(emails: Email[]): FollowUpHint[] {
  const hints: FollowUpHint[] = []
  const seen = new Set<string>()
  const sentAwaiting = sentEmailsAwaitingReply(emails)

  const inbox = emails.filter(
    (e) => (e.folder ?? 'inbox') === 'inbox' && (e.folder ?? 'inbox') !== 'trash',
  )

  for (const email of inbox) {
    const age = daysSince(email.date)

    if (!email.read && age >= STALE_DAYS && !seen.has(email.id)) {
      seen.add(email.id)
      hints.push({
        emailId: email.id,
        subject: email.subject,
        fromName: email.fromName,
        reason: 'unread_stale',
        label: `Unread for ${age} days`,
        daysSince: age,
        severity: age >= 7 ? 'urgent' : 'warning',
      })
      continue
    }

    if (email.starred && !email.read && !seen.has(email.id)) {
      seen.add(email.id)
      hints.push({
        emailId: email.id,
        subject: email.subject,
        fromName: email.fromName,
        reason: 'starred_waiting',
        label: 'Starred, still unread',
        daysSince: age,
        severity: 'warning',
      })
      continue
    }

    if (DEADLINE_RE.test(email.subject) && !email.read && !seen.has(email.id)) {
      seen.add(email.id)
      hints.push({
        emailId: email.id,
        subject: email.subject,
        fromName: email.fromName,
        reason: 'deadline',
        label: 'Deadline-style subject',
        daysSince: age,
        severity: 'urgent',
      })
      continue
    }

    if (
      !email.read &&
      ACTION_RE.test(`${email.subject} ${email.preview}`) &&
      !seen.has(email.id)
    ) {
      seen.add(email.id)
      hints.push({
        emailId: email.id,
        subject: email.subject,
        fromName: email.fromName,
        reason: 'action_required',
        label: 'Action keywords detected',
        daysSince: age,
        severity: 'warning',
      })
    }
  }

  for (const [emailId, age] of sentAwaiting) {
    const email = emails.find((e) => e.id === emailId)
    if (!email || seen.has(emailId)) continue
    seen.add(emailId)
    hints.push({
      emailId,
      subject: email.subject,
      fromName: `To: ${email.to}`,
      reason: 'no_reply_sent',
      label: `No reply in ${age} days`,
      daysSince: age,
      severity: age >= 10 ? 'urgent' : 'info',
    })
  }

  const rank = { urgent: 0, warning: 1, info: 2 }
  return hints.sort((a, b) => {
    const diff = rank[a.severity] - rank[b.severity]
    if (diff !== 0) return diff
    return b.daysSince - a.daysSince
  })
}

export function followUpEmailIds(emails: Email[]): Set<string> {
  return new Set(detectFollowUps(emails).map((h) => h.emailId))
}
