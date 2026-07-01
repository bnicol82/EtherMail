import type { Note } from '../types'

export interface AutoLinkSuggestion {
  noteId: string
  title: string
  /** Plain text in the note body to wrap with a wiki link */
  matchText: string
  score: number
  reason: string
}

const LINKED_TITLE_RE = /\[\[([^\]]+)\]\]/g

function linkedTitles(content: string): Set<string> {
  const titles = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = LINKED_TITLE_RE.exec(content)) !== null) {
    titles.add(m[1].split('|')[0].toLowerCase())
  }
  return titles
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

function findMatchSpan(content: string, title: string): string | null {
  const lower = content.toLowerCase()
  const titleLower = title.toLowerCase()
  const exactIdx = lower.indexOf(titleLower)
  if (exactIdx >= 0) return content.slice(exactIdx, exactIdx + title.length)

  const parts = title.split(/\s+/).filter((p) => p.length > 2)
  for (let len = parts.length; len >= 1; len--) {
    for (let i = 0; i <= parts.length - len; i++) {
      const phrase = parts.slice(i, i + len).join(' ')
      if (phrase.length < 4) continue
      const idx = lower.indexOf(phrase.toLowerCase())
      if (idx >= 0) return content.slice(idx, idx + phrase.length)
    }
  }

  return null
}

export function getAutoLinkSuggestions(note: Note, allNotes: Note[]): AutoLinkSuggestion[] {
  const already = linkedTitles(note.content)
  const suggestions: AutoLinkSuggestion[] = []

  for (const candidate of allNotes) {
    if (candidate.id === note.id) continue
    if (note.vaultId && candidate.vaultId !== note.vaultId) continue
    if (already.has(candidate.title.toLowerCase())) continue

    const matchText = findMatchSpan(note.content, candidate.title)
    if (!matchText) continue

    const titleTokens = tokenize(candidate.title)
    const matchTokens = tokenize(matchText)
    const overlap = titleTokens.filter((t) => matchTokens.includes(t)).length
    const score = overlap / Math.max(titleTokens.length, 1)

    suggestions.push({
      noteId: candidate.id,
      title: candidate.title,
      matchText,
      score,
      reason: matchText.toLowerCase() === candidate.title.toLowerCase() ? 'Exact mention' : 'Related phrase',
    })
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 8)
}

export function applyWikiLink(content: string, title: string, matchText: string): string {
  if (content.includes(`[[${title}]]`)) return content

  const idx = content.toLowerCase().indexOf(matchText.toLowerCase())
  if (idx >= 0) {
    const before = content.slice(0, idx)
    const matched = content.slice(idx, idx + matchText.length)
    const after = content.slice(idx + matchText.length)
    return `${before}[[${title}|${matched}]]${after}`
  }

  return `${content.trimEnd()}\n\nRelated: [[${title}]]`
}

export function formatNoteHeadings(content: string): string {
  const lines = content.split('\n')
  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return line
      }
      if (trimmed.length < 60 && trimmed.endsWith(':')) {
        return `## ${trimmed.slice(0, -1)}`
      }
      if (/^[A-Z][^.!?]*$/.test(trimmed) && trimmed.split(/\s+/).length <= 8) {
        return `## ${trimmed}`
      }
      return line
    })
    .join('\n')
}

export function formatNoteBullets(content: string): string {
  const lines = content.split('\n')
  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        return trimmed.startsWith('-') || trimmed.startsWith('*') ? trimmed : `- ${trimmed.replace(/^\d+\.\s/, '')}`
      }
      if (trimmed.length > 0 && trimmed.length < 120 && !trimmed.startsWith('#')) {
        return `- ${trimmed}`
      }
      return line
    })
    .join('\n')
}

export function formatNoteStructure(content: string): string {
  let next = formatNoteHeadings(content)
  next = next.replace(/\n{3,}/g, '\n\n')
  if (!next.trimStart().startsWith('#')) {
    const firstLine = next.split('\n').find((l) => l.trim())
    if (firstLine && !firstLine.startsWith('#')) {
      next = `# ${firstLine.trim()}\n\n${next.replace(firstLine, '').trimStart()}`
    }
  }
  return next
}
