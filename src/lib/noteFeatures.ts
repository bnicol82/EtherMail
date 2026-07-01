import type { Email, Note } from '../types'
import { extractWikiLinks } from './utils'
import { completeNoteTodo } from './todos'
import { TEMPLATES_FOLDER_ID } from './emailTemplates'

export interface WikiLinkRef {
  title: string
  alias?: string
  note: Note | null
  unresolved: boolean
}

export interface TocEntry {
  level: number
  text: string
  slug: string
}

export interface NoteTodoItem {
  lineIndex: number
  text: string
  done: boolean
}

export interface NoteProperties {
  [key: string]: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const EMBED_RE = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
const CALLOUT_LINE_RE = /^>\s*\[!(\w+)\]\s*(.*)$/i

export function dailyNoteTitle(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function dailyNoteId(date = new Date()): string {
  return `daily-${dailyNoteTitle(date)}`
}

export function findDailyNote(notes: Note[], date = new Date(), vaultId?: string): Note | null {
  const title = dailyNoteTitle(date)
  return (
    notes.find(
      (n) =>
        n.title === title &&
        (!vaultId || n.vaultId === vaultId) &&
        (n.folderId === 'daily' || n.id.startsWith('daily-')),
    ) ?? null
  )
}

export function dailyNoteTemplate(date = new Date()): { title: string; content: string; tags: string[] } {
  const title = dailyNoteTitle(date)
  const heading = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return {
    title,
    tags: ['daily'],
    content: `---
type: daily
date: ${title}
---

# ${heading}

## Focus
- 

## Log

`,
  }
}

export function getTemplateNotes(notes: Note[], vaultId?: string): Note[] {
  return notes.filter(
    (n) => n.folderId === TEMPLATES_FOLDER_ID && (!vaultId || n.vaultId === vaultId),
  )
}

export function parseFrontmatter(content: string): { properties: NoteProperties; body: string } {
  const match = content.match(FRONTMATTER_RE)
  if (!match) return { properties: {}, body: content }

  const properties: NoteProperties = {}
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colon = trimmed.indexOf(':')
    if (colon < 0) continue
    const key = trimmed.slice(0, colon).trim()
    let value = trimmed.slice(colon + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
        .join(', ')
    }
    properties[key] = value
  }

  return { properties, body: content.slice(match[0].length) }
}

export function stripFrontmatter(content: string): string {
  return parseFrontmatter(content).body
}

export function setFrontmatterProperty(content: string, key: string, value: string): string {
  const { properties, body } = parseFrontmatter(content)
  if (value.trim()) properties[key] = value.trim()
  else delete properties[key]

  const lines = Object.entries(properties).map(([k, v]) => `${k}: ${v}`)
  if (lines.length === 0) return body.trimStart()
  return `---\n${lines.join('\n')}\n---\n\n${body.trimStart()}`
}

export function syncTagsToFrontmatter(content: string, tags: string[]): string {
  const { properties, body } = parseFrontmatter(content)
  if (tags.length > 0) properties.tags = tags.join(', ')
  else delete properties.tags
  const lines = Object.entries(properties).map(([k, v]) => `${k}: ${v}`)
  if (lines.length === 0) return body.trimStart()
  return `---\n${lines.join('\n')}\n---\n\n${body.trimStart()}`
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function getNoteToc(content: string): TocEntry[] {
  const body = stripFrontmatter(content)
  const entries: TocEntry[] = []
  for (const line of body.split('\n')) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (!match) continue
    const text = match[2].replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').trim()
    entries.push({
      level: match[1].length,
      text,
      slug: slugifyHeading(text),
    })
  }
  return entries
}

export function getOutgoingLinks(note: Note, allNotes: Note[]): WikiLinkRef[] {
  const titles = extractWikiLinks(note.content)
  const seen = new Set<string>()
  const refs: WikiLinkRef[] = []

  for (const raw of titles) {
    const [title, alias] = raw.split('|').map((s) => s.trim())
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const resolved =
      allNotes.find((n) => n.title.toLowerCase() === key) ??
      allNotes.find((n) => n.id === title) ??
      null
    refs.push({
      title,
      alias: alias !== title ? alias : undefined,
      note: resolved,
      unresolved: !resolved,
    })
  }
  return refs
}

export function getLinkedEmails(noteId: string, emails: Email[]): Email[] {
  return emails
    .filter((e) => e.linkedNoteId === noteId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

const NOTE_TODO_RE = /^- \[( |x|X)\] (.+)$/

export function getNoteTodos(note: Note): NoteTodoItem[] {
  const items: NoteTodoItem[] = []
  const body = stripFrontmatter(note.content)
  let checkboxIndex = 0
  for (const line of body.split('\n')) {
    const match = line.match(NOTE_TODO_RE)
    if (!match) continue
    items.push({
      lineIndex: checkboxIndex,
      text: match[2].trim(),
      done: match[1].toLowerCase() === 'x',
    })
    checkboxIndex += 1
  }
  return items
}

export function toggleNoteTodo(note: Note, lineIndex: number): string {
  if (getNoteTodos(note).find((t) => t.lineIndex === lineIndex)?.done) {
    return note.content
  }
  return completeNoteTodo(note, lineIndex)
}

export function noteToComposeBody(note: Note): { subject: string; body: string } {
  const { body } = parseFrontmatter(note.content)
  const plain = body
    .replace(/^#+\s+/gm, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, title: string, alias?: string) => alias ?? title)
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '[image]')
    .trim()
  return {
    subject: note.title,
    body: plain,
  }
}

export function preprocessEmbeds(content: string): string {
  return content.replace(EMBED_RE, (_match, rawTitle: string, alias?: string) => {
    const title = rawTitle.trim()
    const label = (alias ?? title).trim()
    return `\n\n[📎 ${label}](embed:${encodeURIComponent(title)})\n\n`
  })
}

const CALLOUT_ICONS: Record<string, string> = {
  note: '📝',
  tip: '💡',
  warning: '⚠️',
  info: 'ℹ️',
}

export function preprocessCallouts(content: string): string {
  const lines = content.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const callout = lines[i].match(CALLOUT_LINE_RE)
    if (!callout) {
      out.push(lines[i])
      i += 1
      continue
    }

    const type = callout[1].toLowerCase()
    const title = callout[2].trim()
    const block: string[] = []
    i += 1
    while (i < lines.length && lines[i].startsWith('>')) {
      block.push(lines[i].replace(/^>\s?/, ''))
      i += 1
    }

    const icon = CALLOUT_ICONS[type] ?? '📝'
    const header = title ? `${icon} **${type}** · ${title}` : `${icon} **${type}**`
    out.push(`> ${header}`)
    if (block.length > 0) {
      out.push('>')
      for (const line of block) {
        out.push(`> ${line}`)
      }
    }
  }

  return out.join('\n')
}

export function preprocessNoteMarkdown(content: string): string {
  let next = stripFrontmatter(content)
  next = preprocessEmbeds(next)
  next = preprocessCallouts(next)
  return next
}
