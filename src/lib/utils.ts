import type { Email, EmailAccount, Note } from '../types'

const ACCOUNT_COLORS: Record<string, string> = {
  'acc-gmail': '#ea4335',
  'acc-outlook': '#0078d4',
  'acc-yahoo': '#6001d2',
}

export function accountColor(account: EmailAccount | undefined): string {
  if (!account) return '#6366f1'
  return ACCOUNT_COLORS[account.id] ?? providerColor(account.provider)
}

export function accountShortLabel(account: EmailAccount): string {
  const local = account.email.split('@')[0]
  if (local.length <= 12) return local
  return `${local.slice(0, 10)}…`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function fileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('zip')) return '🗜️'
  if (mimeType.includes('calendar')) return '📅'
  if (mimeType.includes('image')) return '🖼️'
  return '📎'
}

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
