import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Users, Download, Upload } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { CalendarEvent } from '../types'
import { downloadIcsFile, readIcsFile } from '../lib/ics'
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
import { EventDetailBox } from './EventDetailBox'
import { EventChip, WeekCalendarGrid, EVENT_COLORS, eventsForDay } from './WeekCalendarGrid'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MonthGrid({
  month,
  events,
  today,
  onSelectDay,
  onSelectEvent,
}: {
  month: Date
  events: CalendarEvent[]
  today: Date
  onSelectDay: (day: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
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
                  <EventChip
                    key={e.id}
                    event={e}
                    color={EVENT_COLORS[idx % EVENT_COLORS.length]}
                    className="text-[9px] px-1 py-0.5 block w-full"
                    onSelect={onSelectEvent}
                  />
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
  const importCalendarEvents = useEtherMailStore((s) => s.importCalendarEvents)
  const hiddenPanels = useEtherMailStore((s) => s.hiddenPanels)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [importHint, setImportHint] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const eventColor = (event: CalendarEvent) => {
    const idx = sortedEvents.findIndex((e) => e.id === event.id)
    return EVENT_COLORS[(idx >= 0 ? idx : 0) % EVENT_COLORS.length]
  }

  const handleImport = async (files: FileList | null) => {
    if (!files?.[0]) return
    try {
      const parsed = await readIcsFile(files[0])
      const added = importCalendarEvents(parsed)
      setImportHint(
        added > 0 ? `Imported ${added} event${added === 1 ? '' : 's'}` : `Updated ${parsed.length} event${parsed.length === 1 ? '' : 's'}`,
      )
      window.setTimeout(() => setImportHint(null), 3000)
    } catch {
      setImportHint('Could not read .ics file')
      window.setTimeout(() => setImportHint(null), 3000)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 md:p-6">
      <div className="max-w-5xl mx-auto flex flex-col flex-1 min-h-0 w-full">
        <div className="shrink-0 flex items-center justify-between flex-wrap gap-2 mb-3 md:mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-theme flex items-center gap-2">
              <Calendar size={22} className="text-accent" />
              Calendar
            </h1>
            <p className="text-xs md:text-sm text-theme-muted mt-0.5">
              Synced from your connected accounts and email invitations
              {importHint && <span className="ml-2 text-accent">· {importHint}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadIcsFile(sortedEvents)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass text-[10px] text-theme-secondary hover-theme"
              title="Export all events as .ics"
            >
              <Download size={14} />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass text-[10px] text-theme-secondary hover-theme"
              title="Import .ics file"
            >
              <Upload size={14} />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => handleImport(e.target.files)}
            />
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

        <div className="shrink-0 flex flex-col gap-1 mb-2">
          <PanelRestoreTab panelId="calendar-week" label="Week view" />
          <PanelRestoreTab panelId="calendar-upcoming" label="Upcoming events" />
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        {!weekHidden && (
          <div className="glass rounded-xl p-4 mb-4 shrink-0 overflow-hidden">
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
                ? 'Scroll through months · tap an event for details'
                : 'Tap month for full calendar · tap an event for details'}
            </p>

            {fullCalendarOpen ? (
              <div className="max-h-[min(45vh,400px)] overflow-y-auto overscroll-contain pr-1">
                {scrollMonths.map((month) => (
                  <MonthGrid
                    key={`${month.getFullYear()}-${month.getMonth()}`}
                    month={month}
                    events={sortedEvents}
                    today={today}
                    onSelectDay={selectDayFromMonth}
                    onSelectEvent={setSelectedEvent}
                  />
                ))}
              </div>
            ) : (
              <WeekCalendarGrid
                weekDays={weekDays}
                events={sortedEvents}
                onSelectEvent={setSelectedEvent}
                today={today}
                className="select-none cursor-grab active:cursor-grabbing"
                swipeProps={{
                  style: { touchAction: 'pan-y pinch-zoom' },
                  ...weekSwipe.handlers,
                }}
                swipeStyle={{
                  transform: `translateX(${weekSwipe.offset}px)`,
                  transition: weekSwipe.isDragging ? 'none' : 'transform 0.25s ease-out',
                  opacity: weekSwipe.isDragging ? 0.92 : 1,
                }}
              />
            )}
          </div>
        )}

        {!upcomingHidden && (
          <div className="glass rounded-xl p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="font-semibold text-theme">Upcoming</h2>
              <PanelHideButton panelId="calendar-upcoming" label="upcoming" />
            </div>

            {upcoming.length === 0 ? (
              <p className="text-sm text-theme-muted">No upcoming events</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1">
                <div className="space-y-2 pb-2">
                  {upcoming.map((e, i) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedEvent(e)}
                      className="w-full flex items-start gap-3 p-3 rounded-lg glass hover-theme text-left transition-colors"
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
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {selectedEvent && (
        <EventDetailBox
          event={selectedEvent}
          color={eventColor(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
