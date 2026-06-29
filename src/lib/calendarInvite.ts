import type { CalendarEvent } from '../types'
import { formatEventTimeRange } from './utils'

export function formatCalendarInviteBody(event: CalendarEvent): string {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const lines = [
    `You're invited to: ${event.title}`,
    '',
    `When: ${start.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
    `Time: ${formatEventTimeRange(event.start, event.end)}`,
    `Duration: ${Math.round((end.getTime() - start.getTime()) / 60000)} minutes`,
  ]
  if (event.location) lines.push(`Location: ${event.location}`)
  if (event.room) lines.push(`Room: ${event.room}`)
  if (event.attendees?.length) lines.push(`Attendees: ${event.attendees.join(', ')}`)
  return lines.join('\n')
}

export function formatForwardInviteSubject(event: CalendarEvent): string {
  return `Fwd: Invitation — ${event.title}`
}
