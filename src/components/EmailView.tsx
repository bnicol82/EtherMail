import { useState } from 'react'
import {
  Search,
  Star,
  Link2,
  Unlink,
  Reply,
  Sparkles,
  Paperclip,
  ChevronDown,
} from 'lucide-react'
import { useNexusStore, useGraph } from '../store/useStore'
import { MarkdownContent } from './MarkdownContent'
import { MiniGraph } from './MiniGraph'
import { formatDate, providerColor } from '../lib/utils'

export function EmailView() {
  const emails = useNexusStore((s) => s.emails)
  const accounts = useNexusStore((s) => s.accounts)
  const notes = useNexusStore((s) => s.notes)
  const activeEmailId = useNexusStore((s) => s.activeEmailId)
  const selectEmail = useNexusStore((s) => s.selectEmail)
  const linkEmailToNote = useNexusStore((s) => s.linkEmailToNote)
  const markEmailRead = useNexusStore((s) => s.markEmailRead)
  const mobilePanel = useNexusStore((s) => s.mobilePanel)
  const setMobilePanel = useNexusStore((s) => s.setMobilePanel)
  const setView = useNexusStore((s) => s.setView)
  const selectNote = useNexusStore((s) => s.selectNote)
  const addChatMessage = useNexusStore((s) => s.addChatMessage)
  const setAiMode = useNexusStore((s) => s.setAiMode)
  const { nodes, edges } = useGraph()

  const [filter, setFilter] = useState('')
  const [showLinkMenu, setShowLinkMenu] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const activeEmail = emails.find((e) => e.id === activeEmailId)
  const linkedNote = activeEmail?.linkedNoteId
    ? notes.find((n) => n.id === activeEmail.linkedNoteId)
    : null

  const filtered = emails.filter((e) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      e.subject.toLowerCase().includes(q) ||
      e.fromName.toLowerCase().includes(q) ||
      e.preview.toLowerCase().includes(q)
    )
  })

  const handleSelectEmail = (id: string) => {
    selectEmail(id)
    markEmailRead(id)
    setMobilePanel('detail')
  }

  const draftReply = () => {
    setView('ai')
    setAiMode('vault')
    addChatMessage({
      role: 'user',
      content: `Draft reply to ${activeEmail?.fromName} about ${activeEmail?.subject}`,
      mode: 'vault',
    })
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Email list */}
      <div
        className={`
          ${mobilePanel === 'detail' ? 'hidden md:flex' : 'flex'}
          w-full md:w-80 lg:w-96 flex-col glass border-r border-white/10 shrink-0
        `}
      >
        <div className="p-3 border-b border-white/10">
          <h2 className="font-semibold text-white mb-2">Unified Inbox</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search emails..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {accounts.filter((a) => a.connected).map((a) => (
              <span
                key={a.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: providerColor(a.provider) }} />
                {a.email.split('@')[0]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((e) => {
            const acc = accounts.find((a) => a.id === e.accountId)
            return (
              <button
                key={e.id}
                onClick={() => handleSelectEmail(e.id)}
                className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                  activeEmailId === e.id ? 'bg-indigo-600/20' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${e.read ? 'opacity-0' : 'bg-indigo-500'}`} />
                  <span className="text-sm font-medium text-white truncate flex-1">{e.fromName}</span>
                  {e.starred && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                  {e.linkedNoteId && <Link2 size={12} className="text-indigo-400 shrink-0" />}
                  <span className="text-xs text-slate-500 shrink-0">{formatDate(e.date)}</span>
                </div>
                <p className={`text-sm truncate ${e.read ? 'text-slate-400' : 'text-slate-200'}`}>{e.subject}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{e.preview}</p>
                {acc && (
                  <span className="text-[10px] text-slate-600 mt-1 inline-block">{acc.email}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Email detail + linked note */}
      <div
        className={`
          ${mobilePanel !== 'detail' ? 'hidden md:flex' : 'flex'}
          flex-1 min-w-0
        `}
      >
        {activeEmail ? (
          <div className="flex-1 flex min-h-0">
            {/* Email preview */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-white/10">
              <div className="p-4 border-b border-white/10 glass shrink-0">
                <button
                  className="md:hidden text-slate-400 hover:text-white text-sm mb-2"
                  onClick={() => setMobilePanel('list')}
                >
                  ← Back to inbox
                </button>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{activeEmail.subject}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      From <span className="text-slate-300">{activeEmail.fromName}</span> &lt;{activeEmail.from}&gt;
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(activeEmail.date).toLocaleString()}</p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded text-[10px] font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                    AETHER
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap relative">
                  <button
                    onClick={draftReply}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-xs text-indigo-300 hover:bg-indigo-600/40"
                  >
                    <Reply size={14} /> Draft Reply
                  </button>
                  <button
                    onClick={() => setShowLinkMenu(!showLinkMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10"
                  >
                    <Link2 size={14} />
                    {linkedNote ? 'Change Link' : 'Link to Note'}
                    <ChevronDown size={12} />
                  </button>
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10"
                  >
                    <Sparkles size={14} /> AI Actions
                  </button>

                  {showLinkMenu && (
                    <div className="absolute top-full left-0 mt-1 z-10 glass-strong rounded-lg p-2 w-64 shadow-xl">
                      {notes.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            linkEmailToNote(activeEmail.id, n.id)
                            setShowLinkMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded text-sm hover:bg-white/10 text-slate-300"
                        >
                          <Paperclip size={12} className="inline mr-2 text-indigo-400" />
                          {n.title}
                        </button>
                      ))}
                      {linkedNote && (
                        <button
                          onClick={() => {
                            linkEmailToNote(activeEmail.id, null)
                            setShowLinkMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded text-sm hover:bg-white/10 text-red-400 flex items-center gap-2"
                        >
                          <Unlink size={12} /> Remove link
                        </button>
                      )}
                    </div>
                  )}

                  {showActions && (
                    <div className="absolute top-full left-32 mt-1 z-10 glass-strong rounded-lg p-2 w-48 shadow-xl">
                      {['Summarize thread', 'Create Task', 'Find Similar Note'].map((a) => (
                        <button
                          key={a}
                          onClick={() => {
                            setView('ai')
                            setAiMode('vault')
                            addChatMessage({ role: 'user', content: a, mode: 'vault' })
                            setShowActions(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded text-sm hover:bg-white/10 text-slate-300"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                  {activeEmail.body}
                </div>
              </div>
            </div>

            {/* Linked note pane */}
            <div className="hidden lg:flex w-80 xl:w-96 flex-col glass shrink-0">
              {linkedNote ? (
                <>
                  <div className="p-3 border-b border-white/10 flex items-center gap-2">
                    <Link2 size={14} className="text-indigo-400" />
                    <span className="text-sm font-medium text-white truncate">{linkedNote.title}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <MarkdownContent content={linkedNote.content} />
                  </div>
                  <div className="p-3 border-t border-white/10">
                    <p className="text-xs text-slate-500 mb-2">Connection graph</p>
                    <MiniGraph
                      nodes={nodes}
                      edges={edges}
                      focusId={activeEmail.id}
                      width={280}
                      height={120}
                    />
                  </div>
                  <button
                    onClick={() => selectNote(linkedNote.id)}
                    className="m-3 py-2 rounded-lg bg-indigo-600/30 text-sm text-indigo-300 hover:bg-indigo-600/40"
                  >
                    Open in Vault
                  </button>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <Link2 size={32} className="text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500">No linked note</p>
                  <p className="text-xs text-slate-600 mt-1">Link this email to a vault note to see it here</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select an email to read
          </div>
        )}
      </div>
    </div>
  )
}