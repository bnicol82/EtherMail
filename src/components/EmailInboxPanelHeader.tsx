import { useState, useEffect, type ReactNode } from 'react'
import {
  Search,
  X,
  Inbox,
  Send,
  FileEdit,
  Clock,
  Archive,
  Trash2,
  Bot,
  ShieldOff,
  MailWarning,
  MessagesSquare,
  List,
  CheckSquare,
  Square,
  Tag,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { PanelHideButton } from './PanelHideButton'
import { AIInboxBar } from './AIInboxBar'
import { EmailLabelsBar } from './EmailLabelsBar'
import { EMAIL_FOLDERS } from '../lib/emailFolders'
import { EMAIL_SORT_OPTIONS, type EmailSortKey } from '../lib/emailListSort'
import { providerColor, providerLabel } from '../lib/utils'
import type { EmailAccount, EmailFolder, EmailLabel } from '../types'
import type { InboxHiddenStats } from '../lib/aiInbox'

const FOLDER_ICONS: Partial<Record<EmailFolder, typeof Inbox>> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  scheduled: Clock,
  archive: Archive,
  trash: Trash2,
}

interface Props {
  inboxTitle: string
  activeAccount: EmailAccount | null
  activeAccountId: string | null
  activeEmailFolder: EmailFolder
  currentFolderLabel: string
  folderCounts: Record<EmailFolder, number>
  filter: string
  onFilterChange: (value: string) => void
  onFolderChange: (folder: EmailFolder) => void
  onClearAccount: () => void
  folderSort: EmailSortKey
  onFolderSortChange: (sort: EmailSortKey) => void

  aiInboxEnabled: boolean
  aiOutboxEnabled: boolean
  inboxStats: InboxHiddenStats
  onToggleAiInbox: () => void
  onToggleAiOutbox: () => void
  onDeleteAllOutbox: () => void

  emailLabels: EmailLabel[]
  activeLabelFilter: string | null
  labelCounts: Record<string, number>
  onLabelFilter: (id: string | null) => void
  onCreateLabel: (name: string, color: string) => void
  onDeleteLabel: (id: string) => void

  threadViewEnabled: boolean
  onToggleThreadView: () => void
  followUpFilterEnabled: boolean
  followUpCount: number
  onToggleFollowUp: () => void

  emailSelectionMode: boolean
  onToggleSelectionMode: () => void
  onClearSelection: () => void
  selectedCount: number
  visibleListCount: number
  onSelectAllVisible: () => void
  onBatchMarkRead: () => void
  onBatchStar: () => void
  onBatchArchive: () => void
  onBatchDelete: () => void
  onBatchApplyLabel: (labelId: string) => void
  batchConfirmDelete: boolean
  onBatchConfirmDelete: (confirm: boolean) => void
  batchLabelId: string
  onBatchLabelIdChange: (id: string) => void

  /** Hide toolbar controls when enforceLocks denies a feature */
  showThreadView?: boolean
  showFollowUp?: boolean
  showBatchSelect?: boolean
  showLabels?: boolean
  showAiInbox?: boolean
  showAiOutbox?: boolean
}

