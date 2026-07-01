import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Email, Note } from '../types'
import { NoteSidebar } from './NoteSidebar'

interface Props {
  open: boolean
  onClose: () => void
  note: Note
  notes: Note[]
  emails: Email[]
  onSelectNote: (id: string) => void
  onSelectEmail: (id: string) => void
  onUpdateTags: (tags: string[]) => void
  onUpdateContent: (content: string) => void
  onComposeFromNote: () => void
  onMeetingPrepNote?: () => void
  onAiAction: (prompt: string) => void
}

/** Mobile bottom sheet for note metadata — tags, links, actions */
export function NoteDetailsSheet({
  open,
  onClose,
  note,
  notes,
  emails,
  onSelectNote,
  onSelectEmail,
  onUpdateTags,
  onUpdateContent,
  onComposeFromNote,
  onMeetingPrepNote,
  onAiAction,
}: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex flex-col justify-end md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-details-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close note details"
      />
      <div className="relative glass-frost rounded-t-2xl border-t border-[var(--glass-border)] shadow-2xl w-full max-h-[min(88dvh,680px)] min-h-[min(55dvh,420px)] flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)] shrink-0">
          <h3 id="note-details-title" className="text-sm font-semibold text-theme">
            Note details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover-theme text-theme-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
          <NoteSidebar
            compact
            note={note}
            notes={notes}
            emails={emails}
            onSelectNote={onSelectNote}
            onSelectEmail={onSelectEmail}
            onUpdateTags={onUpdateTags}
            onUpdateContent={onUpdateContent}
            onComposeFromNote={() => {
              onComposeFromNote()
              onClose()
            }}
            onMeetingPrepNote={onMeetingPrepNote}
            onAiAction={onAiAction}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
