import type { CalendarEvent, Email, Note } from '../types'
import { retrieveContext } from './rag'
import { formatEventTimeRange } from './utils'

export interface MeetingBrief {
  eventId: string
  title: string
  markdown: string
}

function emailsForAttendees(emails: Email[], attendees: string[]): Email[] {
  if (!attendees.length) return []
  const terms = attendees.map((a) => a.toLowerCase().split(/[@\s.]+/)[0])
  return emails.filter((e) => {
    const from = `${e.fromName} ${e.from}`.toLowerCase()
    return terms.some((t) => t.length > 2 && from.includes(t))
  })
}

/** Build a meeting prep brief from calendar event + vault context */
export function generateMeetingBrief(
  event: CalendarEvent,
  notes: Note[],
  emails: Email[],
): MeetingBrief {
  const sourceEmail = event.sourceEmailId
    ? emails.find((e) => e.id === event.sourceEmailId)
    : undefined

  const attendeeEmails = emailsForAttendees(emails, event.attendees ?? [])
  const query = [event.title, ...(event.attendees ?? []), sourceEmail?.subject ?? ''].join(' ')
  const related = retrieveContext(query, notes, emails, 4)

  const linkedNotes = sourceEmail?.linkedNoteId
    ? notes.filter((n) => n.id === sourceEmail.linkedNoteId)
    : []

  const lines: string[] = [
    `# Meeting prep: ${event.title}`,
    '',
    '## When & where',
    `- **Date:** ${new Date(event.start).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}`,
    `- **Time:** ${formatEventTimeRange(event.start, event.end)}`,
  ]

  if (event.location) lines.push(`- **Location:** ${event.location}`)
  if (event.room) lines.push(`- **Room:** ${event.room}`)
  if (event.attendees?.length) lines.push(`- **Attendees:** ${event.attendees.join(', ')}`)

  lines.push('', '## Agenda & context')

  if (sourceEmail) {
    lines.push(
      `**Invite email** — "${sourceEmail.subject}" from ${sourceEmail.fromName}:`,
      '',
      `> ${sourceEmail.preview}`,
      '',
    )
  } else {
    lines.push(`No invite email linked. Review notes and recent threads below.`, '')
  }

  if (linkedNotes.length > 0) {
    lines.push('### Linked notes')
    for (const note of linkedNotes) {
      const excerpt = note.content.replace(/[#*`[\]]/g, '').slice(0, 280)
      lines.push(`**${note.title}**`, excerpt + (note.content.length > 280 ? '…' : ''), '')
    }
  }

  if (related.length > 0) {
    lines.push('### Related vault items')
    for (const item of related) {
      lines.push(`- **${item.title}** (${item.type}): ${item.excerpt.slice(0, 120)}…`)
    }
    lines.push('')
  }

  if (attendeeEmails.length > 0) {
    lines.push('### Recent threads with attendees')
    for (const e of attendeeEmails.slice(0, 3)) {
      lines.push(`- ${e.fromName}: "${e.subject}" (${new Date(e.date).toLocaleDateString()})`)
    }
    lines.push('')
  }

  lines.push(
    '## Suggested talking points',
    '- Review open action items from prior meetings',
    '- Confirm decisions needed before you leave',
    '- Note any blockers to raise early',
    '',
    '## Your prep checklist',
    '- [ ] Skim linked notes and recent email threads',
    '- [ ] Prepare updates on your action items',
    '- [ ] Confirm dial-in / room access',
    '- [ ] Block 10 min after for follow-up notes',
  )

  return {
    eventId: event.id,
    title: event.title,
    markdown: lines.join('\n'),
  }
}

/** Next upcoming event (for dashboard / generic prep queries) */
export function getNextMeeting(events: CalendarEvent[]): CalendarEvent | null {
  const now = Date.now()
  const upcoming = [...events]
    .filter((e) => new Date(e.end).getTime() >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
  return upcoming[0] ?? null
}
