import { useRef, useState } from 'react'
import { Trash2, Star, Link2, Paperclip, CheckCircle2, MessagesSquare } from 'lucide-react'
import type { EmailAccount, EmailJunkCategory, EmailLabel } from '../types'
import { AccountDot } from './AccountDot'
import { formatDate } from '../lib/utils'
import { CategoryBadge } from './AIInboxBar'
import { EmailLabelChip } from './EmailLabelsBar'
import type { EmailThread } from '../lib/emailThreads'

interface Props {
  thread: EmailThread
  account: EmailAccount | undefined
  active: boolean
  onSelect: () => void
  onDelete: () => void
  category?: EmailJunkCategory
  showCategory?: boolean
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  labels?: EmailLabel[]
}

export function EmailThreadRow({
  thread,
  account,
  active,
  onSelect,
  onDelete,
  category,
  showCategory,
  selectionMode,
  selected,
  onToggleSelect,
  labels = [],
}: Props) {
  const email = thread.latest
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const threshold = 80
  const deleteWidth = 72
  const multi = thread.emails.length > 1

  const reset = () => {
    setDragging(false)
    setOffset(0)
  }

  const showDelete = offset < -8

  return (
    <div className="relative overflow-hidden border-b border-[var(--glass-border)]">
      {showDelete && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500/90 text-white transition-opacity"
          style={{ width: deleteWidth, opacity: Math.min(1, Math.abs(offset) / deleteWidth) }}
        >
          <Trash2 size={18} />
        </div>
      )}

      <div
        className={`relative hover-theme transition-colors ${
          active ? 'bg-accent-soft' : 'bg-[var(--glass-bg)]'
        }`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          startX.current = e.clientX
          setDragging(true)
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!dragging) return
          const dx = e.clientX - startX.current
          setOffset(Math.min(0, Math.max(dx, -deleteWidth - 20)))
        }}
        onPointerUp={(e) => {
          if (!dragging) return
          try {
            ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
          } catch {
            /* released */
          }
          if (offset < -threshold) onDelete()
          reset()
        }}
        onPointerCancel={reset}
      >
        <button
          type="button"
          onClick={selectionMode ? onToggleSelect : onSelect}
          className="w-full text-left p-2.5"
        >
          <div className="flex items-center gap-2 mb-1">
            {selectionMode && (
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded border-[var(--glass-border)] accent-[var(--accent)]"
                aria-label={`Select thread ${thread.subject}`}
              />
            )}
            {multi ? (
              <MessagesSquare size={14} className="text-accent shrink-0" />
            ) : (
              <AccountDot account={account} />
            )}
            {thread.unreadCount > 0 && (
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
            )}
            <span className="text-sm font-medium text-theme truncate flex-1">
              {multi
                ? thread.participantNames.slice(0, 2).join(', ') +
                  (thread.participantNames.length > 2
                    ? ` +${thread.participantNames.length - 2}`
                    : '')
                : email.fromName}
            </span>
            {multi && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-soft text-accent font-medium shrink-0">
                {thread.emails.length}
              </span>
            )}
            {email.starred && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
            {email.linkedNoteId && <Link2 size={12} className="text-accent shrink-0" />}
            {email.attachmentIds && email.attachmentIds.length > 0 && (
              <Paperclip size={12} className="text-theme-muted shrink-0" />
            )}
            {(email.acknowledgements?.length ?? 0) > 0 && (
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" aria-label="Acknowledged" />
            )}
            <span className="text-xs text-theme-muted shrink-0">{formatDate(email.date)}</span>
          </div>
          <p
            className={`text-sm truncate pl-4 ${thread.unreadCount > 0 ? 'text-theme-secondary font-medium' : 'text-theme-muted'}`}
          >
            {thread.subject}
          </p>
          <div className="flex items-center gap-1.5 pl-4 mt-0.5 flex-wrap">
            <p className="text-xs text-theme-muted truncate flex-1 min-w-0">{email.preview}</p>
            {labels.slice(0, 2).map((label) => (
              <EmailLabelChip key={label.id} label={label} />
            ))}
            {showCategory && category && category !== 'important' && (
              <CategoryBadge category={category} />
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
