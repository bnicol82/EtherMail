import { useEffect, useRef, useState } from 'react'
import { Share2, Check, FileText, Copy, Printer } from 'lucide-react'
import type { Note } from '../types'
import {
  copyNoteMarkdown,
  exportNotePdf,
  shareNote,
  shareResultMessage,
  type ShareResult,
} from '../lib/shareNote'
import { downloadNoteHtml } from '../lib/markdownExport'

interface Props {
  note: Pick<Note, 'title' | 'content'>
  className?: string
}

export function ShareNoteButton({ note, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const run = async (action: () => Promise<ShareResult> | ShareResult) => {
    setLoading(true)
    const result = await action()
    const msg = shareResultMessage(result)
    setLoading(false)
    setOpen(false)
    if (msg) {
      setFeedback(msg)
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        title="Export note"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme disabled:opacity-50"
      >
        {feedback ? (
          <>
            <Check size={14} className="text-emerald-400" />
            <span className="text-emerald-400 text-[10px] sm:text-xs">{feedback}</span>
          </>
        ) : (
          <>
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </>
        )}
      </button>

      {open && !feedback && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[10.5rem] glass-frost rounded-xl border border-[var(--glass-border)] shadow-xl p-1.5">
          <button
            type="button"
            onClick={() => run(() => exportNotePdf(note))}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left"
          >
            <Printer size={14} className="text-accent shrink-0" />
            Save as PDF
          </button>
          <button
            type="button"
            onClick={() => run(() => shareNote(note))}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left"
          >
            <Share2 size={14} className="text-accent shrink-0" />
            Share formatted
          </button>
          <button
            type="button"
            onClick={() => run(() => copyNoteMarkdown(note))}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left"
          >
            <Copy size={14} className="text-accent shrink-0" />
            Copy markdown
          </button>
          <button
            type="button"
            onClick={() => run(() => {
              downloadNoteHtml(note)
              return 'downloaded'
            })}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left"
          >
            <FileText size={14} className="text-accent shrink-0" />
            Download HTML
          </button>
        </div>
      )}
    </div>
  )
}
