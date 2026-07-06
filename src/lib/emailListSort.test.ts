import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EMAIL_FOLDER_SORT,
  normalizeEmailFolderSort,
  sortEmails,
  sortEmailThreads,
} from './emailListSort'
import type { Email } from '../types'
import type { EmailThread } from './emailThreads'

function email(overrides: Partial<Email> & Pick<Email, 'id' | 'subject' | 'date' | 'fromName'>): Email {
  return {
    accountId: 'acct-1',
    from: 'a@example.com',
    to: 'me@example.com',
    body: '',
    preview: '',
    read: true,
    starred: false,
    linkedNoteId: null,
    ...overrides,
  }
}

describe('sortEmails', () => {
  const emails = [
    email({ id: '1', subject: 'Banana', date: '2024-01-01T00:00:00Z', fromName: 'Zoe' }),
    email({ id: '2', subject: 'Apple', date: '2024-02-01T00:00:00Z', fromName: 'Amy' }),
  ]

  it('newest sorts by date descending', () => {
    expect(sortEmails(emails, 'newest').map((e) => e.id)).toEqual(['2', '1'])
  })

  it('oldest sorts by date ascending', () => {
    expect(sortEmails(emails, 'oldest').map((e) => e.id)).toEqual(['1', '2'])
  })

  it('subject-asc sorts case-insensitively by subject', () => {
    expect(sortEmails(emails, 'subject-asc').map((e) => e.id)).toEqual(['2', '1'])
  })

  it('subject-desc reverses subject order', () => {
    expect(sortEmails(emails, 'subject-desc').map((e) => e.id)).toEqual(['1', '2'])
  })

  it('sender-asc sorts by sender display name', () => {
    expect(sortEmails(emails, 'sender-asc').map((e) => e.id)).toEqual(['2', '1'])
  })

  it('does not mutate the input array', () => {
    const copy = [...emails]
    sortEmails(emails, 'oldest')
    expect(emails).toEqual(copy)
  })
})

describe('sortEmailThreads', () => {
  function thread(id: string, subject: string, date: string, fromName: string): EmailThread {
    const latest = email({ id, subject, date, fromName })
    return { id, subject, emails: [latest], latest, unreadCount: 0, participantNames: [fromName] }
  }

  const threads = [
    thread('t1', 'Banana', '2024-01-01T00:00:00Z', 'Zoe'),
    thread('t2', 'Apple', '2024-02-01T00:00:00Z', 'Amy'),
  ]

  it('newest sorts threads by latest message date descending', () => {
    expect(sortEmailThreads(threads, 'newest').map((t) => t.id)).toEqual(['t2', 't1'])
  })

  it('subject-asc sorts threads by subject', () => {
    expect(sortEmailThreads(threads, 'subject-asc').map((t) => t.id)).toEqual(['t2', 't1'])
  })
})

describe('normalizeEmailFolderSort', () => {
  it('returns the default map for nullish/non-object input', () => {
    expect(normalizeEmailFolderSort(null)).toEqual(DEFAULT_EMAIL_FOLDER_SORT)
    expect(normalizeEmailFolderSort(undefined)).toEqual(DEFAULT_EMAIL_FOLDER_SORT)
    expect(normalizeEmailFolderSort('nonsense')).toEqual(DEFAULT_EMAIL_FOLDER_SORT)
  })

  it('accepts valid per-folder overrides', () => {
    const result = normalizeEmailFolderSort({ inbox: 'oldest' })
    expect(result.inbox).toBe('oldest')
    expect(result.sent).toBe(DEFAULT_EMAIL_FOLDER_SORT.sent)
  })

  it('ignores invalid sort keys and falls back to the default for that folder', () => {
    const result = normalizeEmailFolderSort({ inbox: 'not-a-real-sort' })
    expect(result.inbox).toBe(DEFAULT_EMAIL_FOLDER_SORT.inbox)
  })
})
