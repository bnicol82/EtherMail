import type { CalendarEvent, Email, Note, SearchResult, View } from '../types'

function matches(q: string, ...parts: (string | undefined)[]): boolean {
  const needle = q.toLowerCase().trim()
  if (!needle) return false
  return parts.some((p) => p?.toLowerCase().includes(needle))
}

const NAV_ITEMS: { view: View; title: string; subtitle: string }[] = [
  { view: 'dashboard', title: 'Dashboard', subtitle: 'Home overview' },
  { view: 'email', title: 'Email', subtitle: 'Inbox and messages' },
  { view: 'vault', title: 'Vault', subtitle: 'Notes and files' },
  { view: 'notes', title: 'Notes', subtitle: 'All notes' },
  { view: 'calendar', title: 'Calendar', subtitle: 'Events and meetings' },
  { view: 'graph', title: 'Knowledge Graph', subtitle: 'Connections map' },
  { view: 'ai', title: 'AI Assistant', subtitle: 'Chat with vault AI' },
  { view: 'settings', title: 'Settings', subtitle: 'Preferences' },
]

export function globalSearch(
  query: string,
  notes: Note[],
  emails: Email[],
  calendarEvents: CalendarEvent[],
  limit = 12,
): SearchResult[] {
  const q = query.trim()
  if (!q) return []

  const results: SearchResult[] = []

  for (const nav of NAV_ITEMS) {
    if (matches(q, nav.title, nav.subtitle)) {
      results.push({
        id: `nav-${nav.view}`,
        type: 'view',
        title: nav.title,
        subtitle: nav.subtitle,
        view: nav.view,
      })
    }
  }

  for (const note of notes) {
    if (matches(q, note.title, note.content, note.tags.join(' '))) {
      results.push({
        id: note.id,
        type: 'note',
        title: note.title,
        subtitle: note.tags.slice(0, 2).join(' ') || 'Note',
        view: 'notes',
        sourceId: note.id,
      })
    }
  }

  for (const email of emails) {
    if (matches(q, email.subject, email.fromName, email.preview, email.body)) {
      results.push({
        id: email.id,
        type: 'email',
        title: email.subject,
        subtitle: `${email.fromName} · ${email.folder ?? 'inbox'}`,
        view: 'email',
        sourceId: email.id,
      })
    }
  }

  for (const event of calendarEvents) {
    if (matches(q, event.title, event.location, event.room, event.attendees?.join(' '))) {
      const start = new Date(event.start).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      results.push({
        id: event.id,
        type: 'calendar',
        title: event.title,
        subtitle: start,
        view: 'calendar',
        sourceId: event.id,
      })
    }
  }

  return results.slice(0, limit)
}
