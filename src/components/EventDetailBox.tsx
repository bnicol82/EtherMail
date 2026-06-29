import { X, Users, Calendar, Clock } from 'lucide-react'
import type { CalendarEvent } from '../types'
import { formatEventTimeRange } from '../lib/utils'

interface Props {
  event: CalendarEvent
  color: string
  onClose: () => void
}

export function EventDetailBox({ event, color, onClose }: Props) {
  const start = new Date(event.start)
  const end = new Date(event.end)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 pt-6 pb-28 sm:pb-6 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div
        className="glass-frost rounded-xl w-full max-w-md max-h-[min(85vh,32rem)] shadow-2xl border border-[var(--glass-border)] overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5" style={{ background: color }} />
        <div className="p-5 overflow-y-auto min-h-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 id="event-detail-title" className="text-lg font-semibold text-theme">
              {event.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover-theme text-theme-muted shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 text-theme-secondary">
              <Calendar size={16} className="text-accent shrink-0 mt-0.5" />
              <span>
                {start.toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-start gap-2 text-theme-secondary">
              <Clock size={16} className="text-accent shrink-0 mt-0.5" />
              <span>{formatEventTimeRange(event.start, event.end)}</span>
            </div>
            <p className="text-xs text-theme-muted">
              Duration: {Math.round((end.getTime() - start.getTime()) / 60000)} minutes
            </p>
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-2 text-theme-secondary">
                <Users size={16} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-theme-muted mb-1">Attendees</p>
                  <p>{event.attendees.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-xl btn-accent text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
