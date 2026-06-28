import { useState, useMemo } from 'react'
import {
  Search,
  Star,
  Link2,
  Unlink,
  Reply,
  Sparkles,
  Paperclip,
  ChevronDown,
  X,
  Bot,
} from 'lucide-react'
import { useEtherMailStore, useGraph } from '../store/useStore'
import { MarkdownContent } from './MarkdownContent'
import { MiniGraph } from './MiniGraph'
import { formatDate, providerColor, providerLabel } from '../lib/utils'
import { summarizeEmail } from '../lib/emailSummary'

export function EmailView() {
  const emails = useEtherMailStore((s) => s.emails)
  const accounts = useEtherMailStore((s) => s.accounts)
  const notes = useEtherMailStore((s) => s.notes)
  const activeEmailId = useEtherMailStore((s) => s.activeEmailId)
  const activeAccountId = useEtherMailStore((s) => s.activeAccountId)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const linkEmailToNote = useEtherMailStore((s) => s.linkEmailToNote)
  const markEmailRead = useEtherMailStore((s) => s.markEmailRead)
  const mobilePanel = useEtherMailStore((s) => s.mobilePanel)
  const setMobilePanel = useEtherMailStore((s) => s.setMobilePanel)
  const setView = useEtherMailStore((s) => s.setView)
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectAccount = useEtherMailStore((s) => s.selectAccount)
  const addChatMessage = useEtherMailStore((s) => s.addChatMessage)
  const setAiMode = useEtherMailStore((s) => s.setAiMode)
  const { nodes, edges } = useGraph()

  const [filter, setFilter] = useState('')
  const [showLinkMenu, setShowLinkMenu] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const activeAccount = activeAccountId
    ? accounts.find((a) => a.id === activeAccountId)
    : null

  const activeEmail = emails.find((e) => e.id === activeEmailId)
  const linkedNote = activeEmail?.linkedNoteId
    ? notes.find((n) => n.id === activeEmail.linkedNoteId)
    : null

  const aiSummary = useMemo(
    () => (activeEmail ? summarizeEmail(activeEmail, notes) : null),
    [activeEmail, notes],
  )

  const filtered = emails.filter((e) => {
    if (activeAccountId && e.accountId !== activeAccountId) return false
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

  const inboxTitle = activeAccount
    ? activeAccount.email
    : 'Unified Inbox'

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Email list */}
      <div
        className={`
          ${mobilePanel === 'detail' ? 'hidden md:flex' : 'flex'}
          w-full md:w-72 lg:w-80 flex-col glass border-r border-[var(--glass-border)] shrink-0
        `}
      >
        <div className="p-3 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-theme truncate">{inboxTitle}</h2>
            {activeAccountId && (
              <button
                onClick={() => selectAccount(null)}
                className="p-1 rounded-lg hover-theme text-theme-muted"
                title="Show all inboxes"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {activeAccount && (
            <p className="text-[10px] text-theme-muted mb-2 flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: providerColor(activeAccount.provider) }}
              />
              {providerLabel(activeAccount.provider)} · {filtered.length} messages
            </p>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search emails..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg input-theme text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-theme-muted text-center">No emails in this account</p>
          ) : (
            filtered.map((e) => {
              const acc = accounts.find((a) => a.id === e.accountId)
              return (
                <button
                  key={e.id}
                  onClick={() => handleSelectEmail(e.id)}
                  className={`w-full text-left p-3 border-b border-[var(--glass-border)] hover-theme transition-colors ${
                    activeEmailId === e.id ? 'bg-accent-soft' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${e.read ? 'opacity-0' : 'bg-[var(--accent)]'}`} />
                    <span className="text-sm font-medium text-theme truncate flex-1">{e.fromName}</span>
                    {e.starred && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                    {e.linkedNoteId && <Link2 size={12} className="text-accent shrink-0" />}
                    <span className="text-xs text-theme-muted shrink-0">{formatDate(e.date)}</span>
                  </div>
                  <p className={`text-sm truncate ${e.read ? 'text-theme-muted' : 'text-theme-secondary'}`}>
                    {e.subject}
                  </p>
                  <p className="text-xs text-theme-muted truncate mt-0.5">{e.preview}</p>
                  {!activeAccountId && acc && (
                    <span className="text-[10px] text-theme-muted mt-1 inline-block opacity-70">{acc.email}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Email detail */}
      <div
        className={`
          ${mobilePanel !== 'detail' ? 'hidden md:flex' : 'flex'}
          flex-1 min-w-0
        `}
      >
        {activeEmail ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Email body */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--glass-border)]">
              <div className="p-4 border-b border-[var(--glass-border)] glass shrink-0">
                <button
                  className="md:hidden text-theme-muted hover:text-theme text-sm mb-2"
                  onClick={() => setMobilePanel('list')}
                >
                  ← Back to inbox
                </button>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-theme">{activeEmail.subject}</h2>
                    <p className="text-sm text-theme-muted mt-1">
                      From <span className="text-theme-secondary">{activeEmail.fromName}</span> &lt;{activeEmail.from}&gt;
                    </p>
                    <p className="text-xs text-theme-muted mt-0.5">{new Date(activeEmail.date).toLocaleString()}</p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold btn-accent flex items-center gap-1">
                    <Bot size={10} /> EtherMail AI
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap relative">
                  <button onClick={draftReply} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-xs">
                    <Reply size={14} /> Draft Reply
                  </button>
                  <button
                    onClick={() => setShowLinkMenu(!showLinkMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                  >
                    <Link2 size={14} />
                    {linkedNote ? 'Change Link' : 'Link to Note'}
                    <ChevronDown size={12} />
                  </button>
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                  >
                    <Sparkles size={14} /> AI Actions
                  </button>

                  {showLinkMenu && (
                    <div className="absolute top-full left-0 mt-1 z-10 glass-frost rounded-xl p-2 w-64 shadow-xl">
                      {notes.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            linkEmailToNote(activeEmail.id, n.id)
                            setShowLinkMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover-theme text-theme-secondary"
                        >
                          <Paperclip size={12} className="inline mr-2 text-accent" />
                          {n.title}
                        </button>
                      ))}
                      {linkedNote && (
                        <button
                          onClick={() => {
                            linkEmailToNote(activeEmail.id, null)
                            setShowLinkMenu(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover-theme text-red-400 flex items-center gap-2"
                        >
                          <Unlink size={12} /> Remove link
                        </button>
                      )}
                    </div>
                  )}

                  {showActions && (
                    <div className="absolute top-full left-32 mt-1 z-10 glass-frost rounded-xl p-2 w-48 shadow-xl">
                      {['Summarize thread', 'Create Task', 'Find Similar Note'].map((a) => (
                        <button
                          key={a}
                          onClick={() => {
                            setView('ai')
                            setAiMode('vault')
                            addChatMessage({ role: 'user', content: a, mode: 'vault' })
                            setShowActions(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover-theme text-theme-secondary"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="whitespace-pre-wrap text-sm text-theme-secondary leading-relaxed">
                  {activeEmail.body}
                </div>
              </div>
            </div>

            {/* AI Summary pane */}
            <div className="hidden md:flex w-72 lg:w-80 xl:w-96 flex-col glass-frost shrink-0 overflow-hidden">
              <div className="p-3 border-b border-[var(--glass-border)] flex items-center gap-2 shrink-0">
                <Sparkles size={16} className="text-accent" />
                <span className="text-sm font-semibold text-theme">AI Summary</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {aiSummary && (
                  <div className="text-sm">
                    <MarkdownContent content={aiSummary} />
                  </div>
                )}
              </div>

              {linkedNote && (
                <div className="border-t border-[var(--glass-border)] shrink-0">
                  <div className="p-3 flex items-center gap-2">
                    <Link2 size={14} className="text-accent" />
                    <span className="text-xs font-medium text-theme truncate">{linkedNote.title}</span>
                  </div>
                  <div className="px-3 pb-2 max-h-32 overflow-y-auto">
                    <p className="text-xs text-theme-muted line-clamp-4">
                      {linkedNote.content.replace(/[#*`[\]]/g, '').slice(0, 200)}...
                    </p>
                  </div>
                  <MiniGraph
                    nodes={nodes}
                    edges={edges}
                    focusId={activeEmail.id}
                    width={280}
                    height={90}
                  />
                  <button
                    onClick={() => selectNote(linkedNote.id)}
                    className="m-3 py-2 rounded-lg btn-accent text-sm w-[calc(100%-1.5rem)]"
                  >
                    Open in Vault
                  </button>
                </div>
              )}
            </div>

            {/* Mobile AI summary */}
            <div className="md:hidden border-t border-[var(--glass-border)] glass-frost p-4 max-h-48 overflow-y-auto shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-sm font-semibold text-theme">AI Summary</span>
              </div>
              {aiSummary && <MarkdownContent content={aiSummary} />}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-theme-muted">
            Select an email to read
          </div>
        )}
      </div>
    </div>
  )
}
