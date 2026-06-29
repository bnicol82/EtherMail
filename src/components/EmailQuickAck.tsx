import { CheckCircle2 } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { Email } from '../types'
import { QUICK_ACK_EMOJIS, QUICK_ACK_PRESETS, ackStatusColor } from '../lib/quickAck'
import { formatDate } from '../lib/utils'

interface Props {
  email: Email
}

export function EmailQuickAck({ email }: Props) {
  const sendQuickAck = useEtherMailStore((s) => s.sendQuickAck)
  const folder = email.folder ?? 'inbox'
  const isIncoming = folder === 'inbox' || folder === 'archive'
  const acks = email.acknowledgements ?? []

  return (
    <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
      {acks.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-theme-muted mb-2 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            Acknowledgements
          </p>
          <div className="flex flex-wrap gap-2">
            {acks.map((ack) => (
              <span
                key={ack.id}
                className={`text-xs px-2.5 py-1 rounded-full glass ${ackStatusColor(ack.status)}`}
                title={formatDate(ack.timestamp)}
              >
                {ack.emoji ? (
                  <span className="text-base leading-none">{ack.emoji}</span>
                ) : (
                  ack.label
                )}
                <span className="text-theme-muted ml-1">· {ack.fromName}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {isIncoming && (
        <div>
          <p className="text-xs font-medium text-theme-muted mb-2">Quick reply</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_ACK_PRESETS.map((preset) => (
              <button
                key={preset.status}
                type="button"
                onClick={() =>
                  sendQuickAck(email.id, {
                    status: preset.status,
                    label: preset.label,
                    message: preset.message,
                  })
                }
                className="text-xs px-2.5 py-1.5 rounded-full glass hover-theme text-theme-secondary"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_ACK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() =>
                  sendQuickAck(email.id, {
                    status: 'emoji',
                    label: emoji,
                    emoji,
                    message: emoji,
                  })
                }
                className="text-lg w-9 h-9 rounded-lg glass hover-theme flex items-center justify-center"
                aria-label={`Reply with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
