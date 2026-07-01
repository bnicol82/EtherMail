import { useState, useMemo } from 'react'
import {
  Star,
  Link2,
  Unlink,
  Reply,
  ReplyAll,
  Forward,
  Sparkles,
  Paperclip,
  ChevronDown,
  Bot,
  Trash2,
  Archive,
  Pencil,
  Send,
  Clock,
} from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { MarkdownContent } from './MarkdownContent'
import { AccountDot } from './AccountDot'
import { SwipeableEmailRow } from './SwipeableEmailRow'
import { EmailThreadRow } from './EmailThreadRow'
import { EmailThreadConversation } from './EmailThreadConversation'
import { PanelHideButton, PanelRestoreTab } from './PanelHideButton'
import { formatFileSize, fileIcon } from '../lib/utils'
import { EMAIL_FOLDERS } from '../lib/emailFolders'
import { summarizeEmail } from '../lib/emailSummary'
import { getAIContext } from '../lib/aiContext'
import { EmailQuickAck } from './EmailQuickAck'
import { SnoozeMenu } from './SnoozeMenu'
import { EmailInboxPanelHeader } from './EmailInboxPanelHeader'
import { EmailLabelPicker } from './EmailLabelsBar'
import { EmailInboxTraining } from './EmailInboxTraining'
import { classifyEmail, computeInboxStats } from '../lib/aiInbox'
import { followUpEmailIds } from '../lib/followUp'
import { getThreadForEmail, threadsForFilteredList } from '../lib/emailThreads'
import { formatScheduledAt } from '../lib/scheduledSend'
import { emailMatchesPerson } from '../lib/contactGraph'
import { sortEmails, sortEmailThreads } from '../lib/emailListSort'
import { VAULT_PERSONAL_ID } from '../data/seed'
import type { EmailFolder } from '../types'

