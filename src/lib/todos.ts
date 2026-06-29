import type { CalendarEvent, Email, Note } from '../types'

export interface TodoItem {
  id: string
  text: string
  source: 'note' | 'email' | 'calendar'
  sourceId: string
  sourceLabel: string
  /** Line index in note for checkbox completion */
  lineIndex?: number
}

const NOTE_TODO_RE = /^- \[ \] (.+)$/gm

const EMAIL_ACTION_RE =
  /\b(reminder|invitation|action required|follow[- ]?up|deadline|please (review|submit|respond|reply|confirm)|can you|need your)\b/i

function todosFromNotes(notes: Note[], completedIds: Set<string>): TodoItem[] {
  const items: TodoItem[] = []
  for (const note of notes) {
    let match: RegExpExecArray | null
    let lineIndex = 0
    NOTE_TODO_RE.lastIndex = 0
    while ((match = NOTE_TODO_RE.exec(note.content)) !== null) {
      const text = match[1].trim()
      if (!text) continue
      const id = `note:${note.id}:${lineIndex}`
      if (completedIds.has(id)) continue
      items.push({
        id,
        text,
        source: 'note',
        sourceId: note.id,
        sourceLabel: note.title,
        lineIndex,
      })
      lineIndex += 1
    }
  }
  return items
}

function todosFromEmails(emails: Email[], completedIds: Set<string>): TodoItem[] {
  const items: TodoItem[] = []
  const now = Date.now()
  const inbox = emails.filter((e) => {
    if ((e.folder ?? 'inbox') !== 'inbox' || e.folder === 'trash') return false
    if (e.snoozedUntil && new Date(e.snoozedUntil).getTime() > now) return false
    return true
  })

  for (const email of inbox) {
    const actionable =
      !email.read ||
      email.starred ||
      EMAIL_ACTION_RE.test(email.subject) ||
      EMAIL_ACTION_RE.test(email.preview) ||
      EMAIL_ACTION_RE.test(email.body)

    if (!actionable) continue
    const id = `email-${email.id}`
    if (completedIds.has(id)) continue

    items.push({
      id,
      text: email.subject,
      source: 'email',
      sourceId: email.id,
      sourceLabel: email.fromName,
    })
  }

  return items
}

function todosFromCalendar(events: CalendarEvent[], completedIds: Set<string>): TodoItem[] {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const items: TodoItem[] = []

  for (const event of events) {
    const start = new Date(event.start)
    if (start < now || start > in24h) continue
    const id = `cal-${event.id}`
    if (completedIds.has(id)) continue
    const time = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    items.push({
      id,
      text: `Prepare for ${event.title} (${time})`,
      source: 'calendar',
      sourceId: event.id,
      sourceLabel: event.location ?? 'Calendar',
    })
  }

  return items
}

/** Collect open action items from notes, emails, and upcoming calendar events. */
export function extractTodos(
  notes: Note[],
  emails: Email[],
  calendarEvents: CalendarEvent[] = [],
  completedIds: string[] = [],
  limit = 8,
): TodoItem[] {
  const completed = new Set(completedIds)
  const combined = [
    ...todosFromCalendar(calendarEvents, completed),
    ...todosFromNotes(notes, completed),
    ...todosFromEmails(emails, completed),
  ]
  return combined.slice(0, limit)
}

/** Mark a note checkbox as done at the given line index */
export function completeNoteTodo(note: Note, lineIndex: number): string {
  let idx = -1
  return note.content.replace(NOTE_TODO_RE, (match, text) => {
    idx += 1
    if (idx === lineIndex) return `- [x] ${text}`
    return match
  })
}
