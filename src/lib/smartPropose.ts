import type { CalendarEvent } from '../types'
import { formatEventTimeRange } from './utils'

export interface ProposedSlot {
  start: string
  end: string
  label: string
}

const WORK_START_HOUR = 9
const WORK_END_HOUR = 17
const SLOT_STEP_MS = 30 * 60 * 1000

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

function isWeekday(d: Date): boolean {
  const day = d.getDay()
  return day !== 0 && day !== 6
}

/** Find open calendar slots avoiding existing events */
export function findFreeSlots(
  events: CalendarEvent[],
  durationMinutes = 60,
  count = 3,
  fromDate = new Date(),
): ProposedSlot[] {
  const durationMs = durationMinutes * 60 * 1000
  const busy = events.map((e) => ({
    start: new Date(e.start).getTime(),
    end: new Date(e.end).getTime(),
  }))

  const slots: ProposedSlot[] = []
  const cursor = new Date(fromDate)
  cursor.setMinutes(0, 0, 0)

  for (let day = 0; day < 14 && slots.length < count; day++) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() + day)
    if (!isWeekday(d)) continue

    let slotStart = new Date(d)
    slotStart.setHours(WORK_START_HOUR, 0, 0, 0)

    const dayEnd = new Date(d)
    dayEnd.setHours(WORK_END_HOUR, 0, 0, 0)

    while (slotStart.getTime() + durationMs <= dayEnd.getTime() && slots.length < count) {
      const slotEnd = slotStart.getTime() + durationMs
      const conflict = busy.some((b) =>
        overlaps(slotStart.getTime(), slotEnd, b.start, b.end),
      )

      if (!conflict && slotStart.getTime() > Date.now()) {
        const startIso = slotStart.toISOString()
        const endIso = new Date(slotEnd).toISOString()
        slots.push({
          start: startIso,
          end: endIso,
          label: formatEventTimeRange(startIso, endIso),
        })
      }

      slotStart = new Date(slotStart.getTime() + SLOT_STEP_MS)
    }
  }

  return slots
}

export function formatProposalEmail(
  slots: ProposedSlot[],
  topic: string,
  attendees?: string[],
): { subject: string; body: string } {
  const attendeeLine = attendees?.length
    ? `Hi ${attendees.join(', ')},\n\n`
    : 'Hi,\n\n'

  const options =
    slots.length > 0
      ? slots.map((s, i) => `${i + 1}. ${s.label}`).join('\n')
      : 'No open slots found in the next two weeks — please suggest alternatives.'

  return {
    subject: `Meeting times: ${topic}`,
    body: `${attendeeLine}I'd like to schedule time to discuss **${topic}**. Here are a few options that work on my end:\n\n${options}\n\nLet me know which works best, or suggest another time.\n\nThanks!`,
  }
}

/** Check if a proposed time conflicts with existing events */
export function hasConflict(
  events: CalendarEvent[],
  start: string,
  end: string,
): CalendarEvent | null {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return (
    events.find((ev) => {
      const es = new Date(ev.start).getTime()
      const ee = new Date(ev.end).getTime()
      return overlaps(s, e, es, ee)
    }) ?? null
  )
}
