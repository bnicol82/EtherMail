import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Email, EmailAccount } from '../types'
import { AccountDot } from './AccountDot'
import { formatDate } from '../lib/utils'
import { Star, Link2, Paperclip } from 'lucide-react'

interface Props {
  email: Email
  account: EmailAccount | undefined
  active: boolean
  onSelect: () => void
  onDelete: () => void
}

export function SwipeableEmailRow({ email, account, active, onSelect, onDelete }: Props) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const threshold = 80
  const deleteWidth = 72

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
          if (offset < -threshold) {
            onDelete()
          }
          reset()
        }}
        onPointerCancel={reset}
      >
        <button
          type="button"
          onClick={onSelect}
          className="w-full text-left p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <AccountDot account={account} />
            {!email.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
            <span className="text-sm font-medium text-theme truncate flex-1">{email.fromName}</span>
            {email.starred && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
            {email.linkedNoteId && <Link2 size={12} className="text-accent shrink-0" />}
            {email.attachmentIds && email.attachmentIds.length > 0 && (
              <Paperclip size={12} className="text-theme-muted shrink-0" />
            )}
            <span className="text-xs text-theme-muted shrink-0">{formatDate(email.date)}</span>
          </div>
          <p className={`text-sm truncate pl-4 ${email.read ? 'text-theme-muted' : 'text-theme-secondary'}`}>
            {email.subject}
          </p>
          <p className="text-xs text-theme-muted truncate mt-0.5 pl-4">{email.preview}</p>
        </button>
      </div>
    </div>
  )
}
