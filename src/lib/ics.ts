import type { CalendarEvent } from '../types'

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatIcsDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function parseIcsDate(value: string): string {
  const raw = value.trim()
  if (raw.endsWith('Z')) {
    const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
    if (m) {
      return new Date(
        Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]),
      ).toISOString()
    }
  }
  const local = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/)
  if (local) {
    return new Date(+local[1], +local[2] - 1, +local[3], +local[4], +local[5], +local[6]).toISOString()
  }
  const dateOnly = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dateOnly) {
    return new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3], 9, 0, 0).toISOString()
  }
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function unfoldIcsLines(content: string): string[] {
  const raw = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines: string[] = []
  for (const line of raw) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines.filter(Boolean)
}

function parseLocationField(value: string): { location?: string; room?: string } {
  const roomMatch = value.match(/^(.+?)\s*\/\s*Room\s+(.+)$/i)
  if (roomMatch) {
    return { location: roomMatch[1].trim(), room: roomMatch[2].trim() }
  }
  return { location: value.trim() || undefined }
}

export function calendarEventToIcs(event: CalendarEvent): string {
  const uid = event.uid ?? `${event.id}@ethermail`
  const location =
    event.location && event.room
      ? `${event.location} / Room ${event.room}`
      : event.location ?? (event.room ? `Room ${event.room}` : '')

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ]

  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  for (const attendee of event.attendees ?? []) {
    lines.push(`ATTENDEE;CN=${escapeIcsText(attendee)}:mailto:${attendee.replace(/\s+/g, '.').toLowerCase()}@example.com`)
  }
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

export function exportEventsToIcs(events: CalendarEvent[]): string {
  const body = events.map(calendarEventToIcs).join('\r\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EtherMail//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    body,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcsFile(events: CalendarEvent[], filename = 'ethermail-calendar.ics'): void {
  const content = exportEventsToIcs(events)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function parseIcsContent(content: string): CalendarEvent[] {
  const lines = unfoldIcsLines(content)
  const events: CalendarEvent[] = []
  let inEvent = false
  let current: Record<string, string> = {}

  const flush = () => {
    if (!current.SUMMARY && !current.DTSTART) return
    const { location, room } = parseLocationField(unescapeIcsText(current.LOCATION ?? ''))
    const uid = current.UID
    const start = parseIcsDate(current.DTSTART ?? '')
    const end = current.DTEND ? parseIcsDate(current.DTEND) : new Date(new Date(start).getTime() + 3600000).toISOString()
    const attendees: string[] = []
    for (const [key, val] of Object.entries(current)) {
      if (key.startsWith('ATTENDEE')) {
        const cn = val.match(/CN=([^;:]+)/i)?.[1]
        attendees.push(cn ? unescapeIcsText(cn) : val.split(':').pop()?.split('@')[0] ?? val)
      }
    }
    events.push({
      id: `cal-import-${Date.now()}-${events.length}`,
      uid,
      title: unescapeIcsText(current.SUMMARY ?? 'Imported event'),
      start,
      end,
      location,
      room,
      description: current.DESCRIPTION ? unescapeIcsText(current.DESCRIPTION) : undefined,
      attendees: attendees.length > 0 ? attendees : undefined,
    })
  }

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (inEvent) flush()
      inEvent = false
      current = {}
      continue
    }
    if (!inEvent) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).split(';')[0].toUpperCase()
    const value = line.slice(idx + 1)
    current[key] = value
  }

  return events
}

function unescapeIcsText(value: string): string {
  return value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

export async function readIcsFile(file: File): Promise<CalendarEvent[]> {
  const text = await file.text()
  return parseIcsContent(text)
}

export function mergeImportedEvents(
  existing: CalendarEvent[],
  imported: CalendarEvent[],
): CalendarEvent[] {
  const byUid = new Map(existing.filter((e) => e.uid).map((e) => [e.uid!, e]))
  const next = [...existing]
  for (const event of imported) {
    if (event.uid && byUid.has(event.uid)) {
      const idx = next.findIndex((e) => e.uid === event.uid)
      if (idx >= 0) next[idx] = { ...next[idx], ...event, id: next[idx].id }
      continue
    }
    next.push(event)
  }
  return next
}
