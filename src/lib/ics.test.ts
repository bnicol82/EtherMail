import { describe, expect, it } from 'vitest'
import { calendarEventToIcs, exportEventsToIcs, mergeImportedEvents, parseIcsContent } from './ics'
import type { CalendarEvent } from '../types'

function calendarEvent(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'id' | 'title' | 'start' | 'end'>): CalendarEvent {
  return { ...overrides }
}

describe('calendarEventToIcs', () => {
  it('emits a VEVENT block with UID, times, and summary', () => {
    const ics = calendarEventToIcs(
      calendarEvent({ id: 'e1', title: 'Standup', start: '2024-01-01T10:00:00Z', end: '2024-01-01T10:30:00Z' }),
    )
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
    expect(ics).toContain('UID:e1@ethermail')
    expect(ics).toContain('DTSTART:20240101T100000Z')
    expect(ics).toContain('DTEND:20240101T103000Z')
    expect(ics).toContain('SUMMARY:Standup')
  })

  it('escapes commas, semicolons, and newlines in text fields', () => {
    const ics = calendarEventToIcs(
      calendarEvent({
        id: 'e2',
        title: 'A, B; C\nD',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T10:30:00Z',
      }),
    )
    expect(ics).toContain('SUMMARY:A\\, B\\; C\\nD')
  })

  it('combines location and room into a single LOCATION field', () => {
    const ics = calendarEventToIcs(
      calendarEvent({
        id: 'e3',
        title: 'Sync',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T10:30:00Z',
        location: 'HQ',
        room: '4B',
      }),
    )
    expect(ics).toContain('LOCATION:HQ / Room 4B')
  })

  it('renders attendees with a CN and a derived mailto address', () => {
    const ics = calendarEventToIcs(
      calendarEvent({
        id: 'e4',
        title: 'Sync',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T10:30:00Z',
        attendees: ['Jane Doe'],
      }),
    )
    expect(ics).toContain('ATTENDEE;CN=Jane Doe:mailto:jane.doe@example.com')
  })
})

describe('exportEventsToIcs', () => {
  it('wraps events in a VCALENDAR envelope', () => {
    const ics = exportEventsToIcs([
      calendarEvent({ id: 'e1', title: 'A', start: '2024-01-01T10:00:00Z', end: '2024-01-01T10:30:00Z' }),
    ])
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    expect(ics.endsWith('END:VCALENDAR')).toBe(true)
  })
})

describe('parseIcsContent', () => {
  it('round-trips a single event produced by calendarEventToIcs', () => {
    const original = calendarEvent({
      id: 'e1',
      title: 'Standup',
      start: '2024-01-01T10:00:00.000Z',
      end: '2024-01-01T10:30:00.000Z',
      location: 'HQ',
      description: 'Daily sync',
    })
    const ics = `BEGIN:VCALENDAR\r\n${calendarEventToIcs(original)}\r\nEND:VCALENDAR`
    const [parsed] = parseIcsContent(ics)
    expect(parsed.title).toBe('Standup')
    expect(parsed.start).toBe('2024-01-01T10:00:00.000Z')
    expect(parsed.end).toBe('2024-01-01T10:30:00.000Z')
    expect(parsed.location).toBe('HQ')
    expect(parsed.description).toBe('Daily sync')
    expect(parsed.uid).toBe('e1@ethermail')
  })

  it('unfolds multi-line (space-continued) ICS fields', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:folded@ethermail',
      'DTSTART:20240101T100000Z',
      'DTEND:20240101T103000Z',
      'SUMMARY:Long summary that',
      ' continues on the next line',
      'END:VEVENT',
    ].join('\r\n')
    const [parsed] = parseIcsContent(ics)
    expect(parsed.title).toBe('Long summary thatcontinues on the next line')
  })

  it('parses attendees with a CN into plain names', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:att@ethermail',
      'DTSTART:20240101T100000Z',
      'DTEND:20240101T103000Z',
      'SUMMARY:Sync',
      'ATTENDEE;CN=Jane Doe:mailto:jane.doe@example.com',
      'END:VEVENT',
    ].join('\r\n')
    const [parsed] = parseIcsContent(ics)
    expect(parsed.attendees).toEqual(['Jane Doe'])
  })

  it('parses multiple attendees on the same event, not just the last one', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:multi@ethermail',
      'DTSTART:20240101T100000Z',
      'DTEND:20240101T103000Z',
      'SUMMARY:Sync',
      'ATTENDEE;CN=Jane Doe:mailto:jane.doe@example.com',
      'ATTENDEE;CN=John Smith:mailto:john.smith@example.com',
      'END:VEVENT',
    ].join('\r\n')
    const [parsed] = parseIcsContent(ics)
    expect(parsed.attendees).toEqual(['Jane Doe', 'John Smith'])
  })

  it('falls back to deriving a name from the mailto address when there is no CN', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:nocn@ethermail',
      'DTSTART:20240101T100000Z',
      'DTEND:20240101T103000Z',
      'SUMMARY:Sync',
      'ATTENDEE:mailto:jane.doe@example.com',
      'END:VEVENT',
    ].join('\r\n')
    const [parsed] = parseIcsContent(ics)
    expect(parsed.attendees).toEqual(['jane.doe'])
  })

  it('defaults a missing DTEND to one hour after DTSTART', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:noend@ethermail',
      'DTSTART:20240101T100000Z',
      'SUMMARY:No end time',
      'END:VEVENT',
    ].join('\r\n')
    const [parsed] = parseIcsContent(ics)
    expect(parsed.start).toBe('2024-01-01T10:00:00.000Z')
    expect(parsed.end).toBe('2024-01-01T11:00:00.000Z')
  })

  it('returns no events for content with no VEVENT blocks', () => {
    expect(parseIcsContent('BEGIN:VCALENDAR\r\nEND:VCALENDAR')).toEqual([])
  })
})

describe('mergeImportedEvents', () => {
  it('appends imported events that have no matching UID', () => {
    const existing = [calendarEvent({ id: 'e1', title: 'Existing', start: 'a', end: 'b', uid: 'u1' })]
    const imported = [calendarEvent({ id: 'imp-1', title: 'New', start: 'c', end: 'd', uid: 'u2' })]
    const merged = mergeImportedEvents(existing, imported)
    expect(merged).toHaveLength(2)
  })

  it('updates an existing event in place when the UID matches, keeping the original id', () => {
    const existing = [calendarEvent({ id: 'e1', title: 'Old title', start: 'a', end: 'b', uid: 'u1' })]
    const imported = [calendarEvent({ id: 'imp-1', title: 'New title', start: 'c', end: 'd', uid: 'u1' })]
    const merged = mergeImportedEvents(existing, imported)
    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('e1')
    expect(merged[0].title).toBe('New title')
  })

  it('leaves events without a UID untouched and simply appends new ones', () => {
    const existing = [calendarEvent({ id: 'e1', title: 'No uid', start: 'a', end: 'b' })]
    const imported = [calendarEvent({ id: 'imp-1', title: 'Another', start: 'c', end: 'd' })]
    expect(mergeImportedEvents(existing, imported)).toHaveLength(2)
  })
})
