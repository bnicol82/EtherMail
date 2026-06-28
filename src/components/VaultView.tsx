import { useState } from 'react'
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
} from 'lucide-react'
import { useNexusStore, useGraph } from '../store/useStore'
import { MarkdownContent } from './MarkdownContent'
import { MiniGraph } from './MiniGraph'
import { getBacklinks } from '../lib/utils'

export function VaultView() {
  const folders = useNexusStore((s) => s.folders)
  const notes = useNexusStore((s) => s.notes)
  const activeNoteId = useNexusStore((s) => s.activeNoteId)
  const activeFolderId = useNexusStore((s) => s.activeFolderId)
  const selectNote = useNexusStore((s) => s.selectNote)
  const selectFolder = useNexusStore((s) => s.selectFolder)
  const updateNote = useNexusStore((s) => s.updateNote)
  const editorMode = useNexusStore((s) => s.editorMode)
  const setEditorMode = useNexusStore((s) => s.setEditorMode)
  const searchQuery = useNexusStore((s) => s.searchQuery)
  const setSearchQuery = useNexusStore((s) => s.setSearchQuery)
  const mobilePanel = useNexusStore((s) => s.mobilePanel)
  const setMobilePanel = useNexusStore((s) => s.setMobilePanel)
  const setView = useNexusStore((s) => s.setView)
  const addChatMessage = useNexusStore((s) => s.addChatMessage)
  const setAiMode = useNexusStore((s) => s.setAiMode)

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root', 'projects', 'athena']))
  const activeNote = notes.find((n) => n.id === activeNoteId)
  const { nodes, edges } = useGraph()

  const folderNotes = notes.filter((n) => {
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
    const children = folders.filter((f) => f.parentId === folderId)
    const isExpanded = expanded.has(folderId)

    return (
      <div key={folderId}>
        <button
          onClick={() => {
            selectFolder(folderId)
            setMobilePanel('list')
          }}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors ${
            activeFolderId === folderId ? 'bg-indigo-600/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
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
          <Folder size={14} className="shrink-0 text-amber-400/80" />
          <span className="truncate">{folder.name}</span>
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

  const aiAction = (action: string) => {
    setView('ai')
    setAiMode('vault')
    addChatMessage({ role: 'user', content: action, mode: 'vault' })
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* File tree */}
      <div
        className={`
          ${mobilePanel === 'detail' ? 'hidden md:flex' : 'flex'}
          w-full md:w-56 glass border-r border-white/10 flex-col shrink-0
        `}
      >
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vault..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {renderFolder('root')}
        </div>
        <div className="p-2 border-t border-white/10 max-h-48 overflow-y-auto">
          <p className="text-xs text-slate-500 px-2 mb-1">Notes</p>
          {folderNotes.map((n) => (
            <button
              key={n.id}
              onClick={() => selectNote(n.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                activeNoteId === n.id ? 'bg-indigo-600/30 text-white' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <FileText size={14} />
              <span className="truncate">{n.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div
        className={`
          ${mobilePanel !== 'detail' ? 'hidden md:flex' : 'flex'}
          flex-1 flex-col min-w-0
        `}
      >
        {activeNote ? (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 glass shrink-0 flex-wrap">
              <button
                className="md:hidden text-slate-400 hover:text-white text-sm"
                onClick={() => setMobilePanel('list')}
              >
                ← Back
              </button>
              <div className="flex items-center gap-1 text-xs text-slate-500 flex-1 min-w-0">
                {breadcrumbs().map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight size={12} />}
                    <span className="truncate">{c}</span>
                  </span>
                ))}
                <ChevronRight size={12} />
                <span className="text-white truncate">{activeNote.title}</span>
              </div>
              <div className="flex gap-1">
                {(['edit', 'split', 'preview'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setEditorMode(mode)}
                    className={`p-1.5 rounded ${editorMode === mode ? 'bg-indigo-600/30 text-white' : 'text-slate-500 hover:text-white'}`}
                    title={mode}
                  >
                    {mode === 'edit' && <Edit3 size={16} />}
                    {mode === 'split' && <Columns size={16} />}
                    {mode === 'preview' && <Eye size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className="flex-1 flex min-h-0">
                {(editorMode === 'edit' || editorMode === 'split') && (
                  <div className={`${editorMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'} flex flex-col min-h-0`}>
                    <input
                      value={activeNote.title}
                      onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                      className="px-4 py-3 bg-transparent text-lg font-semibold text-white outline-none border-b border-white/5"
                    />
                    <textarea
                      value={activeNote.content}
                      onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                      className="flex-1 p-4 bg-transparent text-sm text-slate-300 outline-none resize-none font-mono leading-relaxed"
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
              <div className="hidden lg:flex w-64 flex-col border-l border-white/10 glass shrink-0 overflow-y-auto">
                <div className="p-3 border-b border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span className="text-sm font-medium text-white">Vault AI Insights</span>
                  </div>
                  <div className="space-y-1">
                    {['Refine Wording', 'Find Similar Note', 'Find Similar Link'].map((a) => (
                      <button
                        key={a}
                        onClick={() => aiAction(a)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 border-b border-white/10">
                  <p className="text-xs text-slate-500 mb-2">Mini-graph</p>
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
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Tag size={10} /> Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {activeNote.tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Link2 size={10} /> Backlinks</p>
                    {backlinks.length === 0 ? (
                      <p className="text-xs text-slate-600">No backlinks</p>
                    ) : (
                      backlinks.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => selectNote(b.id)}
                          className="block text-xs text-indigo-400 hover:underline"
                        >
                          {b.title}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a note to edit
          </div>
        )}
      </div>
    </div>
  )
}
