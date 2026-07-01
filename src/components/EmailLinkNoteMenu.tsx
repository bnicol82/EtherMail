import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Link2, Paperclip, Unlink } from 'lucide-react'
import type { Note } from '../types'

interface Props {
  notes: Note[]
  linkedNote: Note | null | undefined
  onLink: (noteId: string | null) => void
}

export function EmailLinkNoteMenu({ notes, linkedNote, onLink }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
        aria-expanded={open}
      >
        <Link2 size={14} />
        {linkedNote ? 'Change Link' : 'Link to Note'}
        <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 sm:right-auto sm:left-0 mt-1 z-50 min-w-[14rem] max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-[var(--glass-border)] bg-[var(--bottom-bar-bg)] backdrop-blur-xl shadow-2xl p-1.5 max-h-[min(50vh,16rem)] overflow-y-auto"
          role="menu"
        >
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onLink(n.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm hover-theme text-theme-secondary ${
                linkedNote?.id === n.id ? 'bg-[var(--active-bg)] text-theme' : ''
              }`}
            >
              <Paperclip size={12} className="inline mr-2 text-accent" />
              {n.title}
            </button>
          ))}
          {linkedNote && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onLink(null)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover-theme text-red-400 flex items-center gap-2 border-t border-[var(--glass-border)] mt-1 pt-2"
            >
              <Unlink size={12} /> Remove link
            </button>
          )}
        </div>
      )}
    </div>
  )
}