export function EmailInboxPanelHeader({
  inboxTitle,
  activeAccount,
  activeAccountId,
  activeEmailFolder,
  currentFolderLabel,
  folderCounts,
  filter,
  onFilterChange,
  onFolderChange,
  onClearAccount,
  folderSort,
  onFolderSortChange,
  aiInboxEnabled,
  aiOutboxEnabled,
  inboxStats,
  onToggleAiInbox,
  onToggleAiOutbox,
  onDeleteAllOutbox,
  emailLabels,
  activeLabelFilter,
  labelCounts,
  onLabelFilter,
  onCreateLabel,
  onDeleteLabel,
  threadViewEnabled,
  onToggleThreadView,
  followUpFilterEnabled,
  followUpCount,
  onToggleFollowUp,
  emailSelectionMode,
  onToggleSelectionMode,
  onClearSelection,
  selectedCount,
  visibleListCount,
  onSelectAllVisible,
  onBatchMarkRead,
  onBatchStar,
  onBatchArchive,
  onBatchDelete,
  onBatchApplyLabel,
  batchConfirmDelete,
  onBatchConfirmDelete,
  batchLabelId,
  onBatchLabelIdChange,
  showThreadView = true,
  showFollowUp = true,
  showBatchSelect = true,
  showLabels = true,
  showAiInbox = true,
  showAiOutbox = true,
}: Props) {
  const isInbox = activeEmailFolder === 'inbox'
  const [labelsOpen, setLabelsOpen] = useState(!!activeLabelFilter)
  const [aiDetailsOpen, setAiDetailsOpen] = useState(aiOutboxEnabled)
  const [confirmDeleteOutbox, setConfirmDeleteOutbox] = useState(false)

  useEffect(() => {
    if (aiOutboxEnabled) setAiDetailsOpen(true)
  }, [aiOutboxEnabled])

  useEffect(() => {
    if (!aiOutboxEnabled) setConfirmDeleteOutbox(false)
  }, [aiOutboxEnabled])

  const aiActive = isInbox && (aiInboxEnabled || aiOutboxEnabled)
  const labelsActive = !!activeLabelFilter
  const filtersActive =
    threadViewEnabled || followUpFilterEnabled || emailSelectionMode || labelsActive || aiActive

  return (
    <div className="shrink-0 border-b border-[var(--glass-border)] p-2 space-y-1.5">
      {/* Title */}
      <div className="flex items-center gap-1.5 min-h-[26px]">
        {activeAccount && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: providerColor(activeAccount.provider) }}
            title={providerLabel(activeAccount.provider)}
          />
        )}
        <h2 className="font-semibold text-theme truncate text-sm flex-1 min-w-0">{inboxTitle}</h2>
        {activeAccountId && (
          <button
            type="button"
            onClick={onClearAccount}
            className="p-1 rounded-md hover-theme text-theme-muted"
            title="Show all inboxes"
          >
            <X size={13} />
          </button>
        )}
        <PanelHideButton panelId="email-list" label="inbox" />
      </div>

      {/* Folders — single scroll row */}
      <nav
        className="flex gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-none -mx-0.5 px-0.5"
        aria-label="Mail folders"
      >
        {EMAIL_FOLDERS.map(({ id, label }) => {
          const Icon = FOLDER_ICONS[id] ?? Inbox
          const count = folderCounts[id]
          const active = activeEmailFolder === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onFolderChange(id)}
              title={label}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-theme-muted hover-theme'
              }`}
            >
              <Icon size={11} className="shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <span className={`tabular-nums ${active ? 'opacity-90' : 'opacity-60'}`}>{count}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Search + sort */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={`Search ${currentFolderLabel.toLowerCase()}…`}
            className="w-full pl-7 pr-2 py-1 rounded-lg input-theme text-xs outline-none"
          />
        </div>
        <label className="shrink-0 flex items-center gap-1 text-[10px] text-theme-muted">
          <ArrowUpDown size={11} className="text-accent" aria-hidden />
          <select
            value={folderSort}
            onChange={(e) => onFolderSortChange(e.target.value as EmailSortKey)}
            className="max-w-[5.5rem] sm:max-w-none px-1.5 py-1 rounded-lg glass text-[10px] text-theme-secondary outline-none"
            title="Sort order for this folder"
            aria-label={`Sort ${currentFolderLabel}`}
          >
            {EMAIL_SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Compact tool strip */}
      <div className="flex items-center gap-0.5 flex-wrap">
        {isInbox && (
          <>
            {showAiInbox && (
              <ToolButton
                active={aiInboxEnabled}
                onClick={onToggleAiInbox}
                title="AI Inbox — show important mail only"
                label="AI In"
              >
                <Bot size={12} />
              </ToolButton>
            )}
            {showAiOutbox && (
              <ToolButton
                active={aiOutboxEnabled}
                onClick={onToggleAiOutbox}
                title="AI Outbox — review filtered junk"
                label="AI Out"
                activeClass="bg-red-500/90 text-white"
              >
                <ShieldOff size={12} />
              </ToolButton>
            )}
            {showAiOutbox && aiOutboxEnabled && inboxStats.hidden > 0 && (
              <ToolButton
                active={confirmDeleteOutbox}
                onClick={() => setConfirmDeleteOutbox((c) => !c)}
                title={`Delete all ${inboxStats.hidden} filtered emails`}
                label={String(inboxStats.hidden)}
                activeClass="bg-red-500/90 text-white"
              >
                <Trash2 size={12} />
              </ToolButton>
            )}
            {showFollowUp && (
              <ToolButton
                active={followUpFilterEnabled}
                onClick={onToggleFollowUp}
                title="Needs follow-up"
                label={followUpCount > 0 ? String(followUpCount) : undefined}
                activeClass="bg-amber-500/20 text-amber-400 border border-amber-500/30"
              >
                <MailWarning size={12} />
              </ToolButton>
            )}
          </>
        )}
        {showThreadView && (
          <ToolButton
            active={threadViewEnabled}
            onClick={onToggleThreadView}
            title={threadViewEnabled ? 'Thread view' : 'List view'}
          >
            {threadViewEnabled ? <MessagesSquare size={12} /> : <List size={12} />}
          </ToolButton>
        )}
        {showBatchSelect && (
          <ToolButton
            active={emailSelectionMode}
            onClick={() => {
              if (emailSelectionMode) onClearSelection()
              else onToggleSelectionMode()
            }}
            title="Select messages"
          >
            {emailSelectionMode ? <CheckSquare size={12} /> : <Square size={12} />}
          </ToolButton>
        )}
        {showLabels && emailLabels.length > 0 && (
          <ToolButton
            active={labelsOpen || labelsActive}
            onClick={() => setLabelsOpen((o) => !o)}
            title="Labels"
            label={labelsActive ? '1' : undefined}
          >
            <Tag size={12} />
          </ToolButton>
        )}
        {isInbox && (aiInboxEnabled || aiOutboxEnabled) && (
          <button
            type="button"
            onClick={() => setAiDetailsOpen((o) => !o)}
            className="ml-auto p-1 rounded-md text-theme-muted hover-theme"
            title={aiDetailsOpen ? 'Hide AI details' : 'Show AI details'}
            aria-expanded={aiDetailsOpen}
          >
            {aiDetailsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {!isInbox && filtersActive && (
          <span className="ml-auto text-[9px] text-theme-muted truncate max-w-[40%]">
            {threadViewEnabled && 'Threads'}
            {followUpFilterEnabled && ' · Follow-up'}
            {emailSelectionMode && ' · Selecting'}
          </span>
        )}
      </div>

      {confirmDeleteOutbox && showAiOutbox && aiOutboxEnabled && inboxStats.hidden > 0 && (
        <div className="glass rounded-lg p-2 border border-red-500/30 space-y-2">
          <p className="text-[10px] text-theme-secondary text-center">
            Delete all {inboxStats.hidden} filtered email{inboxStats.hidden === 1 ? '' : 's'}? They
            will move to Trash.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteOutbox(false)}
              className="flex-1 px-2 py-1.5 rounded-lg glass text-[10px] text-theme-muted hover-theme"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteAllOutbox()
                setConfirmDeleteOutbox(false)
              }}
              className="flex-1 px-2 py-1.5 rounded-lg bg-red-500/90 text-white text-[10px] font-medium hover:opacity-90"
            >
              Delete all
            </button>
          </div>
        </div>
      )}

      {/* Expandable: AI details */}
      {isInbox && aiDetailsOpen && (aiInboxEnabled || aiOutboxEnabled) && (showAiInbox || showAiOutbox) && (
        <AIInboxBar
          compact
          inboxEnabled={aiInboxEnabled}
          outboxEnabled={aiOutboxEnabled}
          onToggleInbox={onToggleAiInbox}
          onToggleOutbox={onToggleAiOutbox}
          stats={inboxStats}
          onDeleteAllOutbox={onDeleteAllOutbox}
        />
      )}

      {/* Expandable: labels */}
      {labelsOpen && showLabels && (
        <EmailLabelsBar
          compact
          labels={emailLabels}
          activeLabelId={activeLabelFilter}
          onFilter={onLabelFilter}
          onCreateLabel={onCreateLabel}
          onDeleteLabel={onDeleteLabel}
          emailCounts={labelCounts}
        />
      )}

      {/* Batch actions */}
      {showBatchSelect && emailSelectionMode && selectedCount > 0 && (
        <div className="glass rounded-lg p-1.5 space-y-1">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-[10px] text-theme-muted">{selectedCount} selected</span>
            <button
              type="button"
              onClick={onSelectAllVisible}
              className="text-[10px] text-accent hover:underline"
            >
              All ({visibleListCount})
            </button>
          </div>
          <div className="flex flex-wrap gap-0.5">
            <BatchBtn onClick={onBatchMarkRead}>Read</BatchBtn>
            <BatchBtn onClick={onBatchStar}>Star</BatchBtn>
            <BatchBtn onClick={onBatchArchive}>Archive</BatchBtn>
            {emailLabels.length > 0 && (
              <select
                value={batchLabelId}
                onChange={(e) => {
                  const id = e.target.value
                  onBatchLabelIdChange(id)
                  if (id) onBatchApplyLabel(id)
                }}
                className="px-1.5 py-0.5 rounded-md glass text-[10px] text-theme-secondary outline-none max-w-[5.5rem]"
              >
                <option value="">Label…</option>
                {emailLabels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}
            {!batchConfirmDelete ? (
              <BatchBtn onClick={() => onBatchConfirmDelete(true)} danger>
                Delete
              </BatchBtn>
            ) : (
              <>
                <BatchBtn onClick={() => onBatchConfirmDelete(false)}>Cancel</BatchBtn>
                <BatchBtn onClick={onBatchDelete} danger>
                  Confirm
                </BatchBtn>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ToolButton({
  children,
  active,
  onClick,
  title,
  label,
  activeClass = 'bg-accent-soft text-accent border border-[var(--accent)]/30',
}: {
  children: ReactNode
  active: boolean
  onClick: () => void
  title: string
  label?: string
  activeClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-0.5 p-1.5 rounded-md text-[10px] transition-colors ${
        active ? activeClass : 'glass text-theme-muted hover-theme'
      }`}
    >
      {children}
      {label && <span className="tabular-nums text-[9px]">{label}</span>}
    </button>
  )
}

function BatchBtn({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-1.5 py-0.5 rounded-md text-[10px] ${
        danger
          ? 'text-red-400 glass border border-red-500/30 hover-theme'
          : 'glass text-theme-secondary hover-theme'
      }`}
    >
      {children}
    </button>
  )
}
