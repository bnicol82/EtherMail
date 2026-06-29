import type { CalendarEvent, Email, Note } from '../types'
import { retrieveContext } from './rag'

export interface BridgeContextPacket {
  query: string
  generatedAt: string
  excerpts: { type: 'note' | 'email' | 'calendar'; title: string; excerpt: string }[]
  summary: string
  charCount: number
}

const MAX_EXCERPT_LEN = 400
const MAX_PACKET_CHARS = 6000

function trimExcerpt(text: string, max = MAX_EXCERPT_LEN): string {
  const clean = text.replace(/[#*`[\]]/g, '').replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`
}

/** Build a redacted context packet from vault data for External AI (Bridge mode) */
export function buildContextPacket(
  query: string,
  notes: Note[],
  emails: Email[],
  calendarEvents: CalendarEvent[] = [],
  limit = 5,
): BridgeContextPacket {
  const retrieved = retrieveContext(query, notes, emails, limit)
  const excerpts: BridgeContextPacket['excerpts'] = retrieved.map((r) => ({
    type: r.type,
    title: r.title,
    excerpt: trimExcerpt(r.excerpt),
  }))

  const now = new Date()
  const upcoming = [...calendarEvents]
    .filter((e) => new Date(e.end) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 2)

  for (const event of upcoming) {
    if (excerpts.length >= limit + 2) break
    const q = query.toLowerCase()
    const relevant =
      q.includes('meeting') ||
      q.includes('calendar') ||
      q.includes('prep') ||
      event.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && q.includes(w))

    if (relevant || upcoming.indexOf(event) === 0) {
      excerpts.push({
        type: 'calendar',
        title: event.title,
        excerpt: trimExcerpt(
          `${new Date(event.start).toLocaleString()} — ${event.location ?? 'No location'} — ${event.attendees?.join(', ') ?? 'No attendees'}`,
        ),
      })
    }
  }

  let charCount = 0
  const bounded: BridgeContextPacket['excerpts'] = []
  for (const ex of excerpts) {
    const size = ex.title.length + ex.excerpt.length
    if (charCount + size > MAX_PACKET_CHARS) break
    bounded.push(ex)
    charCount += size
  }

  const summary =
    bounded.length === 0
      ? 'No vault excerpts matched this query.'
      : `Curated ${bounded.length} excerpt(s) from your vault (notes, emails${bounded.some((e) => e.type === 'calendar') ? ', calendar' : ''}).`

  return {
    query,
    generatedAt: new Date().toISOString(),
    excerpts: bounded,
    summary,
    charCount,
  }
}

export function formatPacketForExternal(query: string, packet: BridgeContextPacket): string {
  if (packet.excerpts.length === 0) return query

  const blocks = packet.excerpts.map(
    (e, i) => `[${i + 1}] ${e.type.toUpperCase()}: ${e.title}\n${e.excerpt}`,
  )

  return `${query}

---
BRIDGE CONTEXT (user-approved vault excerpts only):
${blocks.join('\n\n')}
---`
}
