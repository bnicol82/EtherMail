import { useRef, useState, useEffect } from 'react'
import { Plus, FileText, FolderPlus, Upload, Calendar, LayoutTemplate } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { EMAIL_FILES_FOLDER_ID } from '../types'
import { EMAIL_FILES_WORK_FOLDER_ID } from '../data/seed'
import { getTemplateNotes } from '../lib/noteFeatures'

const MAX_UPLOAD_BYTES = 512_000
const SYSTEM_FOLDER_IDS = new Set([EMAIL_FILES_FOLDER_ID, EMAIL_FILES_WORK_FOLDER_ID])

interface Props {
  folderId: string
  onFolderCreated?: (folderId: string) => void
}

export function VaultAddMenu({ folderId, onFolderCreated }: Props) {
  const createNote = useEtherMailStore((s) => s.createNote)
  const openDailyNote = useEtherMailStore((s) => s.openDailyNote)
  const createNoteFromTemplate = useEtherMailStore((s) => s.createNoteFromTemplate)
  const createFolder = useEtherMailStore((s) => s.createFolder)
  const uploadVaultFile = useEtherMailStore((s) => s.uploadVaultFile)
  const notes = useEtherMailStore((s) => s.notes)
  const activeVaultId = useEtherMailStore((s) => s.activeVaultId)

  const [open, setOpen] = useState(false)
  const [folderPrompt, setFolderPrompt] = useState(false)
  const [templatePicker, setTemplatePicker] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const disabled = SYSTEM_FOLDER_IDS.has(folderId)
  const templates = getTemplateNotes(notes, activeVaultId ?? undefined)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setFolderPrompt(false)
        setTemplatePicker(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (folderPrompt) folderInputRef.current?.focus()
  }, [folderPrompt])

  const parentForFolder = SYSTEM_FOLDER_IDS.has(folderId)
    ? folderId === EMAIL_FILES_WORK_FOLDER_ID
      ? 'root-work'
      : 'root'
    : folderId

  const targetFolder = () =>
    folderId === EMAIL_FILES_FOLDER_ID
      ? 'personal'
      : folderId === EMAIL_FILES_WORK_FOLDER_ID
        ? 'athena'
        : folderId

  const onNewNote = () => {
    createNote(targetFolder())
    setOpen(false)
  }

  const onDailyNote = () => {
    openDailyNote()
    setOpen(false)
  }

  const onCreateFolder = () => {
    const name = folderName.trim()
    if (!name) return
    const id = createFolder(name, parentForFolder)
    if (id) {
      onFolderCreated?.(id)
    }
    setFolderName('')
    setFolderPrompt(false)
    setOpen(false)
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Max ${Math.round(MAX_UPLOAD_BYTES / 1024)}KB per file`)
      return
    }
    const target = SYSTEM_FOLDER_IDS.has(folderId)
      ? folderId === EMAIL_FILES_WORK_FOLDER_ID
        ? 'root-work'
        : 'root'
      : folderId
    try {
      await uploadVaultFile(file, target)
      setOpen(false)
    } catch {
      setError('Upload failed')
    }
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg btn-accent"
        aria-label="Add to vault"
        title="Add to vault"
      >
        <Plus size={16} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-30 glass-frost rounded-xl p-1.5 min-w-[168px] shadow-xl border border-[var(--glass-border)]">
          {folderPrompt ? (
            <div className="p-2 space-y-2">
              <input
                ref={folderInputRef}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onCreateFolder()}
                placeholder="Folder name"
                className="w-full px-2 py-1.5 rounded-lg input-theme text-xs outline-none"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onCreateFolder}
                  disabled={!folderName.trim()}
                  className="flex-1 px-2 py-1 rounded-lg btn-accent text-xs disabled:opacity-40"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setFolderPrompt(false)}
                  className="px-2 py-1 rounded-lg glass text-xs text-theme-muted"
                >
                  Back
                </button>
              </div>
            </div>
          ) : templatePicker ? (
            <div className="p-1 max-h-48 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-[10px] text-theme-muted px-2 py-1">No templates in Templates folder</p>
              ) : (
                templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      createNoteFromTemplate(tpl.id, targetFolder())
                      setTemplatePicker(false)
                      setOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-theme-secondary hover-theme"
                  >
                    {tpl.title}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => setTemplatePicker(false)}
                className="w-full px-3 py-1.5 text-[10px] text-theme-muted hover-theme"
              >
                Back
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onNewNote}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left"
              >
                <FileText size={14} className="text-accent" />
                New note
              </button>
              <button
                type="button"
                onClick={onDailyNote}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left"
              >
                <Calendar size={14} className="text-accent" />
                Today&apos;s note
              </button>
              <button
                type="button"
                onClick={() => setTemplatePicker(true)}
                disabled={templates.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left disabled:opacity-40"
              >
                <LayoutTemplate size={14} className="text-accent" />
                From template
              </button>
              <button
                type="button"
                onClick={() => setFolderPrompt(true)}
                disabled={disabled}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left disabled:opacity-40"
              >
                <FolderPlus size={14} className="text-amber-400" />
                New folder
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-theme-secondary hover-theme text-left disabled:opacity-40"
              >
                <Upload size={14} className="text-accent" />
                Upload file
              </button>
            </>
          )}
          {error && <p className="text-[10px] text-red-400 px-2 pt-1">{error}</p>}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  )
}
