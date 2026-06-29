import { useState, useMemo } from 'react'
import {
  Search,
  Star,
  Link2,
  Unlink,
  Reply,
  Forward,
  Sparkles,
  Paperclip,
  ChevronDown,
  X,
  Bot,
  Trash2,
  Archive,
  Inbox,
  Send,
  FileEdit,
  SquarePen,
} from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { MarkdownContent } from './MarkdownContent'
import { AccountDot } from './AccountDot'
import { SwipeableEmailRow } from './SwipeableEmailRow'
import { PanelHideButton, PanelRestoreTab } from './PanelHideButton'
import { formatFileSize, fileIcon, providerColor, providerLabel } from '../lib/utils'
import { EMAIL_FOLDERS } from '../lib/emailFolders'
import { summarizeEmail } from '../lib/emailSummary'
import { getAIContext } from '../lib/aiContext'
import { EmailQuickAck } from './EmailQuickAck'
import type { EmailFolder } from '../types'

const FOLDER_ICONS: Record<EmailFolder, typeof Inbox> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  archive: Archive,
  trash: Trash2,
}

export function EmailView() {
  const emails = useEtherMailStore((s) => s.emails)
  const accounts = useEtherMailStore((s) => s.accounts)
  const notes = useEtherMailStore((s) => s.notes)
  const activeEmailId = useEtherMailStore((s) => s.activeEmailId)
  const activeAccountId = useEtherMailStore((s) => s.activeAccountId)
  const activeEmailFolder = useEtherMailStore((s) => s.activeEmailFolder)
  const hiddenPanels = useEtherMailStore((s) => s.hiddenPanels)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const linkEmailToNote = useEtherMailStore((s) => s.linkEmailToNote)
  const markEmailRead = useEtherMailStore((s) => s.markEmailRead)
  const deleteEmail = useEtherMailStore((s) => s.deleteEmail)
  const archiveEmail = useEtherMailStore((s) => s.archiveEmail)
  const toggleEmailStar = useEtherMailStore((s) => s.toggleEmailStar)
  const setActiveEmailFolder = useEtherMailStore((s) => s.setActiveEmailFolder)
  const mobilePanel = useEtherMailStore((s) => s.mobilePanel)
  const setMobilePanel = useEtherMailStore((s) => s.setMobilePanel)
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectAccount = useEtherMailStore((s) => s.selectAccount)
  const submitAiQuery = useEtherMailStore((s) => s.submitAiQuery)
  const setAiAssistantOpen = useEtherMailStore((s) => s.setAiAssistantOpen)
  const emailAttachments = useEtherMailStore((s) => s.emailAttachments)
  const openCompose = useEtherMailStore((s) => s.openCompose)

  const [filter, setFilter] = useState('')
  const [showLinkMenu, setShowLinkMenu] = useState(false)

  const listHidden = hiddenPanels['email-list'] ?? false
  const detailHidden = hiddenPanels['email-detail'] ?? false
  const aiHidden = hiddenPanels['email-ai'] ?? false

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

  const folderCounts = useMemo(() => {
    const counts: Record<EmailFolder, number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      archive: 0,
      trash: 0,
    }
    for (const e of emails) {
      const acc = accounts.find((a) => a.id === e.accountId)
      if (!acc?.connected) continue
      if (activeAccountId && e.accountId !== activeAccountId) continue
      const f = e.folder ?? 'inbox'
      counts[f]++
    }
    return counts
  }, [emails, accounts, activeAccountId])

  const filtered = emails.filter((e) => {
    const acc = accounts.find((a) => a.id === e.accountId)
    if (!acc?.connected) return false
    if (activeAccountId && e.accountId !== activeAccountId) return false
    if ((e.folder ?? 'inbox') !== activeEmailFolder) return false
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      e.subject.toLowerCase().includes(q) ||
      e.fromName.toLowerCase().includes(q) ||
      e.preview.toLowerCase().includes(q)
    )
  })

  const handleSelectEmail = (id: string) => {
    const email = emails.find((e) => e.id === id)
    if (email && (email.folder ?? 'inbox') === 'drafts') {
      openCompose({
        id: email.id,
        to: email.to,
        subject: email.subject,
        body: email.body,
        accountId: email.accountId,
      })
      return
    }
    selectEmail(id)
    markEmailRead(id)
    setMobilePanel('detail')
  }

  const runAiAction = (action: string) => {
    setAiAssistantOpen(true)
    submitAiQuery(action, aiCtx.contextPrefix)
  }

  const inboxTitle = activeAccount ? activeAccount.email : 'Unified Inbox'
  const currentFolder = EMAIL_FOLDERS.find((f) => f.id === activeEmailFolder)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 flex flex-col gap-1 p-2 border-b border-[var(--glass-border)] glass">
        <PanelRestoreTab panelId="email-list" label="Inbox" />
        <PanelRestoreTab panelId="email-detail" label="Email" />
        <PanelRestoreTab panelId="email-ai" label="AI Summary" />
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Folder + list column */}
      {!listHidden && (
        <div
          className={`
            ${mobilePanel === 'detail' ? 'hidden lg:flex' : 'flex'}
            w-full lg:w-72 xl:w-80 flex-col glass border-r border-[var(--glass-border)] shrink-0
          `}
        >
          <div className="p-2.5 sm:p-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="font-semibold text-theme truncate text-sm flex-1 min-w-0">{inboxTitle}</h2>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openCompose()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg btn-accent text-[10px] sm:text-xs font-medium"
                  title="Compose email"
                >
                  <SquarePen size={12} />
                  <span className="hidden xs:inline sm:inline">Compose</span>
                </button>
                {activeAccountId && (
                  <button
                    onClick={() => selectAccount(null)}
                    className="p-1 rounded-lg hover-theme text-theme-muted"
                    title="Show all inboxes"
                  >
                    <X size={14} />
                  </button>
                )}
                <PanelHideButton panelId="email-list" label="inbox" />
              </div>
            </div>
            {activeAccount && (
              <p className="text-[10px] text-theme-muted mb-2 flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: providerColor(activeAccount.provider) }}
                />
                {providerLabel(activeAccount.provider)}
              </p>
            )}
            <p className="text-[10px] text-theme-muted mb-2">
              Mail folders live here — attachments sync to <strong className="text-theme-secondary">Vault → Email Files</strong>
            </p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Search ${currentFolder?.label.toLowerCase() ?? 'mail'}...`}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg input-theme text-sm outline-none"
              />
            </div>
            <nav className="flex flex-wrap gap-1">
              {EMAIL_FOLDERS.map(({ id, label }) => {
                const Icon = FOLDER_ICONS[id]
                return (
                  <button
                    key={id}
                    onClick={() => setActiveEmailFolder(id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors ${
                      activeEmailFolder === id
                        ? 'bg-accent-soft text-accent font-medium'
                        : 'text-theme-muted hover-theme'
                    }`}
                  >
                    <Icon size={11} />
                    {label}
                    {folderCounts[id] > 0 && (
                      <span className="opacity-70">({folderCounts[id]})</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-theme-muted text-center">
                No messages in {currentFolder?.label ?? 'folder'}
              </p>
            ) : (
              filtered.map((e) => {
                const acc = accounts.find((a) => a.id === e.accountId)
                return (
                  <SwipeableEmailRow
                    key={e.id}
                    email={e}
                    account={acc}
                    active={activeEmailId === e.id}
                    onSelect={() => handleSelectEmail(e.id)}
                    onDelete={() => deleteEmail(e.id)}
                  />
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Detail + AI */}
      <div
        className={`
          ${mobilePanel !== 'detail' && !listHidden ? 'hidden lg:flex' : mobilePanel !== 'detail' && listHidden ? 'hidden' : 'flex'}
          flex-1 min-w-0 flex-col lg:flex-row overflow-hidden
        `}
      >
        {activeEmail && !detailHidden ? (
          <>
            <div className="flex-1 flex flex-col min-w-0 min-h-0 order-2 lg:order-1">
              <div className="p-3 lg:p-4 border-b border-[var(--glass-border)] glass shrink-0">
                <button
                  className="lg:hidden text-theme-muted hover:text-theme text-sm mb-2"
                  onClick={() => setMobilePanel('list')}
                >
                  ← Back to {currentFolder?.label ?? 'inbox'}
                </button>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
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
                  <div className="flex items-center gap-1 shrink-0">
                    <PanelHideButton panelId="email-detail" label="email" />
                    <span className="px-2 py-1 rounded-lg text-[10px] font-semibold btn-accent flex items-center gap-1">
                      <Bot size={10} /> AI
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2.5 flex-wrap relative">
                  <button
                    onClick={() => openCompose({ replyTo: activeEmail })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-xs"
                  >
                    <Reply size={14} /> Reply
                  </button>
                  <button
                    onClick={() => openCompose({ forwardEmail: activeEmail })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                  >
                    <Forward size={14} /> Forward
                  </button>
                  <button
                    onClick={() => runAiAction('Draft a reply to this email')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                  >
                    <Sparkles size={14} /> AI Draft
                  </button>
                  <button
                    onClick={() => toggleEmailStar(activeEmail.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs ${
                      activeEmail.starred ? 'text-amber-400' : 'text-theme-secondary hover-theme'
                    }`}
                  >
                    <Star size={14} className={activeEmail.starred ? 'fill-amber-400' : ''} /> Star
                  </button>
                  <button
                    onClick={() => archiveEmail(activeEmail.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                  >
                    <Archive size={14} /> Archive
                  </button>
                  <button
                    onClick={() => deleteEmail(activeEmail.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-red-400 hover-theme"
                  >
                    <Trash2 size={14} />
                    {(activeEmail.folder ?? 'inbox') === 'trash' ? 'Delete forever' : 'Delete'}
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
                      <span className="text-[10px] opacity-70">· also in Vault → Email Files</span>
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
                <EmailQuickAck email={activeEmail} />
              </div>
            </div>

            {!aiHidden && (
              <aside className="order-1 lg:order-2 w-full lg:w-72 xl:w-80 shrink-0 flex flex-col glass-frost border-[var(--glass-border)] lg:border-l min-h-[200px] lg:min-h-0 max-h-[45vh] lg:max-h-none overflow-hidden">
                <div className="p-3 border-b border-[var(--glass-border)] flex items-center gap-2 shrink-0 bg-accent-soft">
                  <Sparkles size={16} className="text-accent" />
                  <span className="text-sm font-semibold text-theme">AI Summary</span>
                  <span className="ml-auto text-[10px] text-accent px-2 py-0.5 rounded-full glass">Vault AI</span>
                  <PanelHideButton panelId="email-ai" label="AI summary" />
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
                  <div className="border-t border-[var(--glass-border)] shrink-0 p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 size={12} className="text-accent" />
                      <span className="text-xs font-medium text-theme truncate">{linkedNote.title}</span>
                    </div>
                    <button
                      onClick={() => selectNote(linkedNote.id, { view: 'notes' })}
                      className="py-1.5 rounded-lg btn-accent text-xs w-full"
                    >
                      Open in Notes
                    </button>
                  </div>
                )}
              </aside>
            )}
          </>
        ) : activeEmail && detailHidden && !aiHidden ? (
          <div className="flex-1 flex items-center justify-center text-theme-muted text-sm">
            Email body hidden — use the tab to show it
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-theme-muted">
            Select an email to read
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
