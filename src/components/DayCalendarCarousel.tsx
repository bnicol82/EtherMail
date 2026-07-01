import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent } from '../types'
import { addDays, isSameDay, startOfDay } from '../lib/utils'
import { useSnapScrollFeedback } from '../hooks/useSnapScrollFeedback'
import { EventChip, EVENT_COLORS, eventsForDay } from './WeekCalendarGrid'

const TOTAL_DAYS = 731
const CENTER_INDEX = Math.floor(TOTAL_DAYS / 2)
const VISIBLE_DAYS = 7

interface Props {
  focusDay: Date
  events: CalendarEvent[]
  today: Date
  onSelectEvent: (event: CalendarEvent) => void
  onFocusDayChange: (day: Date) => void
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
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const anchorDay = useRef(startOfDay(today))
  const skipFeedback = useRef(false)
  const [colWidth, setColWidth] = useState(0)

  const days = useMemo(
    () =>
      Array.from({ length: TOTAL_DAYS }, (_, i) =>
        addDays(anchorDay.current, i - CENTER_INDEX),
      ),
    [],
  )

  const focusIndex = useMemo(
    () => days.findIndex((d) => isSameDay(d, focusDay)),
    [days, focusDay],
  )

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => setColWidth(el.clientWidth / VISIBLE_DAYS)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || colWidth <= 0 || focusIndex < 0) return
    skipFeedback.current = true
    scroller.scrollTo({ left: focusIndex * colWidth, behavior: 'smooth' })
    const t = window.setTimeout(() => {
      skipFeedback.current = false
    }, 400)
    return () => window.clearTimeout(t)
  }, [focusIndex, colWidth])

  useSnapScrollFeedback(
    scrollRef,
    colWidth > 0,
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
    <div ref={viewportRef} className="overflow-hidden w-full">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              className={`snap-start shrink-0 min-h-[120px] rounded-lg p-2 border ${
                isToday
                  ? 'bg-accent-soft border-accent'
                  : isFocus
                    ? 'glass border-[var(--accent-border)]'
                    : 'glass border-transparent'
              }`}
              style={{ width: colWidth > 0 ? colWidth : `${100 / VISIBLE_DAYS}%` }}
            >
              <p className="text-[10px] text-theme-muted uppercase mb-1 truncate">
                {day.toLocaleDateString([], { weekday: 'short' })}
              </p>
              <p
                className={`text-sm font-semibold mb-2 ${isToday ? 'text-accent' : 'text-theme'}`}
              >
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
