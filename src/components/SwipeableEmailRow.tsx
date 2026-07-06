import { Trash2 } from 'lucide-react'
import type { Email, EmailAccount, AckStatus } from '../types'
import { AccountDot } from './AccountDot'
import { formatDate } from '../lib/utils'
import { Star, Link2, Paperclip, CheckCircle2, Clock } from 'lucide-react'
import { CategoryBadge } from './AIInboxBar'
import { EmailLabelChip } from './EmailLabelsBar'
import type { EmailJunkCategory, EmailLabel } from '../types'
import { formatScheduledAt } from '../lib/scheduledSend'
import { useInboxSwipe, INBOX_SWIPE_DELETE_WIDTH } from '../hooks/useInboxSwipe'
import { SwipeInboxAckStrip } from './SwipeInboxAckStrip'

interface Props {
  email: Email
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

export function SwipeableEmailRow({
  email,
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
        <button type="button" onClick={handleRowClick} className="email-list-row w-full text-left md:p-2.5">
          <div className="flex items-center gap-2 mb-1.5 md:mb-1">
            {selectionMode && (
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 w-5 h-5 md:w-4 md:h-4 rounded border-[var(--glass-border)] accent-[var(--accent)]"
                aria-label={`Select ${email.subject}`}
              />
            )}
            <AccountDot account={account} />
            {!email.read && <div className="w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
            <span className="email-sender md:text-sm md:font-medium text-theme truncate flex-1">{email.fromName}</span>
            {email.starred && <Star size={16} className="text-amber-400 fill-amber-400 shrink-0 md:w-3 md:h-3" />}
            {email.linkedNoteId && <Link2 size={16} className="text-accent shrink-0 md:w-3 md:h-3" />}
            {email.attachmentIds && email.attachmentIds.length > 0 && (
              <Paperclip size={16} className="text-theme-muted shrink-0 md:w-3 md:h-3" />
            )}
            {(email.acknowledgements?.length ?? 0) > 0 && (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 md:w-3 md:h-3" aria-label="Acknowledged" />
            )}
            <span className="text-sm md:text-xs text-theme-muted shrink-0">{formatDate(email.date)}</span>
          </div>
          <p className={`email-subject md:text-sm truncate pl-0 md:pl-4 ${email.read ? 'text-theme-muted font-normal' : 'text-theme font-semibold md:font-normal md:text-theme-secondary'}`}>
            {email.subject}
          </p>
          <div className="flex items-center gap-2 pl-0 md:pl-4 mt-1 md:mt-0.5 flex-wrap">
            <p className="email-preview md:text-xs text-theme-muted truncate flex-1 min-w-0">{email.preview}</p>
            {email.scheduledAt && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent-soft text-[9px] text-accent shrink-0">
                <Clock size={9} />
                {formatScheduledAt(email.scheduledAt)}
              </span>
            )}
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
