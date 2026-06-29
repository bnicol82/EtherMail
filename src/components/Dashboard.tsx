import { useNexusStore, useGraph } from '../store/useStore'
import { MiniGraph } from './MiniGraph'
import { AccountDot } from './AccountDot'
import { formatDate } from '../lib/utils'
import { Sparkles, Tag, Link2 } from 'lucide-react'

export function Dashboard() {
  const notes = useNexusStore((s) => s.notes)
  const emails = useNexusStore((s) => s.emails)
  const accounts = useNexusStore((s) => s.accounts)
  const selectNote = useNexusStore((s) => s.selectNote)
  const selectEmail = useNexusStore((s) => s.selectEmail)
  const chatMessages = useNexusStore((s) => s.chatMessages)
  const setView = useNexusStore((s) => s.setView)
  const setAiAssistantOpen = useNexusStore((s) => s.setAiAssistantOpen)
  const submitAiQuery = useNexusStore((s) => s.submitAiQuery)
  const { nodes, edges } = useGraph()

  const recentEmails = [...emails].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const unread = emails.filter((e) => !e.read)

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const events = [
    { day: 0, title: 'Project Sync', time: '10:00', color: '#6366f1' },
    { day: 1, title: 'Budget Review', time: '14:00', color: '#22d3ee' },
    { day: 2, title: 'Client Meeting', time: '11:00', color: '#f472b6' },
    { day: 3, title: 'Team Standup', time: '09:00', color: '#a78bfa' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-theme mb-1">Dashboard</h1>
        <p className="text-theme-muted text-sm mb-6">Your unified workspace at a glance</p>

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
            <div className="grid grid-cols-6 gap-2">
              {weekDays.map((d, i) => (
                <div key={d} className="text-center">
                  <p className="text-xs text-theme-muted mb-2">{d}</p>
                  <p className="text-sm font-medium text-theme mb-2">{14 + i}</p>
                  <div className="space-y-1 min-h-[80px]">
                    {events
                      .filter((e) => e.day === i)
                      .map((e) => (
                        <div
                          key={e.title}
                          className="text-[10px] p-1.5 rounded text-theme truncate"
                          style={{ background: `${e.color}33`, borderLeft: `2px solid ${e.color}` }}
                        >
                          {e.title}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini calendar */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-theme">Mini View</h2>
              <button
                onClick={() => setView('calendar')}
                className="text-xs text-accent hover:text-accent"
              >
                Full view →
              </button>
            </div>
            <div className="flex gap-2 justify-between">
              {weekDays.map((d, i) => (
                <div
                  key={d}
                  className={`flex-1 text-center p-2 rounded-lg ${i === 0 ? 'bg-accent-soft border border-accent' : 'glass'}`}
                >
                  <p className="text-xs text-theme-muted">{d}</p>
                  <p className="text-lg font-semibold text-theme">{14 + i}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Graph */}
          <div className="glass rounded-xl p-4">
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
              )})}
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
      </div>
    </div>
  )
}
