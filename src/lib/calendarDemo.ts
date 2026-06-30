import type { CalendarEvent } from '../types'

function localIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function eventAt(
  daysFromNow: number,
  hour: number,
  minute: number,
  durationMin: number,
  partial: Omit<CalendarEvent, 'start' | 'end'>,
): CalendarEvent {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + daysFromNow)
  start.setHours(hour, minute, 0, 0)
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + durationMin)
  return { ...partial, start: localIso(start), end: localIso(end) }
}

/** Demo calendar with dates anchored to the current day so Upcoming always has content. */
export function buildDemoCalendarEvents(): CalendarEvent[] {
  return [
    eventAt(0, 10, 0, 60, {
      id: 'cal-1',
      uid: 'cal-1@ethermail',
      title: 'Project Sync',
      attendees: ['Sarah J.', 'Alex Kim', 'Team leads'],
      location: 'HQ — East Wing',
      room: '4B',
    }),
    eventAt(0, 14, 0, 60, {
      id: 'cal-2',
      uid: 'cal-2@ethermail',
      title: 'Budget Review',
      attendees: ['Sarah J.', 'Finance team', 'Alex Kim'],
      location: 'Finance Building',
      room: '201',
      sourceEmailId: 'email-5',
    }),
    eventAt(1, 11, 0, 60, {
      id: 'cal-3',
      uid: 'cal-3@ethermail',
      title: 'Client Meeting',
      attendees: ['Acme Corp'],
      location: 'Virtual — Teams',
      room: 'Bridge A',
    }),
    eventAt(2, 9, 0, 30, {
      id: 'cal-4',
      uid: 'cal-4@ethermail',
      title: 'Team Standup',
      location: 'HQ — East Wing',
      room: '2A',
    }),
    eventAt(3, 15, 0, 45, {
      id: 'cal-5',
      uid: 'cal-5@ethermail',
      title: 'Design Review',
      attendees: ['Sarah J.', 'Alex Kim'],
      location: 'HQ — West Wing',
      room: '3C',
    }),
    eventAt(5, 10, 30, 60, {
      id: 'cal-6',
      uid: 'cal-6@ethermail',
      title: 'Q3 Planning',
      attendees: ['Team leads', 'Finance team'],
      location: 'Conference Center',
      room: 'A',
    }),
    eventAt(7, 13, 0, 60, {
      id: 'cal-7',
      uid: 'cal-7@ethermail',
      title: 'Partner Check-in',
      attendees: ['Acme Corp', 'Sarah J.'],
      location: 'Virtual — Teams',
      room: 'Bridge B',
    }),
    eventAt(10, 9, 0, 90, {
      id: 'cal-8',
      uid: 'cal-8@ethermail',
      title: 'All-Hands',
      attendees: ['Team leads', 'Finance team', 'Alex Kim'],
      location: 'HQ — Auditorium',
      room: 'Main',
    }),
  ]
}

export function refreshStaleCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.end) >= now)
  if (upcoming.length >= 4) return events
  return buildDemoCalendarEvents()
}

export function getUpcomingCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  const anchored = refreshStaleCalendarEvents(events)
  const now = new Date()
  return [...anchored]
    .filter((e) => new Date(e.end) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
}
