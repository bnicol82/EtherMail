import type { Email } from '../types'

const SUBJECT_PREFIX_RE = /^(re|fwd|fw):\s*/i

/** Strip reply/forward prefixes for thread grouping */
export function normalizeThreadSubject(subject: string): string {
  let s = subject.trim()
  while (SUBJECT_PREFIX_RE.test(s)) {
    s = s.replace(SUBJECT_PREFIX_RE, '').trim()
  }
  return s
}

export function threadKeyForEmail(email: Email): string {
  return `${email.accountId}:${normalizeThreadSubject(email.subject).toLowerCase()}`
}

export interface EmailThread {
  id: string
  subject: string
  emails: Email[]
  latest: Email
  unreadCount: number
  participantNames: string[]
}

export function buildEmailThreads(emails: Email[]): EmailThread[] {
  const map = new Map<string, Email[]>()

  for (const email of emails) {
    const key = threadKeyForEmail(email)
    const list = map.get(key) ?? []
    list.push(email)
    map.set(key, list)
  }

  return [...map.entries()]
    .map(([id, list]) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
      const latest = sorted[sorted.length - 1]
      const unreadCount = sorted.filter((e) => !e.read).length
      const participantNames = [...new Set(sorted.map((e) => e.fromName))]
      return {
        id,
        subject: normalizeThreadSubject(latest.subject),
        emails: sorted,
        latest,
        unreadCount,
        participantNames,
      }
    })
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date))
}

/**
 * Build threads for the list: include a thread if any of its messages pass the flat filter.
 * `pool` should be account-scoped emails (all folders) so cross-folder replies group correctly.
 */
export function threadsForFilteredList(pool: Email[], filteredFlat: Email[]): EmailThread[] {
  const filteredIds = new Set(filteredFlat.map((e) => e.id))
  return buildEmailThreads(pool).filter((thread) =>
    thread.emails.some((e) => filteredIds.has(e.id)),
  )
}

export function getThreadForEmail(email: Email, pool: Email[]): EmailThread | null {
  const key = threadKeyForEmail(email)
  return buildEmailThreads(pool).find((t) => t.id === key) ?? null
}

export function isMultiMessageThread(thread: EmailThread): boolean {
  return thread.emails.length > 1
}
