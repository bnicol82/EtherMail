import { Trash2, Star, Link2, Paperclip, CheckCircle2, MessagesSquare } from 'lucide-react'
import type { EmailAccount, EmailJunkCategory, EmailLabel, AckStatus } from '../types'
import { AccountDot } from './AccountDot'
import { formatDate } from '../lib/utils'
import { CategoryBadge } from './AIInboxBar'
import { EmailLabelChip } from './EmailLabelsBar'
import type { EmailThread } from '../lib/emailThreads'
import { useInboxSwipe, INBOX_SWIPE_DELETE_WIDTH } from '../hooks/useInboxSwipe'
import { SwipeInboxAckStrip } from './SwipeInboxAckStrip'

interface Props {
  thread: EmailThread
  account: EmailAccount | undefined
  active: boolean
  onSelect: () => void
  onDelete: () => void
  onQuickAck?: (ack: { status: AckStatus; label: string; message?: string; emoji?: string }) => void
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
  onQuickAck,
  category,
  showCategory,
  selectionMode,
  selected,
  onToggleSelect,
  labels = [],
}: Props) {
  const email = thread.latest
  const multi = thread.emails.length > 1
  const folder = email.folder ?? 'inbox'
  const ackEnabled =
    !!onQuickAck && !selectionMode && (folder === 'inbox' || folder === 'archive')

  const { offset, dragging, snapped, handlers, dismissSnap, showDelete, showAck } = useInboxSwipe({
    onDelete,
    ackEnabled,
  })

  const handleRowClick = () => {
    if (snapped === 'ack') {
      dismissSnap()
      return
    }
    if (selectionMode) onToggleSelect?.()
    else onSelect()
  }

  return (
    <div className="relative overflow-hidden border-b border-[var(--glass-border)]">
      {showAck && onQuickAck && (
        <SwipeInboxAckStrip onAck={onQuickAck} onDismiss={dismissSnap} />
      )}

      {showDelete && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500/90 text-white transition-opacity"
          style={{
            width: INBOX_SWIPE_DELETE_WIDTH,
            opacity: Math.min(1, Math.abs(offset) / INBOX_SWIPE_DELETE_WIDTH),
          }}
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
        {...handlers}
      >
        <button type="button" onClick={handleRowClick} className="w-full text-left p-2.5">
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
          {ackEnabled && snapped === 'none' && (
            <p className="text-[9px] text-theme-muted/70 pl-4 mt-1 lg:hidden">Swipe right to ack · left to delete</p>
          )}
        </button>
      </div>
    </div>
  )
}
