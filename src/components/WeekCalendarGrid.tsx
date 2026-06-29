import type { CalendarEvent } from '../types'
import { isSameDay } from '../lib/utils'

export const EVENT_COLORS = ['#6366f1', '#22d3ee', '#f472b6', '#a78bfa', '#34d399']

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day))
}

export function EventChip({
  event,
  color,
  className = '',
  onSelect,
}: {
  event: CalendarEvent
  color: string
  className?: string
  onSelect: (event: CalendarEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect(event)
      }}
      className={`text-left rounded truncate text-theme hover:opacity-90 ${className}`}
      style={{
        background: `${color}33`,
        borderLeft: `2px solid ${color}`,
      }}
      title={event.title}
    >
      {event.title}
    </button>
  )
}

interface WeekCalendarGridProps {
  weekDays: Date[]
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
  today?: Date
  className?: string
  swipeProps?: React.HTMLAttributes<HTMLDivElement>
  swipeStyle?: React.CSSProperties
}

export function WeekCalendarGrid({
  weekDays,
  events,
  onSelectEvent,
  today = new Date(),
  className = '',
  swipeProps,
  swipeStyle,
}: WeekCalendarGridProps) {
  return (
    <div className={`overflow-hidden ${className}`} {...swipeProps}>
      <div
        className="grid grid-cols-7 gap-2 min-w-0"
        style={swipeStyle}
      >
        {weekDays.map((day) => {
          const dayEvents = eventsForDay(events, day)
          const isToday = isSameDay(day, today)
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] rounded-lg p-2 ${
                isToday ? 'bg-accent-soft border border-accent' : 'glass'
              }`}
            >
              <p className="text-[10px] text-theme-muted uppercase mb-1">
                {day.toLocaleDateString([], { weekday: 'short' })}
              </p>
              <p className={`text-sm font-semibold mb-2 ${isToday ? 'text-accent' : 'text-theme'}`}>
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayEvents.map((e, idx) => (
                  <EventChip
                    key={e.id}
                    event={e}
                    color={EVENT_COLORS[idx % EVENT_COLORS.length]}
                    className="text-[10px] p-1 block w-full"
                    onSelect={onSelectEvent}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
