import { useState, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Search,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  Tag,
  Link2,
  Paperclip,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { useNexusStore, useGraph } from '../store/useStore'
import { getAIContext } from '../lib/aiContext'
import { MarkdownContent } from './MarkdownContent'
import { MiniGraph } from './MiniGraph'
import { AccountDot } from './AccountDot'
import { PanelHideButton, PanelRestoreTab } from './PanelHideButton'
import { ShareNoteButton } from './ShareNoteButton'
import { VaultAddMenu } from './VaultAddMenu'
import { VaultNoteHeader } from './VaultNoteHeader'
import { NoteAssistPanel } from './NoteAssistPanel'
import { getBacklinks, formatDate, formatFileSize, fileIcon } from '../lib/utils'
import {
  applyWikiLink,
  formatNoteBullets,
  formatNoteHeadings,
  formatNoteStructure,
  getAutoLinkSuggestions,
  type AutoLinkSuggestion,
} from '../lib/noteAssist'
import { EMAIL_FILES_FOLDER_ID } from '../types'
import { EMAIL_FILES_WORK_FOLDER_ID, VAULT_PERSONAL_ID } from '../data/seed'

export function VaultView() {
  const folders = useNexusStore((s) => s.folders)
  const notes = useNexusStore((s) => s.notes)
  const emails = useNexusStore((s) => s.emails)
  const accounts = useNexusStore((s) => s.accounts)
  const emailAttachments = useNexusStore((s) => s.emailAttachments)
  const vaultFiles = useNexusStore((s) => s.vaultFiles)
  const activeNoteId = useNexusStore((s) => s.activeNoteId)
  const activeAttachmentId = useNexusStore((s) => s.activeAttachmentId)
  const activeVaultFileId = useNexusStore((s) => s.activeVaultFileId)
  const activeFolderId = useNexusStore((s) => s.activeFolderId)
  const selectNote = useNexusStore((s) => s.selectNote)
  const selectAttachment = useNexusStore((s) => s.selectAttachment)
  const selectVaultFile = useNexusStore((s) => s.selectVaultFile)
  const selectEmail = useNexusStore((s) => s.selectEmail)
  const selectFolder = useNexusStore((s) => s.selectFolder)
  const updateNote = useNexusStore((s) => s.updateNote)
  const editorMode = useNexusStore((s) => s.editorMode)
  const setEditorMode = useNexusStore((s) => s.setEditorMode)
  const searchQuery = useNexusStore((s) => s.searchQuery)
  const setSearchQuery = useNexusStore((s) => s.setSearchQuery)
  const mobilePanel = useNexusStore((s) => s.mobilePanel)
  const setMobilePanel = useNexusStore((s) => s.setMobilePanel)
  const setAiAssistantOpen = useNexusStore((s) => s.setAiAssistantOpen)
  const submitAiQuery = useNexusStore((s) => s.submitAiQuery)
  const hiddenPanels = useNexusStore((s) => s.hiddenPanels)
  const activeVaultId = useNexusStore((s) => s.activeVaultId)
  const vaults = useNexusStore((s) => s.vaults)

  const treeHidden = hiddenPanels['vault-tree'] ?? false
  const editorHidden = hiddenPanels['vault-editor'] ?? false
  const railHidden = hiddenPanels['vault-rail'] ?? false

  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['root', 'root-work', 'projects', 'athena', EMAIL_FILES_FOLDER_ID, EMAIL_FILES_WORK_FOLDER_ID]),
  )
  const activeNote = notes.find((n) => n.id === activeNoteId)
  const activeAttachment = emailAttachments.find((a) => a.id === activeAttachmentId)
  const activeVaultFile = vaultFiles.find((f) => f.id === activeVaultFileId)
  const isEmailFiles =
    activeFolderId === EMAIL_FILES_FOLDER_ID || activeFolderId === EMAIL_FILES_WORK_FOLDER_ID
  const vaultRoots = (activeVaultId
    ? folders.filter((f) => f.parentId === null && (f.vaultId ?? VAULT_PERSONAL_ID) === activeVaultId)
    : folders.filter((f) => f.parentId === null)
  ).sort((a, b) => {
    const order = (id?: string) => (id === VAULT_PERSONAL_ID ? 0 : 1)
    return order(a.vaultId) - order(b.vaultId)
  })
  const { nodes, edges } = useGraph()

  const folderNotes = notes.filter((n) => {
    if (activeVaultId && n.vaultId !== activeVaultId) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return n.folderId === activeFolderId
  })

  const scopedAttachments = emailAttachments.filter((a) => {
    if (!activeVaultId) return true
    const acc = accounts.find((x) => x.id === a.accountId)
    return (acc?.defaultVaultId ?? 'vault-personal') === activeVaultId
  })

  const folderAttachments = scopedAttachments
    .filter((a) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const email = emails.find((e) => e.id === a.emailId)
      return (
        a.filename.toLowerCase().includes(q) ||
        email?.subject.toLowerCase().includes(q) ||
        email?.fromName.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const folderVaultFiles = vaultFiles
    .filter((f) => {
      if (activeVaultId && f.vaultId !== activeVaultId) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return f.filename.toLowerCase().includes(q)
      }
      return f.folderId === activeFolderId
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  const expandFolderChain = (folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      let fid: string | null = folderId
      while (fid) {
        next.add(fid)
        fid = folders.find((x) => x.id === fid)?.parentId ?? null
      }
      return next
    })
  }

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderFolder = (folderId: string, depth = 0) => {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return null
    const folderVaultId = folder.vaultId ?? VAULT_PERSONAL_ID
    if (activeVaultId && folderVaultId !== activeVaultId) return null
    const children = folders.filter(
      (f) => f.parentId === folderId && (f.vaultId ?? VAULT_PERSONAL_ID) === folderVaultId,
    )
    const isExpanded = expanded.has(folderId)
    const isEmailFilesFolder =
      folderId === EMAIL_FILES_FOLDER_ID || folderId === EMAIL_FILES_WORK_FOLDER_ID

    return (
      <div key={folderId}>
        <button
          onClick={() => {
            selectFolder(folderId)
            setMobilePanel('list')
          }}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors ${
            activeFolderId === folderId ? 'bg-accent-soft text-theme' : 'text-theme-secondary hover:text-theme hover-theme'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {children.length > 0 ? (
            <span onClick={(e) => { e.stopPropagation(); toggleFolder(folderId) }}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="w-3.5" />
          )}
          {isEmailFilesFolder ? (
            <Paperclip size={14} className="shrink-0 text-accent" />
          ) : (
            <Folder size={14} className="shrink-0 text-amber-400/80" />
          )}
          <span className="truncate flex-1 text-left">{folder.name}</span>
          {isEmailFilesFolder && scopedAttachments.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-soft text-accent shrink-0">
              {scopedAttachments.length}
            </span>
          )}
        </button>
        {isExpanded && children.map((c) => renderFolder(c.id, depth + 1))}
      </div>
    )
  }

  const breadcrumbs = () => {
    const crumbs: string[] = []
    let fid: string | null = activeFolderId
    while (fid) {
      const f = folders.find((x) => x.id === fid)
      if (f) crumbs.unshift(f.name)
      fid = folders.find((x) => x.id === fid)?.parentId ?? null
    }
    return crumbs
  }

  const backlinks = activeNote ? getBacklinks(activeNote.title, notes) : []

  const autoLinkSuggestions = useMemo(
    () => (activeNote ? getAutoLinkSuggestions(activeNote, notes) : []),
    [activeNote, notes],
  )

  const applyAutoLink = (suggestion: AutoLinkSuggestion) => {
    if (!activeNote) return
    updateNote(activeNote.id, {
      content: applyWikiLink(activeNote.content, suggestion.title, suggestion.matchText),
    })
  }

  const applyFormat = (formatter: (content: string) => string) => {
    if (!activeNote) return
    updateNote(activeNote.id, { content: formatter(activeNote.content) })
  }

  const editorActions = (
    <>
      {(editorMode === 'preview' || editorMode === 'split') && activeNote && (
        <ShareNoteButton note={activeNote} />
      )}
      {(['edit', 'split', 'preview'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setEditorMode(mode)}
          className={`p-1.5 rounded-lg ${editorMode === mode ? 'bg-accent-soft text-theme' : 'text-theme-muted hover:text-theme hover-theme'}`}
          title={mode}
        >
          {mode === 'edit' && <Edit3 size={16} />}
          {mode === 'split' && <Columns size={16} />}
          {mode === 'preview' && <Eye size={16} />}
        </button>
      ))}
      <PanelHideButton panelId="vault-editor" label="editor" />
    </>
  )

  const aiAction = (action: string) => {
    const ctx = getAIContext('vault', { activeNote, emails, notes })
    setAiAssistantOpen(true)
    submitAiQuery(action, ctx.contextPrefix)
  }

  const openSourceEmail = (emailId: string) => {
    selectEmail(emailId)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 flex flex-col gap-1 p-2 border-b border-[var(--glass-border)] glass">
        <PanelRestoreTab panelId="vault-tree" label="Folders" />
        <PanelRestoreTab panelId="vault-editor" label="Editor" />
        <PanelRestoreTab panelId="vault-rail" label="Insights" />
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
      {!treeHidden && (
      <div
        className={`
          ${mobilePanel === 'detail' ? 'hidden md:flex' : 'flex'}
          w-full md:w-56 glass border-r border-[var(--glass-border)] flex-col shrink-0
        `}
      >
        <div className="p-3 border-b border-[var(--glass-border)] flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEmailFiles ? 'Search email files...' : 'Search vault...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg input-theme text-sm outline-none focus:border-[var(--accent-border)]"
            />
          </div>
          <VaultAddMenu
            folderId={activeFolderId}
            onFolderCreated={(id) => {
              expandFolderChain(id)
              selectFolder(id)
            }}
          />
          <PanelHideButton panelId="vault-tree" label="folders" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {vaultRoots.map((root) => (
            <div key={root.id} className="mb-2">
              {!activeVaultId && (
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
                  {vaults.find((v) => v.id === (root.vaultId ?? VAULT_PERSONAL_ID))?.name ?? 'Vault'}
                </p>
              )}
              {renderFolder(root.id)}
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-[var(--glass-border)] max-h-48 overflow-y-auto">
          <p className="text-xs text-theme-muted px-2 mb-1">
            {isEmailFiles ? 'Email attachments' : 'Notes & files'}
          </p>
          {isEmailFiles ? (
            folderAttachments.length === 0 ? (
              <p className="text-xs text-theme-muted px-2 py-2">No attachments yet</p>
            ) : (
              folderAttachments.map((att) => {
                const acc = accounts.find((a) => a.id === att.accountId)
                return (
                  <button
                    key={att.id}
                    onClick={() => selectAttachment(att.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                      activeAttachmentId === att.id ? 'bg-accent-soft text-theme' : 'text-theme-secondary hover-theme'
                    }`}
                  >
                    <span className="text-sm shrink-0">{fileIcon(att.mimeType)}</span>
                    <span className="truncate flex-1 text-left">{att.filename}</span>
                    <AccountDot account={acc} />
                  </button>
                )
              })
            )
          ) : (
            <>
              {folderNotes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => selectNote(n.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                    activeNoteId === n.id ? 'bg-accent-soft text-theme' : 'text-theme-secondary hover-theme'
                  }`}
                >
                  <FileText size={14} />
                  <span className="truncate">{n.title}</span>
                </button>
              ))}
              {folderVaultFiles.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selectVaultFile(f.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                    activeVaultFileId === f.id ? 'bg-accent-soft text-theme' : 'text-theme-secondary hover-theme'
                  }`}
                >
                  <span className="text-sm shrink-0">{fileIcon(f.mimeType)}</span>
                  <span className="truncate">{f.filename}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
      )}

      {/* Editor / attachment detail */}
      {!editorHidden && (
      <div
        className={`
          ${mobilePanel !== 'detail' ? 'hidden md:flex' : 'flex'}
          flex-1 flex-col min-w-0
        `}
      >
        {isEmailFiles && activeAttachment ? (
          <>
            <VaultNoteHeader
              showBack
              onBack={() => setMobilePanel('list')}
              breadcrumbs={[...breadcrumbs(), activeAttachment.filename]}
              title={activeAttachment.filename}
            />

            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-4xl">{fileIcon(activeAttachment.mimeType)}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-theme break-all">{activeAttachment.filename}</h2>
                    <p className="text-sm text-theme-muted mt-1">
                      {formatFileSize(activeAttachment.sizeBytes)} · {activeAttachment.mimeType}
                    </p>
                    <p className="text-xs text-theme-muted mt-1">{new Date(activeAttachment.date).toLocaleString()}</p>
                    <div className="mt-2">
                      <AccountDot
                        account={accounts.find((a) => a.id === activeAttachment.accountId)}
                        showLabel
                        size="md"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  const sourceEmail = emails.find((e) => e.id === activeAttachment.emailId)
                  if (!sourceEmail) return null
                  return (
                    <div className="glass rounded-xl p-4 mb-6">
                      <p className="text-xs text-theme-muted mb-2 flex items-center gap-1">
                        <Mail size={12} /> From email
                      </p>
                      <p className="text-sm font-medium text-theme">{sourceEmail.subject}</p>
                      <p className="text-xs text-theme-muted mt-1">
                        {sourceEmail.fromName} · {formatDate(sourceEmail.date)}
                      </p>
                      <button
                        onClick={() => openSourceEmail(sourceEmail.id)}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-xs"
                      >
                        <ExternalLink size={12} /> Open in Inbox
                      </button>
                    </div>
                  )
                })()}

                <div className="glass rounded-xl p-6 text-center text-theme-muted text-sm">
                  <Paperclip size={24} className="mx-auto mb-2 opacity-50" />
                  <p>File preview will be available when email accounts are connected via OAuth.</p>
                  <p className="text-xs mt-2 opacity-70">Attachments sync automatically from all inboxes.</p>
                </div>
              </div>
            </div>
          </>
        ) : isEmailFiles ? (
          <div className="flex-1 flex flex-col items-center justify-center text-theme-muted p-6 text-center">
            <Paperclip size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium text-theme-secondary">Email Files</p>
            <p className="text-xs mt-1 max-w-xs">
              All attachments from your connected inboxes appear here automatically.
            </p>
            <p className="text-xs mt-3 text-accent">{folderAttachments.length} files</p>
          </div>
        ) : activeVaultFile ? (
          <>
            <VaultNoteHeader
              showBack
              onBack={() => setMobilePanel('list')}
              breadcrumbs={[...breadcrumbs(), activeVaultFile.filename]}
              title={activeVaultFile.filename}
            />
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-4xl">{fileIcon(activeVaultFile.mimeType)}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-theme break-all">{activeVaultFile.filename}</h2>
                    <p className="text-sm text-theme-muted mt-1">
                      {formatFileSize(activeVaultFile.sizeBytes)} · {activeVaultFile.mimeType}
                    </p>
                    <p className="text-xs text-theme-muted mt-1">
                      {new Date(activeVaultFile.uploadedAt).toLocaleString()}
                    </p>
                    {activeVaultFile.dataUrl && (
                      <a
                        href={activeVaultFile.dataUrl}
                        download={activeVaultFile.filename}
                        className="inline-flex mt-3 items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-xs"
                      >
                        <ExternalLink size={12} /> Download
                      </a>
                    )}
                  </div>
                </div>
                {activeVaultFile.dataUrl && activeVaultFile.mimeType.startsWith('image/') && (
                  <img
                    src={activeVaultFile.dataUrl}
                    alt={activeVaultFile.filename}
                    className="max-w-full rounded-xl border border-[var(--glass-border)]"
                  />
                )}
                {activeVaultFile.dataUrl && activeVaultFile.mimeType === 'application/pdf' && (
                  <iframe
                    src={activeVaultFile.dataUrl}
                    title={activeVaultFile.filename}
                    className="w-full h-[min(60vh,480px)] rounded-xl border border-[var(--glass-border)]"
                  />
                )}
              </div>
            </div>
          </>
        ) : activeNote ? (
          <>
            <VaultNoteHeader
              showBack
              onBack={() => setMobilePanel('list')}
              breadcrumbs={breadcrumbs()}
              title={activeNote.title}
              actions={editorActions}
            />

            <div className="lg:hidden shrink-0 border-b border-[var(--glass-border)] glass px-3 py-2">
              <NoteAssistPanel
                compact
                suggestions={autoLinkSuggestions}
                onApplyLink={applyAutoLink}
                onFormatHeadings={() => applyFormat(formatNoteHeadings)}
                onFormatBullets={() => applyFormat(formatNoteBullets)}
                onFormatStructure={() => applyFormat(formatNoteStructure)}
                onAiFormat={aiAction}
              />
            </div>

            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className="flex-1 flex min-h-0">
                {(editorMode === 'edit' || editorMode === 'split') && (
                  <div className={`${editorMode === 'split' ? 'w-1/2 border-r border-[var(--glass-border)]' : 'w-full'} flex flex-col min-h-0`}>
                    <input
                      value={activeNote.title}
                      onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                      className="px-4 py-3 bg-transparent text-lg font-semibold text-theme outline-none border-b border-[var(--glass-border)]"
                    />
                    <textarea
                      value={activeNote.content}
                      onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                      className="flex-1 p-4 bg-transparent text-sm text-theme-secondary outline-none resize-none font-mono leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                )}
                {(editorMode === 'preview' || editorMode === 'split') && (
                  <div className={`${editorMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto p-4`}>
                    <MarkdownContent content={activeNote.content} />
                  </div>
                )}
              </div>

              {/* Right rail */}
              {!railHidden && (
              <div className="hidden lg:flex w-64 flex-col border-l border-[var(--glass-border)] glass shrink-0 overflow-y-auto">
                <div className="p-3 border-b border-[var(--glass-border)] flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Sparkles size={14} className="text-accent" />
                    <span className="text-sm font-medium text-theme">Vault AI Insights</span>
                  </div>
                  <PanelHideButton panelId="vault-rail" label="insights" />
                </div>
                <div className="p-3 border-b border-[var(--glass-border)]">
                  <NoteAssistPanel
                    suggestions={autoLinkSuggestions}
                    onApplyLink={applyAutoLink}
                    onFormatHeadings={() => applyFormat(formatNoteHeadings)}
                    onFormatBullets={() => applyFormat(formatNoteBullets)}
                    onFormatStructure={() => applyFormat(formatNoteStructure)}
                    onAiFormat={aiAction}
                  />
                </div>

                <div className="p-3 border-b border-[var(--glass-border)]">
                  <div className="space-y-1">
                    {['Find similar notes', 'Suggest tags'].map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => aiAction(a)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover-theme text-theme-secondary hover:text-theme"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 border-b border-[var(--glass-border)]">
                  <p className="text-xs text-theme-muted mb-2">Mini-graph</p>
                  <MiniGraph
                    nodes={nodes}
                    edges={edges}
                    focusId={activeNote.id}
                    width={220}
                    height={140}
                    onNodeClick={(id) => {
                      const note = notes.find((n) => n.id === id)
                      if (note) selectNote(note.id)
                    }}
                  />
                </div>

                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs text-theme-muted mb-1 flex items-center gap-1"><Tag size={10} /> Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {activeNote.tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted mb-1 flex items-center gap-1"><Link2 size={10} /> Backlinks</p>
                    {backlinks.length === 0 ? (
                      <p className="text-xs text-theme-muted">No backlinks</p>
                    ) : (
                      backlinks.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => selectNote(b.id)}
                          className="block text-xs text-accent hover:underline"
                        >
                          {b.title}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-theme-muted">
            Select a note to edit
          </div>
        )}
      </div>
      )}
      </div>
    </div>
  )
}
