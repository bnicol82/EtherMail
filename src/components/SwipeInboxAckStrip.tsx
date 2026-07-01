import type { AckStatus } from '../types'
import { INBOX_SWIPE_ACK_WIDTH } from '../hooks/useInboxSwipe'

const SWIPE_ACK_ACTIONS: {
  status: AckStatus
  label: string
  message?: string
  emoji?: string
  display: string
}[] = [
  { status: 'emoji', label: '👍', emoji: '👍', message: '👍', display: '👍' },
  { status: 'emoji', label: '✅', emoji: '✅', message: '✅', display: '✅' },
  { status: 'emoji', label: '👀', emoji: '👀', message: '👀', display: '👀' },
  { status: 'working', label: 'On it', message: "Thanks — I'm on it.", display: 'On it' },
]

interface Props {
  onAck: (ack: { status: AckStatus; label: string; message?: string; emoji?: string }) => void
  onDismiss: () => void
}

export function SwipeInboxAckStrip({ onAck, onDismiss }: Props) {
  return (
    <div
      className="absolute inset-y-0 left-0 flex items-center justify-around gap-0.5 px-1 bg-emerald-600/95 text-white"
      style={{ width: INBOX_SWIPE_ACK_WIDTH }}
    >
      {SWIPE_ACK_ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAck({
              status: action.status,
              label: action.label,
              message: action.message,
              emoji: action.emoji,
            })
            onDismiss()
          }}
          className={`flex items-center justify-center rounded-lg hover:bg-white/20 active:bg-white/30 ${
            action.emoji ? 'text-xl w-10 h-10' : 'text-[10px] font-semibold px-2 py-2 min-w-[2.5rem]'
          }`}
          aria-label={`Quick ack: ${action.label}`}
        >
          {action.display}
        </button>
      ))}
    </div>
  )
}
