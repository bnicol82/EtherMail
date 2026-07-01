import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { StaticMarkdown } from '../components/StaticMarkdown'
import { noteAsMarkdown } from './markdownWiki'

const EXPORT_CSS = `
  :root {
    color-scheme: light;
    --text-primary: #0f172a;
    --text-secondary: #334155;
    --text-muted: #64748b;
    --accent: #2563eb;
    --glass-border: #e2e8f0;
  }
  * { box-sizing: border-box; }
  body {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    color: var(--text-primary);
    margin: 0;
    padding: 2rem;
    line-height: 1.6;
  }
  .export-header {
    border-bottom: 2px solid var(--accent);
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
  }
  .export-header h1 { margin: 0; font-size: 1.75rem; }
  .export-meta { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.35rem; }
  .markdown-body h1 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.75rem; }
  .markdown-body h2 { font-size: 1.25rem; font-weight: 600; margin: 1.1rem 0 0.6rem; }
  .markdown-body h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  .markdown-body p { margin: 0.6rem 0; color: var(--text-secondary); }
  .markdown-body ul, .markdown-body ol { margin: 0.5rem 0 0.75rem 1.25rem; color: var(--text-secondary); }
  .markdown-body li { margin: 0.25rem 0; }
  .markdown-body code {
    background: #f1f5f9;
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    font-size: 0.9em;
  }
  .markdown-body pre {
    background: #f8fafc;
    border: 1px solid var(--glass-border);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    overflow-x: auto;
  }
  .markdown-body a { color: var(--accent); text-decoration: underline; }
  .wiki-link {
    color: var(--accent);
    text-decoration: underline;
    font-weight: 500;
  }
  .note-inline-image {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    border: 1px solid var(--glass-border);
    margin: 0.75rem 0;
  }
  .markdown-body table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
  .markdown-body th, .markdown-body td {
    border: 1px solid var(--glass-border);
    padding: 0.4rem 0.6rem;
    text-align: left;
  }
  .markdown-body th { background: #f8fafc; }
  @media print {
    body { padding: 0.5in; }
    .export-meta { color: #64748b; }
  }
`

export function renderNoteBodyHtml(note: { title: string; content: string }): string {
  const markdown = noteAsMarkdown(note)
  return renderToStaticMarkup(createElement(StaticMarkdown, { content: markdown }))
}

export function buildNoteExportHtml(note: { title: string; content: string }): string {
  const body = renderNoteBodyHtml(note)
  const exported = new Date().toLocaleString()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(note.title)} — EtherMail</title>
  <style>${EXPORT_CSS}</style>
</head>
<body>
  <header class="export-header">
    <h1>${escapeHtml(note.title)}</h1>
    <p class="export-meta">Exported from EtherMail · ${escapeHtml(exported)}</p>
  </header>
  ${body}
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printNoteAsPdf(note: { title: string; content: string }): boolean {
  const html = buildNoteExportHtml(note)
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return false

  win.document.open()
  win.document.write(html)
  win.document.close()

  const triggerPrint = () => {
    win.focus()
    win.print()
  }

  if (win.document.readyState === 'complete') {
    setTimeout(triggerPrint, 250)
  } else {
    win.addEventListener('load', () => setTimeout(triggerPrint, 250))
  }

  return true
}

export function downloadNoteHtml(note: { title: string; content: string }): void {
  const html = buildNoteExportHtml(note)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(note.title)}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^\w\s-]/g, '').trim() || 'note'
}

export async function shareNoteHtmlFile(note: { title: string; content: string }): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  const html = buildNoteExportHtml(note)
  const file = new File([html], `${sanitizeFilename(note.title)}.html`, { type: 'text/html' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: note.title,
        text: note.title,
        files: [file],
      })
      return true
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return true
  }
  return false
}
