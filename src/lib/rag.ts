import type { CalendarEvent, Email, Note } from '../types'
import { buildContextPacket, formatPacketForExternal } from './aiBridge'
import { detectFollowUps } from './followUp'
import { generateMeetingBrief, getNextMeeting } from './meetingPrep'
import { findFreeSlots, formatProposalEmail, hasConflict } from './smartPropose'

interface RetrievalResult {
  type: 'note' | 'email'
  id: string
  title: string
  excerpt: string
  score: number
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

function scoreText(query: string, text: string, title: string): number {
  const qTokens = tokenize(query)
  if (qTokens.length === 0) return 0
  const body = text.toLowerCase()
  const t = title.toLowerCase()
  let score = 0
  for (const token of qTokens) {
    if (t.includes(token)) score += 3
    const count = (body.match(new RegExp(token, 'g')) ?? []).length
    score += count
  }
  return score
}

export function retrieveContext(
  query: string,
  notes: Note[],
  emails: Email[],
  limit = 5,
): RetrievalResult[] {
  const results: RetrievalResult[] = []

  notes.forEach((note) => {
    const score = scoreText(query, note.content, note.title)
    if (score > 0) {
      const excerpt = note.content.slice(0, 200).replace(/[#*`[\]]/g, '')
      results.push({ type: 'note', id: note.id, title: note.title, excerpt, score })
    }
  })

  emails.forEach((email) => {
    const score = scoreText(query, email.body, email.subject)
    if (score > 0) {
      results.push({
        type: 'email',
        id: email.id,
        title: email.subject,
        excerpt: email.preview,
        score,
      })
    }
  })

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

export interface VaultAIContext {
  calendarEvents?: CalendarEvent[]
  eventId?: string
}

export async function generateVaultAIResponse(
  query: string,
  notes: Note[],
  emails: Email[],
  ctx: VaultAIContext = {},
): Promise<string> {
  const q = query.toLowerCase()
  const events = ctx.calendarEvents ?? []

  if ((q.includes('prep') || q.includes('brief')) && (q.includes('meeting') || q.includes('calendar') || events.length > 0)) {
    const event =
      (ctx.eventId ? events.find((e) => e.id === ctx.eventId) : undefined) ??
      getNextMeeting(events)
    if (event) {
      const brief = generateMeetingBrief(event, notes, emails)
      return brief.markdown
    }
    return 'No upcoming meetings found on your calendar to prep for.'
  }

  if (
    q.includes('propose') ||
    (q.includes('suggest') && q.includes('time')) ||
    (q.includes('schedule') && q.includes('slot'))
  ) {
    const slots = findFreeSlots(events, 60, 3)
    const proposal = formatProposalEmail(slots, 'our meeting')
    return `**Smart propose** — here are open slots on your calendar:\n\n${slots.map((s, i) => `${i + 1}. ${s.label}`).join('\n') || '_No free slots in the next two weeks._'}\n\n**Draft email:**\n\n---\n\n**Subject:** ${proposal.subject}\n\n${proposal.body}\n\n---\n\n_Open compose to send, or ask me to propose times for a specific meeting._`
  }

  if (q.includes('conflict') && (q.includes('calendar') || q.includes('meeting') || q.includes('today'))) {
    const today = new Date()
    const todayEvents = events.filter((e) => {
      const d = new Date(e.start)
      return d.toDateString() === today.toDateString()
    })
    if (todayEvents.length <= 1) {
      return todayEvents.length === 0
        ? 'No meetings on your calendar today — no conflicts.'
        : `You have one meeting today: **${todayEvents[0].title}**. No conflicts.`
    }
    const conflicts: string[] = []
    for (let i = 0; i < todayEvents.length; i++) {
      for (let j = i + 1; j < todayEvents.length; j++) {
        const a = todayEvents[i]
        const b = todayEvents[j]
        if (hasConflict([a], b.start, b.end)) {
          conflicts.push(`**${a.title}** overlaps **${b.title}**`)
        }
      }
    }
    return conflicts.length > 0
      ? `**Conflicts today:**\n\n${conflicts.map((c) => `- ${c}`).join('\n')}`
      : `You have ${todayEvents.length} meetings today with no overlaps.`
  }

  if (
    q.includes('follow') ||
    (q.includes('need') && q.includes('reply')) ||
    q.includes('waiting')
  ) {
    const hints = detectFollowUps(emails)
    if (hints.length === 0) {
      return 'No emails flagged for follow-up right now. Your inbox looks caught up!'
    }
    return `**${hints.length} email${hints.length === 1 ? '' : 's'} needing follow-up:**\n\n${hints
      .slice(0, 6)
      .map(
        (h, i) =>
          `${i + 1}. **${h.subject}** — ${h.fromName} (${h.label}, ${h.severity})`,
      )
      .join('\n')}\n\n_Enable **Needs follow-up** in the inbox toolbar to filter these._`
  }

  if (q.includes('how') && (q.includes('link') || q.includes('connect'))) {
    return `To link an email to a note in EtherMail:

1. Open the **Email** view and select a message
2. Click **Link to Note** in the action menu (or use the command bar: \`Link email to note\`)
3. Choose an existing note or create a new one

The link appears in the **Knowledge Graph** as a \`references\` edge between the email and note nodes. Linked items also show in the mini-graph panel when viewing either item.`
  }

  if (q.includes('summarize') || q.includes('summary')) {
    const ctxResults = retrieveContext('q3 marketing strategy project athena', notes, emails, 3)
    if (ctxResults.length === 0) {
      return "I couldn't find relevant content to summarize. Try asking about Q3 Marketing Strategy, Research Notes, or Project Athena emails."
    }
    const parts = ctxResults.map((c) => `**${c.title}**: ${c.excerpt}`)
    return `Here's a summary based on your vault and inbox:\n\n${parts.join('\n\n')}\n\n*Sources: ${ctxResults.map((c) => c.title).join(', ')}*`
  }

  if (q.includes('draft') && q.includes('reply')) {
    const email = emails.find((e) => e.fromName.includes('Sarah')) ?? emails[0]
    const note = notes.find((n) => n.id === email?.linkedNoteId)
    return `**Draft reply** to ${email?.fromName} re: "${email?.subject}":

---

Hi Sarah,

Thank you for the update. I've reviewed the ${note?.title ?? 'linked notes'} and have a few thoughts:

1. The competitive positioning looks strong — especially our unified vault + email angle
2. I'm aligned on the +40% pipeline target for Q3
3. I'll have feedback on the strategy doc by Friday

Looking forward to Monday's Project Sync.

Best regards

---

*Draft generated from vault context: ${note?.title ?? 'no linked note'}, Research Notes, Q3 Marketing Strategy*`
  }

  if (q.includes('similar') || q.includes('find')) {
    const ctxResults = retrieveContext(query, notes, emails, 4)
    if (ctxResults.length === 0) return 'No similar notes or emails found in your vault.'
    return `**Similar items in your vault:**\n\n${ctxResults.map((c, i) => `${i + 1}. **${c.title}** (${c.type}) — ${c.excerpt.slice(0, 100)}...`).join('\n')}`
  }

  if (q.includes('reminder') || q.includes('expense')) {
    const expense = emails.find((e) => e.subject.toLowerCase().includes('expense'))
    const budget = notes.find((n) => n.title === 'Budget Q4')
    return `**Reminder scan results:**

- **${expense?.subject}** from ${expense?.fromName} — due June 30
- Linked note: **${budget?.title}** (${budget?.tags.join(', ')})

Suggested actions:
- Create task: "Submit Q2 expenses"
- Open linked [[Budget Q4]] note for reference`
  }

  const ctxResults = retrieveContext(query, notes, emails, 3)
  if (ctxResults.length > 0) {
    return `Based on your vault and inbox, here's what I found:\n\n${ctxResults.map((c) => `**${c.title}** (${c.type}): ${c.excerpt}`).join('\n\n')}\n\nAsk me to summarize, draft a reply, prep for a meeting, detect follow-ups, or propose meeting times.`
  }

  return `I'm your **EtherMail Vault AI** — I have access to your notes, emails, links, and tags. I don't share this data with external AI unless you enable Bridge mode.

Try:
- "Prep for my next meeting"
- "Show emails needing follow-up"
- "Propose meeting times"
- "Summarize Q3 Plan"
- "Draft reply to Sarah"
- "Any conflicts today?"`
}

export async function generateExternalAIResponse(
  query: string,
  apiKey: string,
  provider: string,
  bridgeEnabled = false,
  notes: Note[] = [],
  emails: Email[] = [],
  calendarEvents: CalendarEvent[] = [],
): Promise<string> {
  if (!apiKey.trim()) {
    return `**External AI** requires an API key. Go to **Settings** to add your ${provider} key.

External AI has **no access** to your vault or inbox. It can only answer general questions with the context you explicitly provide.`
  }

  let effectiveQuery = query
  let bridgeNote = ''

  if (bridgeEnabled) {
    const packet = buildContextPacket(query, notes, emails, calendarEvents)
    if (packet.excerpts.length > 0) {
      effectiveQuery = formatPacketForExternal(query, packet)
      bridgeNote = `\n\n---\n*Bridge mode: attached ${packet.excerpts.length} curated vault excerpt(s) (${packet.charCount} chars). External AI received only this packet — not your full vault.*`
    } else {
      bridgeNote =
        '\n\n---\n*Bridge mode is on but no vault excerpts matched this query. External AI answered from your message only.*'
    }
  }

  return `**[External AI — ${provider}]** (demo mode)

Your API key is configured. In production, this would call the ${provider} API with **only** the text you typed${bridgeEnabled ? ' plus the Bridge context packet below' : ''} — no full vault access.

---

Regarding: "${query}"

${bridgeEnabled && effectiveQuery !== query ? `**Bridge context packet sent:**\n\`\`\`\n${effectiveQuery.slice(0, 1200)}${effectiveQuery.length > 1200 ? '\n…' : ''}\n\`\`\`\n\n**Simulated response:**\n` : ''}This is a simulated response for the GitHub Pages demo. When connected to a real API, external AI would answer using general knowledge${bridgeEnabled ? ' enriched by the curated vault excerpts you approved via Bridge mode' : ''}.

${bridgeEnabled ? '' : 'To combine vault context with external AI, enable **Bridge mode** in Settings.'}${bridgeNote}`
}
