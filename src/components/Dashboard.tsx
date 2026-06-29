import { useMemo, useState } from 'react'
import { useEtherMailStore, useGraph } from '../store/useStore'
import { MiniGraph } from './MiniGraph'
import { AccountDot } from './AccountDot'
import { EventDetailBox } from './EventDetailBox'
import { formatDate, addDays, isSameDay, startOfWeek } from '../lib/utils'
import { extractTodos } from '../lib/todos'
import type { CalendarEvent } from '../types'
import { Sparkles, Tag, Link2, CheckSquare, Mail, FileText } from 'lucide-react'

const EVENT_COLORS = ['#6366f1', '#22d3ee', '#f472b6', '#a78bfa', '#34d399']
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day))
}

export function Dashboard() {
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const accounts = useEtherMailStore((s) => s.accounts)
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const chatMessages = useEtherMailStore((s) => s.chatMessages)
  const setView = useEtherMailStore((s) => s.setView)
  const setAiAssistantOpen = useEtherMailStore((s) => s.setAiAssistantOpen)
  const submitAiQuery = useEtherMailStore((s) => s.submitAiQuery)
  const { nodes, edges } = useGraph()

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const recentEmails = [...emails].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const unread = emails.filter((e) => !e.read)
  const todos = useMemo(() => extractTodos(notes, emails), [notes, emails])

  const weekStart = useMemo(() => startOfWeek(new Date()), [])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const sortedEvents = useMemo(
    () => [...calendarEvents].sort((a, b) => a.start.localeCompare(b.start)),
    [calendarEvents],
  )

  const eventColor = (event: CalendarEvent) => {
    const idx = sortedEvents.findIndex((e) => e.id === event.id)
    return EVENT_COLORS[(idx >= 0 ? idx : 0) % EVENT_COLORS.length]
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-theme mb-0.5">Dashboard</h1>
        <p className="text-theme-muted text-xs md:text-sm mb-4 md:mb-6">Your unified workspace at a glance</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calendar week view */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-theme">This Week</h2>
              <button
                onClick={() => setView('calendar')}
                className="text-xs text-accent hover:text-accent"
              >
                Open calendar →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((day, i) => (
                <div key={day.toISOString()} className="text-center min-w-0">
                  <p className="text-xs text-theme-muted mb-2">{WEEKDAY_LABELS[i]}</p>
                  <p className="text-sm font-medium text-theme mb-2">{day.getDate()}</p>
                  <div className="space-y-1 min-h-[80px]">
                    {eventsForDay(sortedEvents, day).map((event) => {
                      const color = eventColor(event)
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEvent(event)}
                          className="w-full text-left text-[10px] p-1.5 rounded text-theme truncate hover:opacity-90"
                          style={{
                            background: `${color}33`,
                            borderLeft: `2px solid ${color}`,
                          }}
                          title={event.title}
                        >
                          {event.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* To Do list */}
          <div className="glass rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-theme flex items-center gap-2">
                <CheckSquare size={16} className="text-accent" />
                To Do
              </h2>
              <span className="text-xs text-theme-muted">{todos.length} open</span>
            </div>
            <div className="flex-1 space-y-2 max-h-48 overflow-y-auto">
              {todos.length === 0 ? (
                <p className="text-sm text-theme-muted">No open items from notes or email.</p>
              ) : (
                todos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.source === 'note') {
                        setView('notes')
                        selectNote(item.sourceId, { view: 'notes' })
                      } else {
                        setView('email')
                        selectEmail(item.sourceId)
                      }
                    }}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover-theme text-left transition-colors"
                  >
                    <span className="mt-0.5 w-4 h-4 rounded border border-[var(--accent-border)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-theme truncate">{item.text}</p>
                      <p className="text-[10px] text-theme-muted flex items-center gap-1 mt-0.5">
                        {item.source === 'note' ? (
                          <FileText size={10} />
                        ) : (
                          <Mail size={10} />
                        )}
                        {item.sourceLabel}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* AI History + quick chat */}
          <div className="glass rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-accent" />
              <h2 className="font-semibold text-theme">Vault AI</h2>
            </div>
            <div className="flex-1 space-y-2 mb-3 max-h-40 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-theme-muted">No conversations yet. Try &quot;Summarize Q3 Plan&quot;</p>
              ) : (
                chatMessages.slice(-4).map((m) => (
                  <div key={m.id} className="text-xs p-2 rounded glass">
                    <span className={m.role === 'user' ? 'text-accent' : 'text-emerald-400'}>
                      {m.role === 'user' ? 'You' : 'Vault AI'}:
                    </span>{' '}
                    <span className="text-theme-secondary">{m.content.slice(0, 80)}...</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => {
                setAiAssistantOpen(true)
                submitAiQuery('Summarize my recent activity')
              }}
              className="w-full py-2 rounded-lg btn-accent text-sm"
            >
              Ask EtherMail AI
            </button>
          </div>

          {/* Recent emails */}
          <div className="glass rounded-xl p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-theme">
                Inbox {unread.length > 0 && <span className="text-accent text-sm ml-1">({unread.length} unread)</span>}
              </h2>
              <button onClick={() => setView('email')} className="text-xs text-accent hover:text-accent">
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {recentEmails.map((e) => {
                const acc = accounts.find((a) => a.id === e.accountId)
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      setView('email')
                      selectEmail(e.id)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover-theme text-left transition-colors"
                  >
                    <AccountDot account={acc} />
                    {!e.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 -ml-1" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${e.read ? 'text-theme-secondary' : 'text-theme font-medium'}`}>
                        {e.subject}
                      </p>
                      <p className="text-xs text-theme-muted truncate">{e.fromName} — {e.preview}</p>
                    </div>
                    <span className="text-xs text-theme-muted shrink-0">{formatDate(e.date)}</span>
                    {e.linkedNoteId && <Link2 size={14} className="text-accent shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Quick vault access */}
        <div className="mt-4 glass rounded-xl p-4">
          <h2 className="font-semibold text-theme mb-3">Recent Notes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.slice(0, 3).map((n) => (
              <button
                key={n.id}
                onClick={() => selectNote(n.id)}
                className="p-3 rounded-lg glass hover-theme text-left transition-colors"
              >
                <p className="font-medium text-theme text-sm">{n.title}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {n.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-indigo-300 flex items-center gap-0.5">
                      <Tag size={8} /> {t}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge graph — bottom of dashboard */}
        <div className="mt-4 glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-theme">Knowledge Graph</h2>
            <button
              onClick={() => setView('graph')}
              className="text-xs text-accent hover:text-accent"
            >
              Open full graph →
            </button>
          </div>
          <MiniGraph nodes={nodes} edges={edges} width={400} height={220} />
          <div className="flex gap-3 mt-3 text-[10px] text-theme-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--accent)]" /> Notes</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Email</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /> People</span>
          </div>
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
