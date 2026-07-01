import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '../lib/utils'
import { useSnapScrollFeedback } from '../hooks/useSnapScrollFeedback'
import { useFeatureGate } from '../hooks/useFeatureGate'
import { PanelHideButton, PanelRestoreTab } from './PanelHideButton'
import { EventDetailBox } from './EventDetailBox'
import { EventChip, EVENT_COLORS, eventsForDay } from './WeekCalendarGrid'
import { DayCalendarCarousel } from './DayCalendarCarousel'
import { calendarHapticTick } from '../lib/calendarFeedback'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthKey(month: Date): string {
  return `${month.getFullYear()}-${month.getMonth()}`
}

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
  const isCurrentMonth = isSameMonth(month, today)

  return (
    <div
      className="mb-6 last:mb-0"
      data-month-key={monthKey(month)}
      {...(isCurrentMonth ? { 'data-scroll-anchor': 'current' } : {})}
    >
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
  const today = useMemo(() => startOfDay(new Date()), [])
  const [focusDay, setFocusDay] = useState(() => startOfDay(new Date()))
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [importHint, setImportHint] = useState<string | null>(null)
  const canCalendarImportExport = useFeatureGate('calendar_import_export')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fullCalScrollRef = useRef<HTMLDivElement>(null)
  const skipMonthFeedback = useRef(false)

  const weekHidden = hiddenPanels['calendar-week'] ?? false
  const upcomingHidden = hiddenPanels['calendar-upcoming'] ?? false

  const scrollMonths = useMemo(() => {
    const anchor = startOfMonth(today)
    return Array.from({ length: 24 }, (_, i) => addMonths(anchor, i - 12))
  }, [today])

  const scrollFullCalToCurrentMonth = useCallback(() => {
    skipMonthFeedback.current = true
    requestAnimationFrame(() => {
      fullCalScrollRef.current
        ?.querySelector('[data-scroll-anchor="current"]')
        ?.scrollIntoView({ block: 'start' })
    })
    window.setTimeout(() => {
      skipMonthFeedback.current = false
    }, 450)
  }, [])

  useEffect(() => {
    if (!fullCalendarOpen) return
    scrollFullCalToCurrentMonth()
  }, [fullCalendarOpen, scrollFullCalToCurrentMonth])

  useSnapScrollFeedback(
    fullCalScrollRef,
    fullCalendarOpen,
    '[data-month-key]',
    (el) => el.getAttribute('data-month-key') ?? '',
    undefined,
    () => !skipMonthFeedback.current,
    'month',
  )

  const sortedEvents = useMemo(
    () => [...calendarEvents].sort((a, b) => a.start.localeCompare(b.start)),
    [calendarEvents],
  )

  const upcoming = useMemo(() => {
    const now = new Date()
    return sortedEvents.filter((e) => new Date(e.end) >= now)
  }, [sortedEvents])

  const todayDate = today
  const monthTitle = focusDay.toLocaleDateString([], { month: 'long', year: 'numeric' })

  const selectDayFromMonth = (day: Date) => {
    setFocusDay(startOfDay(day))
    setFullCalendarOpen(false)
  }

  const eventColor = (event: CalendarEvent) => {
    const idx = sortedEvents.findIndex((e) => e.id === event.id)
    return EVENT_COLORS[(idx >= 0 ? idx : 0) % EVENT_COLORS.length]
  }

  const handleImport = async (files: FileList | null) => {
    if (!files?.[0] || !canCalendarImportExport) return
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
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (fullCalendarOpen) {
                    setFullCalendarOpen(false)
                  } else {
                    calendarHapticTick()
                    setFocusDay((d) => addDays(d, -1))
                  }
                }}
                className="p-2 rounded-lg glass hover-theme text-theme-secondary"
                aria-label={fullCalendarOpen ? 'Close month view' : 'Previous day'}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => {
                  setFocusDay(todayDate)
                  if (fullCalendarOpen) {
                    scrollFullCalToCurrentMonth()
                  }
                }}
                className="px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
              >
                Today
              </button>
              <button
                onClick={() => {
                  if (fullCalendarOpen) {
                    setFullCalendarOpen(false)
                  } else {
                    calendarHapticTick()
                    setFocusDay((d) => addDays(d, 1))
                  }
                }}
                className="p-2 rounded-lg glass hover-theme text-theme-secondary"
                aria-label={fullCalendarOpen ? 'Close month view' : 'Next day'}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {canCalendarImportExport && (
                <>
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
                </>
              )}
            </div>
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
                    : ` · Week of ${startOfWeek(focusDay).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                </span>
              </button>
              <PanelHideButton panelId="calendar-week" label="week view" />
            </div>
            <p className="text-[10px] text-theme-muted mb-3">
              {fullCalendarOpen
                ? 'Scroll months — short vibration on each month'
                : 'Swipe the week — moves one day at a time'}
            </p>

            {fullCalendarOpen ? (
              <div
                ref={fullCalScrollRef}
                className="max-h-[min(45vh,400px)] overflow-y-auto overscroll-contain pr-1"
              >
                {scrollMonths.map((month) => (
                  <MonthGrid
                    key={monthKey(month)}
                    month={month}
                    events={sortedEvents}
                    today={todayDate}
                    onSelectDay={selectDayFromMonth}
                    onSelectEvent={setSelectedEvent}
                  />
                ))}
              </div>
            ) : (
              <DayCalendarCarousel
                focusDay={focusDay}
                events={sortedEvents}
                today={todayDate}
                onSelectEvent={setSelectedEvent}
                onFocusDayChange={setFocusDay}
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
