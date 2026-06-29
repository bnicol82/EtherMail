import type { CalendarEvent, Email, EmailAttachment } from '../types'

/** Extract calendar events from invitation emails and .ics attachments */
export function syncCalendarFromEmails(
  emails: Email[],
  attachments: EmailAttachment[],
  existing: CalendarEvent[],
): CalendarEvent[] {
  const byId = new Map(existing.map((e) => [e.id, e]))

  for (const email of emails) {
    const isInvite =
      /invitation|invite|calendar|meeting|event/i.test(email.subject) ||
      email.fromName.toLowerCase() === 'calendar'

    if (!isInvite) continue

    const eventId = `cal-email-${email.id}`
    if (byId.has(eventId)) continue

    const whenMatch = email.body.match(/When:\s*(.+)/i)

    let start = email.date
    let end = email.date

    if (whenMatch) {
      const parsed = Date.parse(whenMatch[1])
      if (!Number.isNaN(parsed)) {
        start = new Date(parsed).toISOString()
        const endDate = new Date(parsed)
        endDate.setHours(endDate.getHours() + 1)
        end = endDate.toISOString()
      }
    }

    const title =
      email.subject.replace(/^Invitation:\s*/i, '').trim() ||
      email.subject

    byId.set(eventId, {
      id: eventId,
      title,
      start,
      end,
      attendees: extractAttendees(email.body),
    })
  }

  for (const att of attachments) {
    if (!att.mimeType.includes('calendar')) continue

    const eventId = `cal-att-${att.id}`
    if (byId.has(eventId)) continue

    const sourceEmail = emails.find((e) => e.id === att.emailId)
    byId.set(eventId, {
      id: eventId,
      title: sourceEmail?.subject.replace(/^Invitation:\s*/i, '') ?? att.filename,
      start: att.date,
      end: new Date(new Date(att.date).getTime() + 3600000).toISOString(),
      attendees: sourceEmail ? extractAttendees(sourceEmail.body) : undefined,
    })
  }

  return [...byId.values()].sort((a, b) => a.start.localeCompare(b.start))
}

function extractAttendees(body: string): string[] | undefined {
  const match = body.match(/Attendees?:\s*(.+)/i)
  if (!match) return undefined
  return match[1]
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
