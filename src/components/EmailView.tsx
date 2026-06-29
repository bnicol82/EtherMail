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
import { AccountDot } from './AccountDot'
import { formatDate, formatFileSize, fileIcon, providerColor, providerLabel } from '../lib/utils'
import { summarizeEmail } from '../lib/emailSummary'
import { getAIContext } from '../lib/aiContext'

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
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectAccount = useEtherMailStore((s) => s.selectAccount)
  const submitAiQuery = useEtherMailStore((s) => s.submitAiQuery)
  const setAiAssistantOpen = useEtherMailStore((s) => s.setAiAssistantOpen)
  const emailAttachments = useEtherMailStore((s) => s.emailAttachments)
  const { nodes, edges } = useGraph()

  const [filter, setFilter] = useState('')
  const [showLinkMenu, setShowLinkMenu] = useState(false)

  const activeAccount = activeAccountId
    ? accounts.find((a) => a.id === activeAccountId)
    : null

  const activeEmail = emails.find((e) => e.id === activeEmailId)
  const linkedNote = activeEmail?.linkedNoteId
    ? notes.find((n) => n.id === activeEmail.linkedNoteId)
    : null

  const activeEmailAttachments = useMemo(() => {
    if (!activeEmail?.attachmentIds?.length) return []
    return activeEmail.attachmentIds
      .map((id) => emailAttachments.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => !!a)
  }, [activeEmail, emailAttachments])

  const aiSummary = useMemo(
    () => (activeEmail ? summarizeEmail(activeEmail, notes) : null),
    [activeEmail, notes],
  )

  const aiCtx = getAIContext('email', { activeEmail, emails, notes })

  const filtered = emails.filter((e) => {
    const acc = accounts.find((a) => a.id === e.accountId)
    if (!acc?.connected) return false
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

  const runAiAction = (action: string) => {
    setAiAssistantOpen(true)
    submitAiQuery(action, aiCtx.contextPrefix)
  }

  const inboxTitle = activeAccount ? activeAccount.email : 'Unified Inbox'

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Email list */}
      <div
        className={`
          ${mobilePanel === 'detail' ? 'hidden lg:flex' : 'flex'}
          w-full lg:w-60 xl:w-64 flex-col glass border-r border-[var(--glass-border)] shrink-0
        `}
      >
        <div className="p-3 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-theme truncate text-sm">{inboxTitle}</h2>
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
                    <AccountDot account={acc} />
                    {!e.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
                    <span className="text-sm font-medium text-theme truncate flex-1">{e.fromName}</span>
                    {e.starred && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                    {e.linkedNoteId && <Link2 size={12} className="text-accent shrink-0" />}
                    {e.attachmentIds && e.attachmentIds.length > 0 && (
                      <Paperclip size={12} className="text-theme-muted shrink-0" />
                    )}
                    <span className="text-xs text-theme-muted shrink-0">{formatDate(e.date)}</span>
                  </div>
                  <p className={`text-sm truncate pl-4 ${e.read ? 'text-theme-muted' : 'text-theme-secondary'}`}>
                    {e.subject}
                  </p>
                  <p className="text-xs text-theme-muted truncate mt-0.5 pl-4">{e.preview}</p>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Email detail + AI summary — 2-column layout always when email selected */}
      <div
        className={`
          ${mobilePanel !== 'detail' ? 'hidden lg:flex' : 'flex'}
          flex-1 min-w-0 flex-col lg:flex-row overflow-hidden
        `}
      >
        {activeEmail ? (
          <>
            {/* Email body */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 order-2 lg:order-1">
              <div className="p-3 lg:p-4 border-b border-[var(--glass-border)] glass shrink-0">
                <button
                  className="lg:hidden text-theme-muted hover:text-theme text-sm mb-2"
                  onClick={() => setMobilePanel('list')}
                >
                  ← Back to inbox
                </button>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-semibold text-theme truncate">{activeEmail.subject}</h2>
                    <p className="text-sm text-theme-muted mt-1 flex items-center gap-2 flex-wrap">
                      From <span className="text-theme-secondary">{activeEmail.fromName}</span>
                      <AccountDot
                        account={accounts.find((a) => a.id === activeEmail.accountId)}
                        showLabel
                      />
                    </p>
                    <p className="text-xs text-theme-muted mt-0.5">{new Date(activeEmail.date).toLocaleString()}</p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold btn-accent flex items-center gap-1">
                    <Bot size={10} /> AI
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap relative">
                  <button
                    onClick={() => runAiAction('Draft a reply to this email')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-xs"
                  >
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
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <div className="whitespace-pre-wrap text-sm text-theme-secondary leading-relaxed">
                  {activeEmail.body}
                </div>
                {activeEmailAttachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[var(--glass-border)]">
                    <p className="text-xs text-theme-muted mb-2 flex items-center gap-1">
                      <Paperclip size={12} />
                      {activeEmailAttachments.length} attachment{activeEmailAttachments.length > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2">
                      {activeEmailAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg glass text-sm"
                        >
                          <span>{fileIcon(att.mimeType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-theme truncate">{att.filename}</p>
                            <p className="text-xs text-theme-muted">{formatFileSize(att.sizeBytes)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Summary pane — always visible, first on mobile */}
            <aside className="order-1 lg:order-2 w-full lg:w-72 xl:w-80 shrink-0 flex flex-col glass-frost border-[var(--glass-border)] lg:border-l min-h-[200px] lg:min-h-0 max-h-[45vh] lg:max-h-none overflow-hidden">
              <div className="p-3 border-b border-[var(--glass-border)] flex items-center gap-2 shrink-0 bg-accent-soft">
                <Sparkles size={16} className="text-accent" />
                <span className="text-sm font-semibold text-theme">AI Summary</span>
                <span className="ml-auto text-[10px] text-accent px-2 py-0.5 rounded-full glass">Vault AI</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {aiSummary ? (
                  <div className="text-sm">
                    <MarkdownContent content={aiSummary} />
                  </div>
                ) : (
                  <p className="text-sm text-theme-muted">Select an email to see its AI summary.</p>
                )}
              </div>

              <div className="shrink-0 border-t border-[var(--glass-border)] p-2 flex gap-1 flex-wrap">
                {['Summarize', 'Draft reply', 'Find related notes'].map((a) => (
                  <button
                    key={a}
                    onClick={() => runAiAction(a)}
                    className="text-[10px] px-2 py-1 rounded-full btn-accent"
                  >
                    {a}
                  </button>
                ))}
              </div>

              {linkedNote && (
                <div className="border-t border-[var(--glass-border)] shrink-0">
                  <div className="p-2 flex items-center gap-2">
                    <Link2 size={12} className="text-accent" />
                    <span className="text-xs font-medium text-theme truncate">{linkedNote.title}</span>
                  </div>
                  <MiniGraph nodes={nodes} edges={edges} focusId={activeEmail.id} width={260} height={70} />
                  <button
                    onClick={() => selectNote(linkedNote.id)}
                    className="m-2 py-1.5 rounded-lg btn-accent text-xs w-[calc(100%-1rem)]"
                  >
                    Open in Vault
                  </button>
                </div>
              )}
            </aside>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-theme-muted">
            Select an email to read
          </div>
        )}
      </div>
    </div>
  )
}
