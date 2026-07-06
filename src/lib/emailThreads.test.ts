import { describe, expect, it } from 'vitest'
import {
  buildEmailThreads,
  getThreadForEmail,
  isMultiMessageThread,
  normalizeThreadSubject,
  threadKeyForEmail,
  threadsForFilteredList,
} from './emailThreads'
import type { Email } from '../types'

function email(overrides: Partial<Email> & Pick<Email, 'id' | 'subject' | 'date'>): Email {
  return {
    accountId: 'acct-1',
    from: 'a@example.com',
    fromName: 'Alice',
    to: 'me@example.com',
    body: '',
    preview: '',
    read: true,
    starred: false,
    linkedNoteId: null,
    ...overrides,
  }
}

describe('normalizeThreadSubject', () => {
  it('strips a single reply/forward prefix', () => {
    expect(normalizeThreadSubject('Re: Hello')).toBe('Hello')
    expect(normalizeThreadSubject('Fwd: Hello')).toBe('Hello')
    expect(normalizeThreadSubject('FW: Hello')).toBe('Hello')
  })

  it('strips repeated/mixed-case prefixes', () => {
    expect(normalizeThreadSubject('re: RE: Fwd: Hello')).toBe('Hello')
  })

  it('leaves a subject with no prefix untouched (aside from trimming)', () => {
    expect(normalizeThreadSubject('  Hello  ')).toBe('Hello')
  })
})

describe('threadKeyForEmail', () => {
  it('combines account id and normalized lowercase subject', () => {
    expect(threadKeyForEmail(email({ id: '1', subject: 'Re: Project X', date: '2024-01-01', accountId: 'acct-1' }))).toBe(
      'acct-1:project x',
    )
  })

  it('scopes thread keys per account, so the same subject on two accounts does not merge', () => {
    const a = threadKeyForEmail(email({ id: '1', subject: 'Hello', date: '2024-01-01', accountId: 'acct-1' }))
    const b = threadKeyForEmail(email({ id: '2', subject: 'Hello', date: '2024-01-01', accountId: 'acct-2' }))
    expect(a).not.toBe(b)
  })
})

describe('buildEmailThreads', () => {
  it('groups replies into a single thread and sorts messages oldest-first', () => {
    const emails = [
      email({ id: '1', subject: 'Hello', date: '2024-01-01T00:00:00Z' }),
      email({ id: '2', subject: 'Re: Hello', date: '2024-01-02T00:00:00Z', read: false }),
    ]
    const threads = buildEmailThreads(emails)
    expect(threads).toHaveLength(1)
    expect(threads[0].emails.map((e) => e.id)).toEqual(['1', '2'])
    expect(threads[0].latest.id).toBe('2')
    expect(threads[0].unreadCount).toBe(1)
  })

  it('sorts threads newest-first by latest message date', () => {
    const emails = [
      email({ id: '1', subject: 'Older', date: '2024-01-01T00:00:00Z' }),
      email({ id: '2', subject: 'Newer', date: '2024-02-01T00:00:00Z' }),
    ]
    const threads = buildEmailThreads(emails)
    expect(threads.map((t) => t.subject)).toEqual(['Newer', 'Older'])
  })

  it('de-duplicates participant names across a thread', () => {
    const emails = [
      email({ id: '1', subject: 'Hello', date: '2024-01-01T00:00:00Z', fromName: 'Alice' }),
      email({ id: '2', subject: 'Re: Hello', date: '2024-01-02T00:00:00Z', fromName: 'Alice' }),
      email({ id: '3', subject: 'Re: Hello', date: '2024-01-03T00:00:00Z', fromName: 'Bob' }),
    ]
    const threads = buildEmailThreads(emails)
    expect(threads[0].participantNames).toEqual(['Alice', 'Bob'])
  })
})

describe('threadsForFilteredList', () => {
  it('includes a whole thread if any message in it passes the flat filter', () => {
    const pool = [
      email({ id: '1', subject: 'Hello', date: '2024-01-01T00:00:00Z' }),
      email({ id: '2', subject: 'Re: Hello', date: '2024-01-02T00:00:00Z' }),
    ]
    const filteredFlat = [pool[1]]
    const threads = threadsForFilteredList(pool, filteredFlat)
    expect(threads).toHaveLength(1)
    expect(threads[0].emails).toHaveLength(2)
  })

  it('excludes threads with no messages in the flat filter', () => {
    const pool = [email({ id: '1', subject: 'Hello', date: '2024-01-01T00:00:00Z' })]
    expect(threadsForFilteredList(pool, [])).toHaveLength(0)
  })
})

describe('getThreadForEmail / isMultiMessageThread', () => {
  it('finds the thread containing a given email', () => {
    const pool = [
      email({ id: '1', subject: 'Hello', date: '2024-01-01T00:00:00Z' }),
      email({ id: '2', subject: 'Re: Hello', date: '2024-01-02T00:00:00Z' }),
    ]
    const thread = getThreadForEmail(pool[0], pool)
    expect(thread?.emails).toHaveLength(2)
    expect(isMultiMessageThread(thread!)).toBe(true)
  })

  it('a single-message thread is not multi-message', () => {
    const pool = [email({ id: '1', subject: 'Solo', date: '2024-01-01T00:00:00Z' })]
    const thread = getThreadForEmail(pool[0], pool)
    expect(isMultiMessageThread(thread!)).toBe(false)
  })
})
