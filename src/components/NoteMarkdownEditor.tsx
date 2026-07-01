import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { imageFileToMarkdown, insertAtCursor } from '../lib/noteImages'

interface Props {
  title: string
  content: string
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
}

export function NoteMarkdownEditor({ title, content, onTitleChange, onContentChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)

  const insertMarkdown = (snippet: string) => {
    const ta = textareaRef.current
    if (!ta) {
      onContentChange(content.trimEnd() + snippet)
      return
    }
    const { content: next, cursor } = insertAtCursor(
      content,
      snippet,
      ta.selectionStart,
      ta.selectionEnd,
    )
    onContentChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(cursor, cursor)
    })
  }

  const handleImageFile = async (file: File) => {
    setImageError(null)
    setImageBusy(true)
    try {
      const md = await imageFileToMarkdown(file)
      insertMarkdown(md)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not add image')
    } finally {
      setImageBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) void handleImageFile(file)
        return
      }
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="px-4 py-3 bg-transparent text-lg font-semibold text-theme outline-none border-b border-[var(--glass-border)]"
        placeholder="Note title"
      />

      <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--glass-border)] shrink-0">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={imageBusy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass hover-theme text-[11px] text-theme-secondary disabled:opacity-50"
          title="Insert image"
        >
          <ImagePlus size={14} />
          <span className="hidden sm:inline">{imageBusy ? 'Adding…' : 'Image'}</span>
        </button>
        <span className="text-[10px] text-theme-muted hidden md:inline">
          Paste or upload · max 400KB
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImageFile(file)
          }}
        />
      </div>

      {imageError && (
        <p className="px-4 py-1 text-[10px] text-red-400 border-b border-[var(--glass-border)] shrink-0">
          {imageError}
        </p>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onPaste={onPaste}
        className="flex-1 p-4 bg-transparent text-sm text-theme-secondary outline-none resize-none font-mono leading-relaxed min-h-0"
        spellCheck={false}
        placeholder="Start writing…"
      />
    </div>
  )
}
