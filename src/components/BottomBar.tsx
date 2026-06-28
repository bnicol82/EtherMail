import { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Calendar,
  Clock,
  BarChart3,
  Send,
  Sparkles,
} from 'lucide-react'
import { useEtherMailStore, useStats, useUpcomingMeetings } from '../store/useStore'
import { generateVaultAIResponse } from '../lib/rag'

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
  const aiAssistantOpen = useEtherMailStore((s) => s.aiAssistantOpen)
  const setAiAssistantOpen = useEtherMailStore((s) => s.setAiAssistantOpen)
  const setView = useEtherMailStore((s) => s.setView)
  const setAiMode = useEtherMailStore((s) => s.setAiMode)
  const addChatMessage = useEtherMailStore((s) => s.addChatMessage)
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const meetings = useUpcomingMeetings(2)
  const stats = useStats()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [inlineReply, setInlineReply] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aiAssistantOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setInlineReply(null)
    }
  }, [aiAssistantOpen])

  const submit = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setAiAssistantOpen(true)
    setLoading(true)
    setInlineReply(null)
    addChatMessage({ role: 'user', content: q, mode: 'vault' })
    const reply = await generateVaultAIResponse(q, notes, emails)
    addChatMessage({ role: 'assistant', content: reply, mode: 'vault' })
    setInlineReply(reply)
    setLoading(false)
  }

  const openFullAssistant = () => {
    setView('ai')
    setAiMode('vault')
    setAiAssistantOpen(false)
  }

  return (
    <>
      {/* Expanded AI panel */}
      {aiAssistantOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setAiAssistantOpen(false)}
        />
      )}

      {aiAssistantOpen && (inlineReply || loading) && (
        <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-3 animate-fade-in">
          <div className="glass-frost rounded-xl p-4 shadow-2xl max-h-48 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-theme-muted animate-pulse">EtherMail AI is thinking...</p>
            ) : (
              <p className="text-sm text-theme-secondary whitespace-pre-wrap line-clamp-6">{inlineReply}</p>
            )}
            <button
              onClick={openFullAssistant}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Open full AI Assistant →
            </button>
          </div>
        </div>
      )}

      {/* Bottom dock */}
      <footer className="bottom-dock fixed bottom-0 left-0 right-0 z-30 shrink-0">
        <div className="flex items-stretch gap-0 max-w-[100vw] overflow-x-auto">
          {/* Calendar */}
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

          {/* Date & time */}
          <div className="hidden md:flex flex-col justify-center px-4 py-2.5 border-r border-[var(--glass-border)] shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-theme-muted font-medium mb-1">
              <Clock size={11} />
              Now
            </div>
            <LiveClock />
          </div>

          {/* Stats */}
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

          {/* AI Assistant input */}
          <div className="flex-1 flex items-center gap-2 px-3 py-2 min-w-0">
            <div className="flex items-center gap-1.5 text-accent shrink-0">
              <Bot size={18} />
              <span className="text-xs font-semibold hidden xs:inline">AI Assistant</span>
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setAiAssistantOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') setAiAssistantOpen(false)
              }}
              placeholder="Ask EtherMail AI... (e.g. 'Draft email about budget')"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg input-theme text-sm outline-none focus:border-[var(--accent-border)]"
            />
            <button
              onClick={submit}
              disabled={loading || !input.trim()}
              className="p-2 rounded-lg btn-accent disabled:opacity-40 shrink-0"
              aria-label="Send to AI"
            >
              <Send size={16} />
            </button>
            <button
              onClick={openFullAssistant}
              className="p-2 rounded-lg hover-theme text-theme-muted shrink-0 hidden sm:block"
              title="Open full assistant"
            >
              <Sparkles size={16} />
            </button>
          </div>
        </div>

        {/* Mobile compact row */}
        <div className="sm:hidden flex items-center justify-between px-3 py-1 border-t border-[var(--glass-border)] text-[10px] text-theme-muted">
          <span>{meetings[0] ? `${meetings[0].title} · ${formatMeetingTime(meetings[0].start)}` : 'No upcoming meetings'}</span>
          <LiveClock />
        </div>
      </footer>
    </>
  )
}
