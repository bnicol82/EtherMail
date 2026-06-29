import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { CalendarEvent } from '../types'
import { addDays, formatEventTimeRange, isSameDay, startOfWeek } from '../lib/utils'

const EVENT_COLORS = ['#6366f1', '#22d3ee', '#f472b6', '#a78bfa', '#34d399']

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day))
}

export function CalendarView() {
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const sortedEvents = useMemo(
    () => [...calendarEvents].sort((a, b) => a.start.localeCompare(b.start)),
    [calendarEvents],
  )

  const upcoming = useMemo(() => {
    const now = new Date()
    return sortedEvents.filter((e) => new Date(e.end) >= now).slice(0, 6)
  }, [sortedEvents])

  const today = new Date()

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
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="p-2 rounded-lg glass hover-theme text-theme-secondary"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
            >
              Today
            </button>
            <button
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="p-2 rounded-lg glass hover-theme text-theme-secondary"
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="glass rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-theme mb-4">
            {weekDays[0].toLocaleDateString([], { month: 'long', year: 'numeric' })}
            <span className="text-theme-muted font-normal">
              {' '}· Week of {weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </p>
          <div className="grid grid-cols-7 gap-2">
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

        <div className="glass rounded-xl p-4">
          <h2 className="font-semibold text-theme mb-3">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-theme-muted">No upcoming events</p>
          ) : (
            <div className="space-y-2">
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
      </div>
    </div>
  )
}
