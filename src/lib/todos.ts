import type { Email, Note } from '../types'

export interface TodoItem {
  id: string
  text: string
  source: 'note' | 'email'
  sourceId: string
  sourceLabel: string
}

const NOTE_TODO_RE = /^- \[ \] (.+)$/gm

const EMAIL_ACTION_RE =
  /\b(reminder|invitation|action required|follow[- ]?up|deadline|please (review|submit|respond|reply|confirm)|can you|need your)\b/i

function todosFromNotes(notes: Note[]): TodoItem[] {
  const items: TodoItem[] = []
  for (const note of notes) {
    let match: RegExpExecArray | null
    NOTE_TODO_RE.lastIndex = 0
    while ((match = NOTE_TODO_RE.exec(note.content)) !== null) {
      const text = match[1].trim()
      if (!text) continue
      items.push({
        id: `note-${note.id}-${items.length}`,
        text,
        source: 'note',
        sourceId: note.id,
        sourceLabel: note.title,
      })
    }
  }
  return items
}

function todosFromEmails(emails: Email[]): TodoItem[] {
  const items: TodoItem[] = []
  const inbox = emails.filter((e) => (e.folder ?? 'inbox') === 'inbox' && e.folder !== 'trash')

  for (const email of inbox) {
    const actionable =
      !email.read ||
      email.starred ||
      EMAIL_ACTION_RE.test(email.subject) ||
      EMAIL_ACTION_RE.test(email.preview) ||
      EMAIL_ACTION_RE.test(email.body)

    if (!actionable) continue

    items.push({
      id: `email-${email.id}`,
      text: email.subject,
      source: 'email',
      sourceId: email.id,
      sourceLabel: email.fromName,
    })
  }

  return items
}

/** Collect open action items from note checkboxes and actionable emails. */
export function extractTodos(notes: Note[], emails: Email[], limit = 8): TodoItem[] {
  const combined = [...todosFromNotes(notes), ...todosFromEmails(emails)]
  return combined.slice(0, limit)
}
