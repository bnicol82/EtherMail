import type { CalendarEvent } from '../types'

export interface RoomHistoryEntry {
  location: string
  room: string
  count: number
  lastUsed: string
}

export interface RoomSuggestion {
  room: string
  location: string
  count: number
  lastUsed: string
  reason: string
}

/** Normalize location strings for fuzzy matching */
export function normalizeLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/\s*[—–-]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildLocationHistory(events: CalendarEvent[]): RoomHistoryEntry[] {
  const map = new Map<string, RoomHistoryEntry>()

  for (const event of events) {
    if (!event.location?.trim() || !event.room?.trim()) continue
    const key = `${normalizeLocation(event.location)}::${event.room.trim().toLowerCase()}`
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      if (event.start > existing.lastUsed) existing.lastUsed = event.start
    } else {
      map.set(key, {
        location: event.location.trim(),
        room: event.room.trim(),
        count: 1,
        lastUsed: event.start,
      })
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count || b.lastUsed.localeCompare(a.lastUsed))
}

export function suggestRooms(
  events: CalendarEvent[],
  opts: {
    location?: string
    start?: string
    end?: string
    excludeEventId?: string
  } = {},
): RoomSuggestion[] {
  const history = buildLocationHistory(
    events.filter((e) => e.id !== opts.excludeEventId),
  )
  const normLoc = opts.location ? normalizeLocation(opts.location) : null

  let candidates = history
  if (normLoc) {
    candidates = history.filter((h) => normalizeLocation(h.location).includes(normLoc) || normLoc.includes(normalizeLocation(h.location)))
  }

  const busyRooms = new Set<string>()
  if (opts.start && opts.end) {
    const start = new Date(opts.start).getTime()
    const end = new Date(opts.end).getTime()
    for (const event of events) {
      if (event.id === opts.excludeEventId || !event.room) continue
      const eStart = new Date(event.start).getTime()
      const eEnd = new Date(event.end).getTime()
      if (eStart < end && eEnd > start) {
        busyRooms.add(`${normalizeLocation(event.location ?? '')}::${event.room.toLowerCase()}`)
      }
    }
  }

  return candidates
    .filter((h) => !busyRooms.has(`${normalizeLocation(h.location)}::${h.room.toLowerCase()}`))
    .slice(0, 5)
    .map((h) => ({
      room: h.room,
      location: h.location,
      count: h.count,
      lastUsed: h.lastUsed,
      reason:
        h.count > 1
          ? `Used ${h.count}× at ${h.location}`
          : `Last used ${new Date(h.lastUsed).toLocaleDateString()}`,
    }))
}

export function getRoomHintForEvent(
  event: CalendarEvent,
  allEvents: CalendarEvent[],
): RoomSuggestion | null {
  if (event.room?.trim()) return null
  const suggestions = suggestRooms(allEvents, {
    location: event.location,
    start: event.start,
    end: event.end,
    excludeEventId: event.id,
  })
  return suggestions[0] ?? null
}