export function EmailView() {
  const emails = useEtherMailStore((s) => s.emails)
  const accounts = useEtherMailStore((s) => s.accounts)
  const notes = useEtherMailStore((s) => s.notes)
  const activeEmailId = useEtherMailStore((s) => s.activeEmailId)
  const activeAccountId = useEtherMailStore((s) => s.activeAccountId)
  const activeVaultId = useEtherMailStore((s) => s.activeVaultId)
  const graphPersonFilter = useEtherMailStore((s) => s.graphPersonFilter)
  const setGraphPersonFilter = useEtherMailStore((s) => s.setGraphPersonFilter)
  const activeEmailFolder = useEtherMailStore((s) => s.activeEmailFolder)
  const emailFolderSort = useEtherMailStore((s) => s.emailFolderSort)
  const setEmailFolderSort = useEtherMailStore((s) => s.setEmailFolderSort)
  const hiddenPanels = useEtherMailStore((s) => s.hiddenPanels)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const linkEmailToNote = useEtherMailStore((s) => s.linkEmailToNote)
  const markEmailRead = useEtherMailStore((s) => s.markEmailRead)
  const markEmailUnread = useEtherMailStore((s) => s.markEmailUnread)
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
  const openComposeFromEmail = useEtherMailStore((s) => s.openComposeFromEmail)
  const sendQuickAck = useEtherMailStore((s) => s.sendQuickAck)
  const composeDraft = useEtherMailStore((s) => s.composeDraft)
  const cancelScheduledEmail = useEtherMailStore((s) => s.cancelScheduledEmail)
  const sendScheduledEmailNow = useEtherMailStore((s) => s.sendScheduledEmailNow)
  const snoozeEmail = useEtherMailStore((s) => s.snoozeEmail)
  const aiInboxEnabled = useEtherMailStore((s) => s.aiInboxEnabled)
  const setAiInboxEnabled = useEtherMailStore((s) => s.setAiInboxEnabled)
  const aiOutboxEnabled = useEtherMailStore((s) => s.aiOutboxEnabled)
  const setAiOutboxEnabled = useEtherMailStore((s) => s.setAiOutboxEnabled)
  const deleteAllOutboxEmails = useEtherMailStore((s) => s.deleteAllOutboxEmails)
  const inboxTraining = useEtherMailStore((s) => s.inboxTraining)
  const emailInboxOverrides = useEtherMailStore((s) => s.emailInboxOverrides)
  const trainEmailImportant = useEtherMailStore((s) => s.trainEmailImportant)
  const trainEmailJunk = useEtherMailStore((s) => s.trainEmailJunk)
  const emailSelectionMode = useEtherMailStore((s) => s.emailSelectionMode)
  const setEmailSelectionMode = useEtherMailStore((s) => s.setEmailSelectionMode)
  const selectedEmailIds = useEtherMailStore((s) => s.selectedEmailIds)
  const toggleEmailSelection = useEtherMailStore((s) => s.toggleEmailSelection)
  const selectAllVisibleEmails = useEtherMailStore((s) => s.selectAllVisibleEmails)
  const clearEmailSelection = useEtherMailStore((s) => s.clearEmailSelection)
  const batchArchiveEmails = useEtherMailStore((s) => s.batchArchiveEmails)
  const batchDeleteEmails = useEtherMailStore((s) => s.batchDeleteEmails)
  const batchStarEmails = useEtherMailStore((s) => s.batchStarEmails)
  const batchMarkEmailsRead = useEtherMailStore((s) => s.batchMarkEmailsRead)
  const followUpFilterEnabled = useEtherMailStore((s) => s.followUpFilterEnabled)
  const setFollowUpFilterEnabled = useEtherMailStore((s) => s.setFollowUpFilterEnabled)
  const emailLabels = useEtherMailStore((s) => s.emailLabels)
  const activeLabelFilter = useEtherMailStore((s) => s.activeLabelFilter)
  const setActiveLabelFilter = useEtherMailStore((s) => s.setActiveLabelFilter)
  const createEmailLabel = useEtherMailStore((s) => s.createEmailLabel)
  const deleteEmailLabel = useEtherMailStore((s) => s.deleteEmailLabel)
  const toggleEmailLabelOnEmail = useEtherMailStore((s) => s.toggleEmailLabelOnEmail)
  const batchApplyEmailLabel = useEtherMailStore((s) => s.batchApplyEmailLabel)
  const threadViewEnabled = useEtherMailStore((s) => s.threadViewEnabled)
  const setThreadViewEnabled = useEtherMailStore((s) => s.setThreadViewEnabled)

  const [filter, setFilter] = useState('')
  const [showLinkMenu, setShowLinkMenu] = useState(false)
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false)
  const [batchLabelId, setBatchLabelId] = useState('')

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

  const inboxStats = useMemo(
    () => computeInboxStats(emails, inboxTraining, emailInboxOverrides),
    [emails, inboxTraining, emailInboxOverrides],
  )

  const followUpIds = useMemo(
    () => followUpEmailIds(emails),
    [emails],
  )

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const label of emailLabels) {
      counts[label.id] = emails.filter(
        (e) =>
          (e.folder ?? 'inbox') === activeEmailFolder &&
          e.labelIds?.includes(label.id),
      ).length
    }
    return counts
  }, [emails, emailLabels, activeEmailFolder])

  const getClassification = (emailId: string) => {
    const email = emails.find((e) => e.id === emailId)
    if (!email) return null
    return classifyEmail(email, inboxTraining, emailInboxOverrides[email.id])
  }

  const activeClassification = activeEmail
    ? classifyEmail(activeEmail, inboxTraining, emailInboxOverrides[activeEmail.id])
    : null

  const emailInScope = (e: (typeof emails)[number]) => {
    const acc = accounts.find((a) => a.id === e.accountId)
    if (!acc?.connected) return false
    if (activeAccountId && e.accountId !== activeAccountId) return false
    if (activeVaultId && (acc.defaultVaultId ?? VAULT_PERSONAL_ID) !== activeVaultId) return false
    if (graphPersonFilter && !emailMatchesPerson(e, graphPersonFilter)) return false
    return true
  }

  const folderCounts = useMemo(() => {
    const counts: Record<EmailFolder, number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      scheduled: 0,
      archive: 0,
      trash: 0,
    }
    for (const e of emails) {
      if (!emailInScope(e)) continue
      const f = e.folder ?? 'inbox'
      counts[f]++
    }
    return counts
  }, [emails, accounts, activeAccountId, activeVaultId, graphPersonFilter])

  const currentFolderSort = emailFolderSort[activeEmailFolder]

  const filtered = useMemo(() => {
    const list = emails.filter((e) => {
      if (!emailInScope(e)) return false
      if ((e.folder ?? 'inbox') !== activeEmailFolder) return false
      if (activeEmailFolder === 'inbox' && (aiInboxEnabled || aiOutboxEnabled)) {
        const c = classifyEmail(e, inboxTraining, emailInboxOverrides[e.id])
        if (aiInboxEnabled && !c.important) return false
        if (aiOutboxEnabled && c.important) return false
      }
      if (followUpFilterEnabled && activeEmailFolder === 'inbox' && !followUpIds.has(e.id)) {
        return false
      }
      if (activeLabelFilter && !e.labelIds?.includes(activeLabelFilter)) {
        return false
      }
      if (!filter) return true
      const q = filter.toLowerCase()
      return (
        e.subject.toLowerCase().includes(q) ||
        e.fromName.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q)
      )
    })
    return sortEmails(list, currentFolderSort)
  }, [
    emails,
    activeEmailFolder,
    activeAccountId,
    activeVaultId,
    graphPersonFilter,
    accounts,
    aiInboxEnabled,
    aiOutboxEnabled,
    inboxTraining,
    emailInboxOverrides,
    followUpFilterEnabled,
    followUpIds,
    activeLabelFilter,
    filter,
    currentFolderSort,
  ])

  const accountEmailPool = useMemo(
    () => emails.filter((e) => emailInScope(e)),
    [emails, accounts, activeAccountId, activeVaultId, graphPersonFilter],
  )

  const threadedList = useMemo(() => {
    if (!threadViewEnabled) return []
    const threads = threadsForFilteredList(accountEmailPool, filtered)
    return sortEmailThreads(threads, currentFolderSort)
  }, [threadViewEnabled, accountEmailPool, filtered, currentFolderSort])

  const activeThread = useMemo(
    () =>
      activeEmail && threadViewEnabled
        ? getThreadForEmail(activeEmail, accountEmailPool)
        : null,
    [activeEmail, threadViewEnabled, accountEmailPool],
  )

  const visibleListIds = useMemo(
    () =>
      threadViewEnabled
        ? threadedList.map((t) => t.latest.id)
        : filtered.map((e) => e.id),
    [threadViewEnabled, threadedList, filtered],
  )

  const handleSelectEmail = (id: string, threadEmailIds?: string[]) => {
    const email = emails.find((e) => e.id === id)
    const folder = email?.folder ?? 'inbox'
    if (email && (folder === 'drafts' || folder === 'scheduled')) {
      openComposeFromEmail(id)
      return
    }
    selectEmail(id)
    if (threadEmailIds?.length) {
      for (const threadId of threadEmailIds) markEmailRead(threadId)
    } else {
      markEmailRead(id)
    }
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
      <div className="shrink-0 flex flex-wrap gap-1 px-2 py-1 border-b border-[var(--glass-border)] glass">
        <PanelRestoreTab panelId="email-list" label="Inbox" />
        <PanelRestoreTab panelId="email-detail" label="Email" />
        <PanelRestoreTab panelId="email-ai" label="AI Summary" />
      </div>

      {graphPersonFilter && (
        <div className="shrink-0 px-3 py-2 border-b border-[var(--glass-border)] glass flex items-center justify-between gap-2 text-xs">
          <span className="text-theme-secondary">
            Showing mail with{' '}
            <span className="text-pink-400 font-medium">
              {graphPersonFilter.replace(/^person-/, '').replace(/-/g, ' ')}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setGraphPersonFilter(null)}
            className="text-accent hover:underline shrink-0"
          >
            Clear contact filter
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Folder + list column */}
      {!listHidden && (
        <div
          className={`
            ${mobilePanel === 'detail' ? 'hidden lg:flex' : 'flex'}
            w-full lg:w-72 xl:w-80 flex-col glass border-r border-[var(--glass-border)] shrink-0 min-h-0
          `}
        >
          <EmailInboxPanelHeader
            inboxTitle={inboxTitle}
            activeAccount={activeAccount ?? null}
            activeAccountId={activeAccountId}
            activeEmailFolder={activeEmailFolder}
            currentFolderLabel={currentFolder?.label ?? 'mail'}
            folderCounts={folderCounts}
            filter={filter}
            onFilterChange={setFilter}
            onFolderChange={setActiveEmailFolder}
            onClearAccount={() => selectAccount(null)}
            folderSort={currentFolderSort}
            onFolderSortChange={(sort) => setEmailFolderSort(activeEmailFolder, sort)}
            aiInboxEnabled={aiInboxEnabled}
            aiOutboxEnabled={aiOutboxEnabled}
            inboxStats={inboxStats}
            onToggleAiInbox={() => setAiInboxEnabled(!aiInboxEnabled)}
            onToggleAiOutbox={() => setAiOutboxEnabled(!aiOutboxEnabled)}
            onDeleteAllOutbox={deleteAllOutboxEmails}
            emailLabels={emailLabels}
            activeLabelFilter={activeLabelFilter}
            labelCounts={labelCounts}
            onLabelFilter={setActiveLabelFilter}
            onCreateLabel={(name, color) => createEmailLabel(name, color)}
            onDeleteLabel={deleteEmailLabel}
            threadViewEnabled={threadViewEnabled}
            onToggleThreadView={() => setThreadViewEnabled(!threadViewEnabled)}
            followUpFilterEnabled={followUpFilterEnabled}
            followUpCount={followUpIds.size}
            onToggleFollowUp={() => setFollowUpFilterEnabled(!followUpFilterEnabled)}
            emailSelectionMode={emailSelectionMode}
            onToggleSelectionMode={() => setEmailSelectionMode(true)}
            onClearSelection={clearEmailSelection}
            selectedCount={selectedEmailIds.length}
            visibleListCount={visibleListIds.length}
            onSelectAllVisible={() => selectAllVisibleEmails(visibleListIds)}
            onBatchMarkRead={() => batchMarkEmailsRead(selectedEmailIds, true)}
            onBatchStar={() => batchStarEmails(selectedEmailIds, true)}
            onBatchArchive={() => batchArchiveEmails(selectedEmailIds)}
            onBatchDelete={() => {
              batchDeleteEmails(selectedEmailIds)
              setBatchConfirmDelete(false)
            }}
            onBatchApplyLabel={(labelId) => batchApplyEmailLabel(selectedEmailIds, labelId)}
            batchConfirmDelete={batchConfirmDelete}
            onBatchConfirmDelete={setBatchConfirmDelete}
            batchLabelId={batchLabelId}
            onBatchLabelIdChange={setBatchLabelId}
          />
          <div className="flex-1 overflow-y-auto">
            {(threadViewEnabled ? threadedList.length : filtered.length) === 0 ? (
              <p className="p-4 text-sm text-theme-muted text-center">
                {followUpFilterEnabled && activeEmailFolder === 'inbox'
                  ? 'No emails flagged for follow-up — you are caught up!'
                  : activeLabelFilter
                    ? `No emails with label "${emailLabels.find((l) => l.id === activeLabelFilter)?.name ?? 'selected'}"`
                  : aiOutboxEnabled && activeEmailFolder === 'inbox'
                  ? 'No filtered mail in AI Outbox — nothing AI flagged as junk or low priority'
                  : aiInboxEnabled && activeEmailFolder === 'inbox' && inboxStats.hidden > 0
                    ? `No important mail — ${inboxStats.hidden} filtered by AI Inbox`
                    : `No messages in ${currentFolder?.label ?? 'folder'}`}
              </p>
            ) : threadViewEnabled ? (
              threadedList.map((thread) => {
                const acc = accounts.find((a) => a.id === thread.latest.accountId)
                const c = getClassification(thread.latest.id)
                const rowLabels = emailLabels.filter((l) =>
                  thread.latest.labelIds?.includes(l.id),
                )
                return (
                  <EmailThreadRow
                    key={thread.id}
                    thread={thread}
                    account={acc}
                    active={activeEmailId === thread.latest.id}
                    onSelect={() =>
                      handleSelectEmail(
                        thread.latest.id,
                        thread.emails.map((e) => e.id),
                      )
                    }
                    onDelete={() => deleteEmail(thread.latest.id)}
                    onQuickAck={(ack) => sendQuickAck(thread.latest.id, ack)}
                    category={c?.category}
                    showCategory={
                      activeEmailFolder === 'inbox' && (aiInboxEnabled || aiOutboxEnabled)
                    }
                    selectionMode={emailSelectionMode}
                    selected={selectedEmailIds.includes(thread.latest.id)}
                    onToggleSelect={() => toggleEmailSelection(thread.latest.id)}
                    labels={rowLabels}
                  />
                )
              })
            ) : (
              filtered.map((e) => {
                const acc = accounts.find((a) => a.id === e.accountId)
                const c = getClassification(e.id)
                const rowLabels = emailLabels.filter((l) => e.labelIds?.includes(l.id))
                return (
                  <SwipeableEmailRow
                    key={e.id}
                    email={e}
                    account={acc}
                    active={activeEmailId === e.id}
                    onSelect={() => handleSelectEmail(e.id)}
                    onDelete={() => deleteEmail(e.id)}
                    onQuickAck={(ack) => sendQuickAck(e.id, ack)}
                    category={c?.category}
                    showCategory={
                      activeEmailFolder === 'inbox' && (aiInboxEnabled || aiOutboxEnabled)
                    }
                    selectionMode={emailSelectionMode}
                    selected={selectedEmailIds.includes(e.id)}
                    onToggleSelect={() => toggleEmailSelection(e.id)}
                    labels={rowLabels}
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
              {(activeEmail.folder === 'drafts' || activeEmail.folder === 'scheduled') &&
                !composeDraft && (
                  <div className="shrink-0 px-3 pt-3 lg:px-4">
                    <button
                      type="button"
                      onClick={() => openComposeFromEmail(activeEmail.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl btn-accent text-sm font-semibold"
                    >
                      <Pencil size={16} />
                      Continue editing draft
                    </button>
                    <p className="text-[10px] text-theme-muted text-center mt-2">
                      Draft preview below — tap to open the editor and type your reply
                    </p>
                  </div>
                )}
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
                    <p className="text-xs text-theme-muted mt-0.5">
                      To {activeEmail.to}
                      {activeEmail.cc && <span className="ml-2">Cc {activeEmail.cc}</span>}
                    </p>
                    <p className="text-xs text-theme-muted mt-0.5">{new Date(activeEmail.date).toLocaleString()}</p>
                    {activeEmail.scheduledAt && (
                      <p className="text-xs text-accent mt-1 flex items-center gap-1">
                        <Clock size={12} />
                        Scheduled to send {formatScheduledAt(activeEmail.scheduledAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <PanelHideButton panelId="email-detail" label="email" />
                    <span className="px-2 py-1 rounded-lg text-[10px] font-semibold btn-accent flex items-center gap-1">
                      <Bot size={10} /> AI
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2.5 flex-wrap relative">
                  {activeEmail.folder === 'scheduled' && activeEmail.scheduledAt && (
                    <>
                      <button
                        onClick={() => sendScheduledEmailNow(activeEmail.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-xs"
                      >
                        <Send size={14} /> Send now
                      </button>
                      <button
                        onClick={() => cancelScheduledEmail(activeEmail.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                      >
                        <Clock size={14} /> Cancel schedule
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      (activeEmail.folder === 'drafts' || activeEmail.folder === 'scheduled')
                        ? openComposeFromEmail(activeEmail.id)
                        : openCompose({ replyTo: activeEmail })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-xs"
                  >
                    {(activeEmail.folder === 'drafts' || activeEmail.folder === 'scheduled') ? (
                      <>
                        <Pencil size={14} /> Edit draft
                      </>
                    ) : (
                      <>
                        <Reply size={14} /> Reply
                      </>
                    )}
                  </button>
                  {(activeEmail.folder ?? 'inbox') !== 'drafts' &&
                    activeEmail.folder !== 'scheduled' && (
                  <button
                    onClick={() => openCompose({ replyAllTo: activeEmail })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                  >
                    <ReplyAll size={14} /> Reply all
                  </button>
                  )}
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
                    onClick={() =>
                      activeEmail.read
                        ? markEmailUnread(activeEmail.id)
                        : markEmailRead(activeEmail.id)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
                  >
                    {activeEmail.read ? 'Mark unread' : 'Mark read'}
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
                  {(activeEmail.folder ?? 'inbox') === 'inbox' && (
                    <SnoozeMenu onSnooze={(preset) => snoozeEmail(activeEmail.id, preset)} />
                  )}
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
                {activeThread && activeThread.emails.length > 1 && (
                  <EmailThreadConversation
                    thread={activeThread}
                    activeEmailId={activeEmailId}
                    onSelectMessage={(id) => handleSelectEmail(id)}
                  />
                )}
                {(!activeThread || activeThread.emails.length <= 1) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        activeEmail.folder === 'drafts' ||
                        activeEmail.folder === 'scheduled'
                      ) {
                        openComposeFromEmail(activeEmail.id)
                      }
                    }}
                    className={`whitespace-pre-wrap text-sm text-theme-secondary leading-relaxed w-full text-left ${
                      activeEmail.folder === 'drafts' || activeEmail.folder === 'scheduled'
                        ? 'rounded-xl glass p-3 hover-theme cursor-pointer'
                        : ''
                    }`}
                  >
                    {activeEmail.body}
                  </button>
                )}
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
                          {att.dataUrl && (
                            <a
                              href={att.dataUrl}
                              download={att.filename}
                              className="text-xs text-accent hover:underline shrink-0"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <EmailQuickAck email={activeEmail} />
                <EmailLabelPicker
                  labels={emailLabels}
                  selectedIds={activeEmail.labelIds ?? []}
                  onToggle={(labelId) => toggleEmailLabelOnEmail(activeEmail.id, labelId)}
                />
                {(activeEmail.folder ?? 'inbox') === 'inbox' && (
                  <EmailInboxTraining
                    email={activeEmail}
                    classificationReason={activeClassification?.reason}
                    onMarkImportant={() => trainEmailImportant(activeEmail.id)}
                    onMarkJunk={(cat) => trainEmailJunk(activeEmail.id, cat)}
                  />
                )}
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
