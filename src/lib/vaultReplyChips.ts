import { retrieveContext } from './rag'
import type { Email, Note } from '../types'

export interface VaultReplyChip {
  noteId: string
  title: string
  reason: string
}

function parseWikiLinks(text: string): string[] {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim()).filter(Boolean)
}

function findNoteByTitle(notes: Note[], title: string): Note | undefined {
  const lower = title.toLowerCase()
  return notes.find((n) => n.title.toLowerCase() === lower)
}

/**
 * Surfaces vault notes relevant to the current compose context — linked mail,
 * wiki mentions, and lightweight RAG retrieval on subject/body.
 */
export function getVaultReplyChips(
  notes: Note[],
  emails: Email[],
  opts: {
    subject: string
    body: string
    contextEmailId?: string
    limit?: number
  },
): VaultReplyChip[] {
  const limit = opts.limit ?? 3
  const scored = new Map<string, VaultReplyChip & { score: number }>()

  const add = (note: Note, score: number, reason: string) => {
    const existing = scored.get(note.id)
    if (!existing || score > existing.score) {
      scored.set(note.id, { noteId: note.id, title: note.title, reason, score })
    }
  }

  const contextEmail = opts.contextEmailId
    ? emails.find((e) => e.id === opts.contextEmailId)
    : undefined

  if (contextEmail?.linkedNoteId) {
    const linked = notes.find((n) => n.id === contextEmail.linkedNoteId)
    if (linked) add(linked, 100, 'Linked to this email')
  }

  if (contextEmail) {
    for (const title of parseWikiLinks(contextEmail.body)) {
      const note = findNoteByTitle(notes, title)
      if (note) add(note, 80, 'Mentioned in email')
    }
  }

  const composeText = `${opts.subject}\n${opts.body}`
  for (const title of parseWikiLinks(composeText)) {
    const note = findNoteByTitle(notes, title)
    if (note) add(note, 60, 'In your draft')
  }

  const query = [opts.subject, contextEmail?.subject, contextEmail?.body?.slice(0, 400)]
    .filter(Boolean)
    .join(' ')
  for (const hit of retrieveContext(query, notes, emails, 5)) {
    if (hit.type !== 'note') continue
    const note = notes.find((n) => n.id === hit.id)
    if (note) add(note, 40 + hit.score, 'Related in vault')
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ noteId, title, reason }) => ({ noteId, title, reason }))
}
