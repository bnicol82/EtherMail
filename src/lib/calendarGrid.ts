import type { CalendarEvent } from '../types'
import { isSameDay } from './utils'

export const EVENT_COLORS = ['#6366f1', '#22d3ee', '#f472b6', '#a78bfa', '#34d399']

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day))
}
