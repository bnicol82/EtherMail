import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { CalendarEvent } from '../types'
import {
  addDays,
  addMonths,
  formatEventTimeRange,
  getMonthGridDays,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from '../lib/utils'
import { useSwipe } from '../hooks/useSwipe'
import { PanelHideButton, PanelRestoreTab } from './PanelHideButton'

const EVENT_COLORS = ['#6366f1', '#22d3ee', '#f472b6', '#a78bfa', '#34d399']
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day))
}

function MonthGrid({
  month,
  events,
  today,
  onSelectDay,
}: {
  month: Date
  events: CalendarEvent[]
  today: Date
  onSelectDay: (day: Date) => void
}) {
  const days = getMonthGridDays(month)

  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-theme mb-3 sticky top-0 glass py-1 z-10">
        {month.toLocaleDateString([], { month: 'long', year: 'numeric' })}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-[10px] text-theme-muted text-center font-medium py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const isToday = isSameDay(day, today)
          const dayEvents = eventsForDay(events, day)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`min-h-[72px] rounded-lg p-1.5 text-left transition-colors ${
                isToday
                  ? 'bg-accent-soft border border-accent'
                  : inMonth
                    ? 'glass hover-theme'
                    : 'opacity-40 glass'
              }`}
            >
              <span
                className={`text-xs font-semibold block mb-0.5 ${
                  isToday ? 'text-accent' : inMonth ? 'text-theme' : 'text-theme-muted'
                }`}
              >
                {day.getDate()}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((e, idx) => (
                  <div
                    key={e.id}
                    className="text-[9px] px-1 py-0.5 rounded truncate text-theme"
                    style={{
                      background: `${EVENT_COLORS[idx % EVENT_COLORS.length]}33`,
                      borderLeft: `2px solid ${EVENT_COLORS[idx % EVENT_COLORS.length]}`,
                    }}
                    title={e.title}
                  >
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[8px] text-theme-muted">+{dayEvents.length - 2}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarView() {
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const hiddenPanels = useEtherMailStore((s) => s.hiddenPanels)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false)

  const weekHidden = hiddenPanels['calendar-week'] ?? false
  const upcomingHidden = hiddenPanels['calendar-upcoming'] ?? false

  const weekSwipe = useSwipe(
    () => setWeekStart((w) => addDays(w, 7)),
    () => setWeekStart((w) => addDays(w, -7)),
  )

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const scrollMonths = useMemo(() => {
    const anchor = startOfMonth(weekStart)
    return Array.from({ length: 12 }, (_, i) => addMonths(anchor, i - 3))
  }, [weekStart])

  const sortedEvents = useMemo(
    () => [...calendarEvents].sort((a, b) => a.start.localeCompare(b.start)),
    [calendarEvents],
  )

  const upcoming = useMemo(() => {
    const now = new Date()
    return sortedEvents.filter((e) => new Date(e.end) >= now)
  }, [sortedEvents])

  const today = new Date()

  const monthTitle = weekDays[0].toLocaleDateString([], { month: 'long', year: 'numeric' })

  const selectDayFromMonth = (day: Date) => {
    setWeekStart(startOfWeek(day))
    setFullCalendarOpen(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
              <Calendar size={24} className="text-accent" />
              Calendar
            </h1>
            <p className="text-sm text-theme-muted mt-1">
              Synced from your connected accounts and email invitations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                fullCalendarOpen
                  ? setFullCalendarOpen(false)
                  : setWeekStart((w) => addDays(w, -7))
              }
              className="p-2 rounded-lg glass hover-theme text-theme-secondary"
              aria-label={fullCalendarOpen ? 'Close month view' : 'Previous week'}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => {
                setWeekStart(startOfWeek(new Date()))
                setFullCalendarOpen(false)
              }}
              className="px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
            >
              Today
            </button>
            <button
              onClick={() =>
                fullCalendarOpen
                  ? setFullCalendarOpen(false)
                  : setWeekStart((w) => addDays(w, 7))
              }
              className="p-2 rounded-lg glass hover-theme text-theme-secondary"
              aria-label={fullCalendarOpen ? 'Close month view' : 'Next week'}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <PanelRestoreTab panelId="calendar-week" label="Week" className="mb-2" />

        {!weekHidden && (
          <div className="glass rounded-xl p-4 mb-6 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={() => setFullCalendarOpen((o) => !o)}
                className="text-sm font-medium text-theme text-left hover:text-accent transition-colors group"
                title={fullCalendarOpen ? 'Show week view' : 'Show full calendar'}
              >
                {monthTitle}
                <span className="text-theme-muted font-normal group-hover:text-accent/80">
                  {fullCalendarOpen
                    ? ' · full calendar'
                    : ` · Week of ${weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                </span>
              </button>
              <PanelHideButton panelId="calendar-week" label="week view" />
            </div>
            <p className="text-[10px] text-theme-muted mb-3">
              {fullCalendarOpen
                ? 'Scroll through months · tap a day to jump to that week'
                : 'Tap month to open full calendar · swipe to change week'}
            </p>

            {fullCalendarOpen ? (
              <div className="max-h-[min(65vh,520px)] overflow-y-auto overscroll-contain pr-1 -mr-1">
                {scrollMonths.map((month) => (
                  <MonthGrid
                    key={`${month.getFullYear()}-${month.getMonth()}`}
                    month={month}
                    events={sortedEvents}
                    today={today}
                    onSelectDay={selectDayFromMonth}
                  />
                ))}
              </div>
            ) : (
              <div
                className="overflow-hidden select-none cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'pan-y pinch-zoom' }}
                {...weekSwipe.handlers}
              >
                <div
                  className="grid grid-cols-7 gap-2 min-w-0"
                  style={{
                    transform: `translateX(${weekSwipe.offset}px)`,
                    transition: weekSwipe.isDragging ? 'none' : 'transform 0.25s ease-out',
                    opacity: weekSwipe.isDragging ? 0.92 : 1,
                  }}
                >
                  {weekDays.map((day) => {
                    const dayEvents = eventsForDay(sortedEvents, day)
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
                            <div
                              key={e.id}
                              className="text-[10px] p-1 rounded truncate text-theme"
                              style={{
                                background: `${EVENT_COLORS[idx % EVENT_COLORS.length]}33`,
                                borderLeft: `2px solid ${EVENT_COLORS[idx % EVENT_COLORS.length]}`,
                              }}
                              title={e.title}
                            >
                              {e.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <PanelRestoreTab panelId="calendar-upcoming" label="Upcoming" className="mb-2" />

        {!upcomingHidden && (
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-theme">Upcoming</h2>
              <PanelHideButton panelId="calendar-upcoming" label="upcoming" />
            </div>

            {upcoming.length === 0 ? (
              <p className="text-sm text-theme-muted">No upcoming events</p>
            ) : (
              <div className="space-y-2 max-h-[min(50vh,400px)] overflow-y-auto">
                {upcoming.map((e, i) => (
                  <div
                    key={e.id}
                    className="flex items-start gap-3 p-3 rounded-lg glass hover-theme"
                  >
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ background: EVENT_COLORS[i % EVENT_COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme">{e.title}</p>
                      <p className="text-xs text-theme-muted mt-0.5">
                        {new Date(e.start).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' · '}
                        {formatEventTimeRange(e.start, e.end)}
                      </p>
                      {e.attendees && e.attendees.length > 0 && (
                        <p className="text-[10px] text-theme-muted mt-1 flex items-center gap-1">
                          <Users size={10} />
                          {e.attendees.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
