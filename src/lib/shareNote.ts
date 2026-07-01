import type { Note } from '../types'
import { noteAsMarkdown } from './markdownWiki'
import { downloadNoteHtml, printNoteAsPdf, shareNoteHtmlFile } from './markdownExport'

export type ShareResult =
  | 'pdf'
  | 'shared'
  | 'copied'
  | 'downloaded'
  | 'cancelled'
  | 'failed'

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

/** Export formatted note as PDF via the browser print dialog */
export function exportNotePdf(note: Pick<Note, 'title' | 'content'>): ShareResult {
  const ok = printNoteAsPdf(note)
  return ok ? 'pdf' : 'failed'
}

/** Share formatted HTML (preserves headings, links, lists, images) */
export async function shareNote(note: Pick<Note, 'title' | 'content'>): Promise<ShareResult> {
  const shared = await shareNoteHtmlFile(note)
  if (shared) return 'shared'

  const pdfOk = printNoteAsPdf(note)
  if (pdfOk) return 'pdf'

  try {
    downloadNoteHtml(note)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

/** Copy note markdown to clipboard */
export async function copyNoteMarkdown(note: Pick<Note, 'title' | 'content'>): Promise<ShareResult> {
  const text = noteAsMarkdown(note)
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
    case 'pdf':
      return 'Print / Save as PDF'
    case 'shared':
      return 'Note shared'
    case 'copied':
      return 'Copied to clipboard'
    case 'downloaded':
      return 'Downloaded formatted HTML'
    case 'cancelled':
      return ''
    default:
      return 'Could not export note'
  }
}
