import type { Email, Note } from '../types'

export function searchVault(
  query: string,
  notes: Note[],
  emails: Email[],
): { notes: Note[]; emails: Email[] } {
  const q = query.toLowerCase().trim()
  if (!q) return { notes, emails }

  const matchNote = (n: Note) =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    n.tags.some((t) => t.toLowerCase().includes(q))

  const matchEmail = (e: Email) =>
    e.subject.toLowerCase().includes(q) ||
    e.body.toLowerCase().includes(q) ||
    e.fromName.toLowerCase().includes(q) ||
    e.preview.toLowerCase().includes(q)

  return {
    notes: notes.filter(matchNote),
    emails: emails.filter(matchEmail),
  }
}

export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g
  const links: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1])
  }
  return links
}

export function getBacklinks(noteTitle: string, notes: Note[]): Note[] {
  return notes.filter((n) => n.content.includes(`[[${noteTitle}]]`))
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (days < 7) {
    return d.toLocaleDateString([], { weekday: 'short' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    gmail: 'Gmail',
    outlook: 'Outlook',
    yahoo: 'Yahoo Mail',
    enterprise: 'Outlook Enterprise',
  }
  return map[provider] ?? provider
}

export function providerColor(provider: string): string {
  const map: Record<string, string> = {
    gmail: '#ea4335',
    outlook: '#0078d4',
    yahoo: '#6001d2',
    enterprise: '#0078d4',
  }
  return map[provider] ?? '#6366f1'
}
