import type { Email, Note } from '../types'

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

export async function generateVaultAIResponse(
  query: string,
  notes: Note[],
  emails: Email[],
): Promise<string> {
  const q = query.toLowerCase()

  if (q.includes('how') && (q.includes('link') || q.includes('connect'))) {
    return `To link an email to a note in Nexus Core:

1. Open the **Email** view and select a message
2. Click **Link to Note** in the action menu (or use the command bar: \`Link email to note\`)
3. Choose an existing note or create a new one

The link appears in the **Knowledge Graph** as a \`references\` edge between the email and note nodes. Linked items also show in the mini-graph panel when viewing either item.`
  }

  if (q.includes('summarize') || q.includes('summary')) {
    const ctx = retrieveContext('q3 marketing strategy project athena', notes, emails, 3)
    if (ctx.length === 0) {
      return "I couldn't find relevant content to summarize. Try asking about Q3 Marketing Strategy, Research Notes, or Project Athena emails."
    }
    const parts = ctx.map((c) => `**${c.title}**: ${c.excerpt}`)
    return `Here's a summary based on your vault and inbox:\n\n${parts.join('\n\n')}\n\n*Sources: ${ctx.map((c) => c.title).join(', ')}*`
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
    const ctx = retrieveContext(query, notes, emails, 4)
    if (ctx.length === 0) return 'No similar notes or emails found in your vault.'
    return `**Similar items in your vault:**\n\n${ctx.map((c, i) => `${i + 1}. **${c.title}** (${c.type}) — ${c.excerpt.slice(0, 100)}...`).join('\n')}`
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

  const ctx = retrieveContext(query, notes, emails, 3)
  if (ctx.length > 0) {
    return `Based on your vault and inbox, here's what I found:\n\n${ctx.map((c) => `**${c.title}** (${c.type}): ${c.excerpt}`).join('\n\n')}\n\nAsk me to summarize, draft a reply, find similar notes, or explain how Nexus Core features work.`
  }

  return `I'm your **Vault AI** — I have access to your notes, emails, links, and tags. I don't share this data with external AI unless you enable Bridge mode.

Try:
- "Summarize Q3 Plan"
- "Draft reply to Sarah"
- "Find similar notes about budget"
- "Scan for reminders"
- "How do I link an email to a note?"`
}

export async function generateExternalAIResponse(
  query: string,
  apiKey: string,
  provider: string,
): Promise<string> {
  if (!apiKey.trim()) {
    return `**External AI** requires an API key. Go to **Settings** to add your ${provider} key.

External AI has **no access** to your vault or inbox. It can only answer general questions with the context you explicitly provide.`
  }

  // Phase 1: simulated external response (no real API calls on GitHub Pages demo)
  return `**[External AI — ${provider}]** (demo mode)

Your API key is configured. In production, this would call the ${provider} API with **only** the text you typed — no vault data.

---

Regarding: "${query}"

This is a simulated response for the GitHub Pages demo. When connected to a real API, external AI would answer general knowledge questions here without seeing your private notes or emails.

To combine vault context with external AI, enable **Bridge mode** in Settings (coming in Phase 3).`
}
