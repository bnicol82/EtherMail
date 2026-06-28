import { useNexusStore, useGraph } from '../store/useStore'
import { MiniGraph } from './MiniGraph'
import { formatDate } from '../lib/utils'
import { Sparkles, Tag, Link2 } from 'lucide-react'

export function Dashboard() {
  const notes = useNexusStore((s) => s.notes)
  const emails = useNexusStore((s) => s.emails)
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
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-500 text-sm mb-6">Your unified workspace at a glance</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calendar week view */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">This Week</h2>
              <span className="text-xs text-indigo-400">Phase 2 preview</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {weekDays.map((d, i) => (
                <div key={d} className="text-center">
                  <p className="text-xs text-slate-500 mb-2">{d}</p>
                  <p className="text-sm font-medium text-white mb-2">{14 + i}</p>
                  <div className="space-y-1 min-h-[80px]">
                    {events
                      .filter((e) => e.day === i)
                      .map((e) => (
                        <div
                          key={e.title}
                          className="text-[10px] p-1.5 rounded text-white truncate"
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
            <h2 className="font-semibold text-white mb-4">Mini View</h2>
            <div className="flex gap-2 justify-between">
              {weekDays.map((d, i) => (
                <div
                  key={d}
                  className={`flex-1 text-center p-2 rounded-lg ${i === 0 ? 'bg-indigo-600/30 border border-indigo-500/40' : 'bg-white/5'}`}
                >
                  <p className="text-xs text-slate-500">{d}</p>
                  <p className="text-lg font-semibold text-white">{14 + i}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Full calendar sync in Phase 2</p>
          </div>

          {/* Graph */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">Knowledge Graph</h2>
              <button
                onClick={() => setView('graph')}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Open full graph →
              </button>
            </div>
            <MiniGraph nodes={nodes} edges={edges} width={400} height={220} />
            <div className="flex gap-3 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Notes</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Email</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /> People</span>
            </div>
          </div>

          {/* AI History + quick chat */}
          <div className="glass rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-indigo-400" />
              <h2 className="font-semibold text-white">Vault AI</h2>
            </div>
            <div className="flex-1 space-y-2 mb-3 max-h-40 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-slate-500">No conversations yet. Try &quot;Summarize Q3 Plan&quot;</p>
              ) : (
                chatMessages.slice(-4).map((m) => (
                  <div key={m.id} className="text-xs p-2 rounded bg-white/5">
                    <span className={m.role === 'user' ? 'text-indigo-400' : 'text-emerald-400'}>
                      {m.role === 'user' ? 'You' : 'Vault AI'}:
                    </span>{' '}
                    <span className="text-slate-400">{m.content.slice(0, 80)}...</span>
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
              <h2 className="font-semibold text-white">
                Inbox {unread.length > 0 && <span className="text-indigo-400 text-sm ml-1">({unread.length} unread)</span>}
              </h2>
              <button onClick={() => setView('email')} className="text-xs text-indigo-400 hover:text-indigo-300">
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {recentEmails.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setView('email')
                    selectEmail(e.id)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${e.read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${e.read ? 'text-slate-400' : 'text-white font-medium'}`}>
                      {e.subject}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{e.fromName} — {e.preview}</p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{formatDate(e.date)}</span>
                  {e.linkedNoteId && <Link2 size={14} className="text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick vault access */}
        <div className="mt-4 glass rounded-xl p-4">
          <h2 className="font-semibold text-white mb-3">Recent Notes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.slice(0, 3).map((n) => (
              <button
                key={n.id}
                onClick={() => selectNote(n.id)}
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors"
              >
                <p className="font-medium text-white text-sm">{n.title}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {n.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 flex items-center gap-0.5">
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
