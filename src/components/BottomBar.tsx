import { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Calendar,
  Clock,
  BarChart3,
  Send,
  Sparkles,
  MessageSquare,
  CloudSun,
} from 'lucide-react'
import { useEtherMailStore, useStats, useUpcomingMeetings } from '../store/useStore'
import { getAIContext } from '../lib/aiContext'
import { MarkdownContent } from './MarkdownContent'
import { WeatherChip } from './WeatherChip'

function formatMeetingTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today ${time}`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`
}

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="shrink-0">
      <p className="text-sm font-semibold text-theme leading-tight">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-[10px] text-theme-muted leading-tight">
        {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
    </div>
  )
}

/** Unified bottom dock — context suggestions, AI input, and status widgets in one bar */
export function BottomBar() {
  const view = useEtherMailStore((s) => s.view)
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const activeEmailId = useEtherMailStore((s) => s.activeEmailId)
  const activeNoteId = useEtherMailStore((s) => s.activeNoteId)
  const aiLoading = useEtherMailStore((s) => s.aiLoading)
  const aiContextResponse = useEtherMailStore((s) => s.aiContextResponse)
  const submitAiQuery = useEtherMailStore((s) => s.submitAiQuery)
  const setView = useEtherMailStore((s) => s.setView)
  const clearAiContextResponse = useEtherMailStore((s) => s.clearAiContextResponse)
  const meetings = useUpcomingMeetings(2)
  const stats = useStats()

  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const activeEmail = emails.find((e) => e.id === activeEmailId) ?? null
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null
  const ctx = getAIContext(view, { activeEmail, activeNote, emails, notes })
  const hasResponse = aiLoading || aiContextResponse

  const submit = async () => {
    if (!input.trim() || aiLoading) return
    const q = input.trim()
    setInput('')
    await submitAiQuery(q, ctx.contextPrefix)
  }

  const openFullChat = () => {
    clearAiContextResponse()
    setView('ai')
  }

  return (
    <footer className="bottom-dock fixed bottom-0 left-0 right-0 z-30 shrink-0">
      {/* AI quick response — expands above suggestions */}
      {hasResponse && (
        <div className="border-b border-[var(--glass-border)] max-h-[min(28vh,180px)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1 border-b border-[var(--glass-border)] shrink-0">
            <span className="text-[10px] text-theme-muted flex items-center gap-1">
              <Sparkles size={10} className="text-accent" />
              Quick reply
            </span>
            <button
              onClick={openFullChat}
              className="text-[10px] text-accent hover:underline flex items-center gap-1"
            >
              <MessageSquare size={10} />
              Open chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 min-h-0">
            {aiLoading ? (
              <p className="text-sm text-theme-muted animate-pulse flex items-center gap-2">
                <Sparkles size={14} className="text-accent" />
                EtherMail AI is thinking...
              </p>
            ) : aiContextResponse ? (
              <div className="text-sm text-theme-secondary">
                <MarkdownContent content={aiContextResponse} />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Contextual suggestion pills */}
      <div className="px-2 sm:px-3 py-1.5 border-b border-[var(--glass-border)] flex items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <Bot size={13} className="text-accent" />
          <span className="text-[10px] sm:text-[11px] font-semibold text-theme max-w-[100px] sm:max-w-[180px] truncate">
            {ctx.label}
          </span>
        </div>
        <div className="flex gap-1 flex-1 min-w-0 overflow-x-auto">
          {ctx.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => submitAiQuery(s, ctx.contextPrefix)}
              disabled={aiLoading}
              className="text-[10px] sm:text-[11px] px-2 py-0.5 sm:py-1 rounded-full glass hover-theme text-theme-secondary disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={openFullChat}
          className="text-[10px] px-2 py-1 rounded-full btn-accent shrink-0 flex items-center gap-1"
        >
          <MessageSquare size={10} />
          <span className="hidden sm:inline">Chat</span>
        </button>
      </div>

      {/* Main dock row */}
      <div className="flex items-stretch gap-0 max-w-[100vw] overflow-x-auto">
        <div className="hidden sm:flex flex-col justify-center gap-1 px-3 py-2 border-r border-[var(--glass-border)] min-w-[150px] shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-theme-muted font-medium">
            <Calendar size={11} />
            Upcoming
          </div>
          {meetings.length === 0 ? (
            <p className="text-xs text-theme-muted">No meetings</p>
          ) : (
            meetings.map((m) => (
              <div key={m.id} className="text-xs text-theme-secondary truncate">
                <span className="text-accent font-medium">{formatMeetingTime(m.start)}</span>
                <span className="text-theme-muted"> · </span>
                {m.title}
              </div>
            ))
          )}
        </div>

        <div className="hidden md:flex flex-col justify-center px-3 py-2 border-r border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-theme-muted font-medium mb-1">
            <Clock size={11} />
            Now
          </div>
          <LiveClock />
        </div>

        <div className="hidden sm:flex flex-col justify-center px-3 py-2 border-r border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-theme-muted font-medium mb-1">
            <CloudSun size={11} />
            Weather
          </div>
          <WeatherChip />
        </div>

        <div className="hidden lg:flex flex-col justify-center gap-0.5 px-3 py-2 border-r border-[var(--glass-border)] min-w-[130px] shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-theme-muted font-medium">
            <BarChart3 size={11} />
            Stats
          </div>
          <div className="flex gap-3 text-[11px] text-theme-muted">
            <span><strong className="text-theme">{stats.unread}</strong> unread</span>
            <span><strong className="text-theme">{stats.notes}</strong> notes</span>
            <span><strong className="text-theme">{stats.linked}</strong> linked</span>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 min-w-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder={ctx.placeholder}
            className="flex-1 min-w-0 px-3 py-1.5 sm:py-2 rounded-lg input-theme text-sm sm:text-base outline-none focus:border-[var(--accent-border)]"
          />
          <button
            onClick={submit}
            disabled={aiLoading || !input.trim()}
            className="p-1.5 sm:p-2 rounded-lg btn-accent disabled:opacity-40 shrink-0"
            aria-label="Send to AI"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-between gap-2 px-3 py-0.5 border-t border-[var(--glass-border)] text-[10px] text-theme-muted">
        <span className="truncate flex-1 min-w-0">
          {meetings[0] ? `${meetings[0].title} · ${formatMeetingTime(meetings[0].start)}` : 'No upcoming meetings'}
        </span>
        <WeatherChip compact showLabel />
        <LiveClock />
      </div>
    </footer>
  )
}
