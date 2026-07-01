import type { Email, EmailFolder } from '../types'
import type { EmailThread } from './emailThreads'
import { EMAIL_FOLDERS } from './emailFolders'

export type EmailSortKey = 'newest' | 'oldest' | 'subject-asc' | 'subject-desc' | 'sender-asc'

export const EMAIL_SORT_OPTIONS: { id: EmailSortKey; label: string; short: string }[] = [
  { id: 'newest', label: 'Newest first', short: 'Newest' },
  { id: 'oldest', label: 'Oldest first', short: 'Oldest' },
  { id: 'subject-asc', label: 'Subject A–Z', short: 'A–Z' },
  { id: 'subject-desc', label: 'Subject Z–A', short: 'Z–A' },
  { id: 'sender-asc', label: 'Sender A–Z', short: 'Sender' },
]

export const DEFAULT_EMAIL_FOLDER_SORT: Record<EmailFolder, EmailSortKey> = {
  inbox: 'newest',
  sent: 'newest',
  drafts: 'newest',
  scheduled: 'newest',
  archive: 'newest',
  trash: 'newest',
}

export function sortEmails(emails: Email[], sort: EmailSortKey): Email[] {
  const sorted = [...emails]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.date.localeCompare(a.date))
    case 'oldest':
      return sorted.sort((a, b) => a.date.localeCompare(b.date))
    case 'subject-asc':
      return sorted.sort((a, b) => a.subject.localeCompare(b.subject, undefined, { sensitivity: 'base' }))
    case 'subject-desc':
      return sorted.sort((a, b) => b.subject.localeCompare(a.subject, undefined, { sensitivity: 'base' }))
    case 'sender-asc':
      return sorted.sort((a, b) =>
        a.fromName.localeCompare(b.fromName, undefined, { sensitivity: 'base' }),
      )
    default:
      return sorted
  }
}

export function sortEmailThreads(threads: EmailThread[], sort: EmailSortKey): EmailThread[] {
  const sorted = [...threads]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.latest.date.localeCompare(a.latest.date))
    case 'oldest':
      return sorted.sort((a, b) => a.latest.date.localeCompare(b.latest.date))
    case 'subject-asc':
      return sorted.sort((a, b) => a.subject.localeCompare(b.subject, undefined, { sensitivity: 'base' }))
    case 'subject-desc':
      return sorted.sort((a, b) => b.subject.localeCompare(a.subject, undefined, { sensitivity: 'base' }))
    case 'sender-asc':
      return sorted.sort((a, b) =>
        a.latest.fromName.localeCompare(b.latest.fromName, undefined, { sensitivity: 'base' }),
      )
    default:
      return sorted
  }
}

export function normalizeEmailFolderSort(
  value: unknown,
): Record<EmailFolder, EmailSortKey> {
  const base = { ...DEFAULT_EMAIL_FOLDER_SORT }
  if (!value || typeof value !== 'object') return base
  for (const { id } of EMAIL_FOLDERS) {
    const sort = (value as Record<string, unknown>)[id]
    if (EMAIL_SORT_OPTIONS.some((o) => o.id === sort)) {
      base[id] = sort as EmailSortKey
    }
  }
  return base
}
