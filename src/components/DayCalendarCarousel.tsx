import { useEffect, useMemo, useRef } from 'react'
import type { CalendarEvent } from '../types'
import { addDays, isSameDay, startOfDay } from '../lib/utils'
import { useSnapScrollFeedback } from '../hooks/useSnapScrollFeedback'
import { EventChip, EVENT_COLORS, eventsForDay } from './WeekCalendarGrid'

const TOTAL_DAYS = 731
const CENTER_INDEX = Math.floor(TOTAL_DAYS / 2)

interface Props {
  focusDay: Date
  events: CalendarEvent[]
  today: Date
  onSelectEvent: (event: CalendarEvent) => void
  onFocusDayChange: (day: Date) => void
  scrollRef?: React.RefObject<HTMLDivElement | null>
}

export function dayKey(day: Date): string {
  return startOfDay(day).toISOString().slice(0, 10)
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return startOfDay(new Date(y, m - 1, d))
}

export function DayCalendarCarousel({
  focusDay,
  events,
  today,
  onSelectEvent,
  onFocusDayChange,
  scrollRef: externalScrollRef,
}: Props) {
  const internalRef = useRef<HTMLDivElement>(null)
  const scrollRef = externalScrollRef ?? internalRef
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const anchorDay = useRef(startOfDay(today))
  const skipFeedback = useRef(false)

  const days = useMemo(
    () =>
      Array.from({ length: TOTAL_DAYS }, (_, i) =>
        addDays(anchorDay.current, i - CENTER_INDEX),
      ),
    [],
  )

  useEffect(() => {
    const key = dayKey(focusDay)
    const el = dayRefs.current.get(key)
    if (!el || !scrollRef.current) return
    skipFeedback.current = true
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    const t = window.setTimeout(() => {
      skipFeedback.current = false
    }, 400)
    return () => window.clearTimeout(t)
  }, [focusDay, scrollRef])

  useSnapScrollFeedback(
    scrollRef,
    true,
    '[data-day-key]',
    (el) => el.getAttribute('data-day-key') ?? '',
    (key) => {
      if (skipFeedback.current || !key) return
      const day = parseDayKey(key)
      if (!isSameDay(day, focusDay)) onFocusDayChange(day)
    },
    () => !skipFeedback.current,
  )

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ touchAction: 'pan-x pinch-zoom' }}
    >
      {days.map((day) => {
        const key = dayKey(day)
        const dayEvents = eventsForDay(events, day)
        const isToday = isSameDay(day, today)
        const isFocus = isSameDay(day, focusDay)
        return (
          <div
            key={key}
            ref={(node) => {
              if (node) dayRefs.current.set(key, node)
              else dayRefs.current.delete(key)
            }}
            data-day-key={key}
            className={`snap-center shrink-0 w-[min(88vw,300px)] min-h-[120px] rounded-lg p-3 transition-shadow ${
              isFocus ? 'ring-1 ring-[var(--accent-border)]' : ''
            } ${isToday ? 'bg-accent-soft border border-accent' : 'glass'}`}
          >
            <p className="text-[10px] text-theme-muted uppercase mb-1">
              {day.toLocaleDateString([], { weekday: 'long' })}
            </p>
            <p className={`text-lg font-semibold mb-2 ${isToday ? 'text-accent' : 'text-theme'}`}>
              {day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
              {dayEvents.length === 0 && (
                <p className="text-[10px] text-theme-muted">No events</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
