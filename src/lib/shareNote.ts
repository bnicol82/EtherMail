import type { Note } from '../types'

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed'

function noteAsMarkdown(note: Pick<Note, 'title' | 'content'>): string {
  const body = note.content.trim()
  if (body.startsWith('#')) return body
  return `# ${note.title}\n\n${body}`
}

function downloadMarkdown(note: Pick<Note, 'title' | 'content'>): void {
  const text = noteAsMarkdown(note)
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${note.title.replace(/[^\w\s-]/g, '').trim() || 'note'}.md`
  a.click()
  URL.revokeObjectURL(url)
}

/** Share a formatted note via Web Share API, clipboard, or download */
export async function shareNote(note: Pick<Note, 'title' | 'content'>): Promise<ShareResult> {
  const text = noteAsMarkdown(note)

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: note.title,
        text,
      })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      /* fall through */
    }
  }

  try {
    downloadMarkdown(note)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

export function shareResultMessage(result: ShareResult): string {
  switch (result) {
    case 'shared':
      return 'Note shared'
    case 'copied':
      return 'Copied to clipboard'
    case 'downloaded':
      return 'Downloaded as Markdown'
    case 'cancelled':
      return ''
    default:
      return 'Could not share note'
  }
}
