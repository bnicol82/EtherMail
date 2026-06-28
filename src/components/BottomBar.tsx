import { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Calendar,
  Clock,
  BarChart3,
  Send,
} from 'lucide-react'
import { useEtherMailStore, useStats, useUpcomingMeetings } from '../store/useStore'
import { getAIContext } from '../lib/aiContext'

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

export function BottomBar() {
  const view = useEtherMailStore((s) => s.view)
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const activeEmailId = useEtherMailStore((s) => s.activeEmailId)
  const activeNoteId = useEtherMailStore((s) => s.activeNoteId)
  const aiLoading = useEtherMailStore((s) => s.aiLoading)
  const submitAiQuery = useEtherMailStore((s) => s.submitAiQuery)
  const setAiAssistantOpen = useEtherMailStore((s) => s.setAiAssistantOpen)
  const meetings = useUpcomingMeetings(2)
  const stats = useStats()

  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const activeEmail = emails.find((e) => e.id === activeEmailId) ?? null
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null
  const ctx = getAIContext(view, { activeEmail, activeNote, emails, notes })

  const submit = async () => {
    if (!input.trim() || aiLoading) return
    const q = input.trim()
    setInput('')
    setAiAssistantOpen(true)
    await submitAiQuery(q, ctx.contextPrefix)
  }

  return (
    <footer className="bottom-dock fixed bottom-0 left-0 right-0 z-30 shrink-0">
      <div className="flex items-stretch gap-0 max-w-[100vw] overflow-x-auto">
        <div className="hidden sm:flex flex-col justify-center gap-1 px-4 py-2.5 border-r border-[var(--glass-border)] min-w-[160px] shrink-0">
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

        <div className="hidden md:flex flex-col justify-center px-4 py-2.5 border-r border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-theme-muted font-medium mb-1">
            <Clock size={11} />
            Now
          </div>
          <LiveClock />
        </div>

        <div className="hidden lg:flex flex-col justify-center gap-0.5 px-4 py-2.5 border-r border-[var(--glass-border)] min-w-[140px] shrink-0">
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

        <div className="flex-1 flex items-center gap-2 px-3 py-2 min-w-0">
          <div className="flex items-center gap-1.5 text-accent shrink-0">
            <Bot size={18} />
            <span className="text-xs font-semibold hidden sm:inline">AI Assistant</span>
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder={ctx.placeholder}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg input-theme text-sm outline-none focus:border-[var(--accent-border)]"
          />
          <button
            onClick={submit}
            disabled={aiLoading || !input.trim()}
            className="p-2 rounded-lg btn-accent disabled:opacity-40 shrink-0"
            aria-label="Send to AI"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-between px-3 py-1 border-t border-[var(--glass-border)] text-[10px] text-theme-muted">
        <span>{meetings[0] ? `${meetings[0].title} · ${formatMeetingTime(meetings[0].start)}` : 'No upcoming meetings'}</span>
        <LiveClock />
      </div>
    </footer>
  )
}
