import { useMemo, useState } from 'react'
import {
  Search,
  FileText,
  Eye,
  Edit3,
  Columns,
  Calendar,
  PanelRight,
} from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { getAIContext } from '../lib/aiContext'
import { MarkdownContent } from './MarkdownContent'
import { NoteMarkdownEditor } from './NoteMarkdownEditor'
import { PanelHideButton, PanelRestoreTab } from './PanelHideButton'
import { ShareNoteButton } from './ShareNoteButton'
import { VaultNoteHeader } from './VaultNoteHeader'
import { NoteAssistPanel } from './NoteAssistPanel'
import { NoteSidebar } from './NoteSidebar'
import { NoteDetailsSheet } from './NoteDetailsSheet'
import {
  applyWikiLink,
  formatNoteBullets,
  formatNoteHeadings,
  formatNoteStructure,
  getAutoLinkSuggestions,
  type AutoLinkSuggestion,
} from '../lib/noteAssist'

export function NotesView() {
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const activeNoteId = useEtherMailStore((s) => s.activeNoteId)
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const updateNote = useEtherMailStore((s) => s.updateNote)
  const updateNoteTags = useEtherMailStore((s) => s.updateNoteTags)
  const openDailyNote = useEtherMailStore((s) => s.openDailyNote)
  const openComposeFromNote = useEtherMailStore((s) => s.openComposeFromNote)
  const createMeetingPrepNote = useEtherMailStore((s) => s.createMeetingPrepNote)
  const editorMode = useEtherMailStore((s) => s.editorMode)
  const setEditorMode = useEtherMailStore((s) => s.setEditorMode)
  const searchQuery = useEtherMailStore((s) => s.searchQuery)
  const setSearchQuery = useEtherMailStore((s) => s.setSearchQuery)
  const mobilePanel = useEtherMailStore((s) => s.mobilePanel)
  const setMobilePanel = useEtherMailStore((s) => s.setMobilePanel)
  const hiddenPanels = useEtherMailStore((s) => s.hiddenPanels)
  const setAiAssistantOpen = useEtherMailStore((s) => s.setAiAssistantOpen)
  const submitAiQuery = useEtherMailStore((s) => s.submitAiQuery)

  const [detailsOpen, setDetailsOpen] = useState(false)

  const activeNote = notes.find((n) => n.id === activeNoteId)
  const listHidden = hiddenPanels['notes-list'] ?? false
  const editorHidden = hiddenPanels['notes-editor'] ?? false

  const filteredNotes = [...notes]
    .filter((n) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

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

  const aiAction = (action: string) => {
    const ctx = getAIContext('notes', { activeNote, emails, notes })
    setAiAssistantOpen(true)
    submitAiQuery(action, ctx.contextPrefix)
  }

  const sidebarProps = activeNote
    ? {
        note: activeNote,
        notes,
        emails,
        onSelectNote: (id: string) => selectNote(id, { view: 'notes' }),
        onSelectEmail: selectEmail,
        onUpdateTags: (tags: string[]) => updateNoteTags(activeNote.id, tags),
        onUpdateContent: (content: string) => updateNote(activeNote.id, { content }),
        onComposeFromNote: () => openComposeFromNote(activeNote.id),
        onMeetingPrepNote: createMeetingPrepNote,
        onAiAction: aiAction,
      }
    : null

  const editorActions = activeNote ? (
    <>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="p-1.5 rounded-lg text-theme-muted hover-theme xl:hidden"
        aria-label="Note details"
        title="Tags, links, actions"
      >
        <PanelRight size={16} />
      </button>
      <ShareNoteButton note={activeNote} />
      {(['edit', 'split', 'preview'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setEditorMode(mode)}
          className={`p-1.5 rounded-lg ${editorMode === mode ? 'bg-accent-soft text-theme' : 'text-theme-muted hover-theme'}`}
          aria-label={mode === 'edit' ? 'Edit' : mode === 'split' ? 'Split view' : 'Preview'}
        >
          {mode === 'edit' && <Edit3 size={16} />}
          {mode === 'split' && <Columns size={16} />}
          {mode === 'preview' && <Eye size={16} />}
        </button>
      ))}
      <PanelHideButton panelId="notes-editor" label="editor" className="hidden md:inline-flex" />
    </>
  ) : null

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {(listHidden || editorHidden) && (
        <div className="shrink-0 flex flex-col gap-1 p-2 border-b border-[var(--glass-border)] glass">
          <PanelRestoreTab panelId="notes-list" label="Notes list" />
          <PanelRestoreTab panelId="notes-editor" label="Editor" />
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden">
      {!listHidden && (
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
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg input-theme text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => openDailyNote()}
              className="p-1.5 rounded-lg glass hover-theme text-theme-muted"
              title="Today's note"
            >
              <Calendar size={14} />
            </button>
            <PanelHideButton panelId="notes-list" label="notes list" className="hidden md:inline-flex" />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredNotes.map((n) => (
              <button
                key={n.id}
                onClick={() => selectNote(n.id, { view: 'notes' })}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm mb-0.5 ${
                  activeNoteId === n.id ? 'bg-accent-soft text-theme' : 'text-theme-secondary hover-theme'
                }`}
              >
                <FileText size={14} />
                <span className="truncate text-left flex-1">{n.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!editorHidden && (
        <div
          className={`
            ${mobilePanel !== 'detail' && !listHidden ? 'hidden md:flex' : mobilePanel !== 'detail' && listHidden ? 'hidden' : 'flex'}
            flex-1 flex-col min-w-0 min-h-0
          `}
        >
          {activeNote ? (
            <>
              <VaultNoteHeader
                showBack
                onBack={() => setMobilePanel('list')}
                breadcrumbs={['Notes']}
                title={activeNote.title}
                showTitle={false}
                actions={editorActions}
              />

              <div className="hidden md:block shrink-0 border-b border-[var(--glass-border)] glass px-3 py-2">
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
                <div className="flex-1 flex min-h-0 flex-col">
                  {(editorMode === 'edit' || editorMode === 'split') && (
                    <div className={`${editorMode === 'split' ? 'w-full md:w-1/2 border-b md:border-b-0 md:border-r border-[var(--glass-border)]' : 'w-full'} flex flex-col min-h-0 flex-1 md:flex-none`}>
                      <NoteMarkdownEditor
                        title={activeNote.title}
                        content={activeNote.content}
                        onTitleChange={(t) => updateNote(activeNote.id, { title: t })}
                        onContentChange={(c) => updateNote(activeNote.id, { content: c })}
                      />
                    </div>
                  )}
                  {(editorMode === 'preview' || editorMode === 'split') && (
                    <div className={`${editorMode === 'split' ? 'w-full md:w-1/2' : 'w-full'} overflow-y-auto p-4 flex-1`}>
                      <MarkdownContent content={activeNote.content} />
                    </div>
                  )}
                </div>

                <aside className="hidden xl:flex w-60 shrink-0 border-l border-[var(--glass-border)] glass overflow-y-auto p-3">
                  {sidebarProps && <NoteSidebar {...sidebarProps} />}
                </aside>
              </div>

              {sidebarProps && (
                <NoteDetailsSheet
                  open={detailsOpen}
                  onClose={() => setDetailsOpen(false)}
                  {...sidebarProps}
                />
              )}
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
