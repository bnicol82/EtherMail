import { useState } from 'react'
import {
  ArrowUpRight,
  Calendar,
  CheckSquare,
  Hash,
  Link2,
  ListTree,
  Mail,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import type { Email, Note } from '../types'
import {
  getLinkedEmails,
  getNoteTodos,
  getNoteToc,
  getOutgoingLinks,
  parseFrontmatter,
  setFrontmatterProperty,
  toggleNoteTodo,
  type WikiLinkRef,
} from '../lib/noteFeatures'
import { getBacklinks } from '../lib/utils'

interface Props {
  note: Note
  notes: Note[]
  emails: Email[]
  onSelectNote: (id: string) => void
  onSelectEmail: (id: string) => void
  onUpdateTags: (tags: string[]) => void
  onUpdateContent: (content: string) => void
  onComposeFromNote: () => void
  onMeetingPrepNote?: () => void
  onAiAction: (prompt: string) => void
  compact?: boolean
}

const CALLOUT_TYPES = ['note', 'tip', 'warning', 'info'] as const

export function NoteSidebar({
  note,
  notes,
  emails,
  onSelectNote,
  onSelectEmail,
  onUpdateTags,
  onUpdateContent,
  onComposeFromNote,
  onMeetingPrepNote,
  onAiAction,
  compact,
}: Props) {
  const [tagInput, setTagInput] = useState('')

  const backlinks = getBacklinks(note.title, notes)
  const outgoing = getOutgoingLinks(note, notes)
  const toc = getNoteToc(note.content)
  const todos = getNoteTodos(note)
  const linkedEmails = getLinkedEmails(note.id, emails)
  const { properties } = parseFrontmatter(note.content)
  const propertyKeys = Object.keys(properties).filter((k) => k !== 'tags')

  const addTag = () => {
    const next = tagInput.trim().toLowerCase()
    if (!next || note.tags.includes(next)) {
      setTagInput('')
      return
    }
    onUpdateTags([...note.tags, next])
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    onUpdateTags(note.tags.filter((t) => t !== tag))
  }

  const setProperty = (key: string, value: string) => {
    onUpdateContent(setFrontmatterProperty(note.content, key, value))
  }

  const toggleTodo = (lineIndex: number) => {
    onUpdateContent(toggleNoteTodo(note, lineIndex))
  }

  const sectionClass = compact ? 'space-y-2' : 'space-y-3'
  const headingClass =
    'text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5 flex items-center gap-1'

  return (
    <div className={sectionClass}>
      {toc.length > 1 && (
        <section>
          <p className={headingClass}>
            <ListTree size={10} /> Contents
          </p>
          <ul className="space-y-0.5">
            {toc.map((entry) => (
              <li key={`${entry.slug}-${entry.text}`}>
                <a
                  href={`#${entry.slug}`}
                  className="block text-[11px] text-theme-secondary hover:text-accent truncate"
                  style={{ paddingLeft: `${(entry.level - 1) * 8}px` }}
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className={headingClass}>
          <Hash size={10} /> Tags
        </p>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {note.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-accent-soft text-accent"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="hover:text-theme"
                aria-label={`Remove tag ${t}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Add tag…"
            className="flex-1 min-w-0 px-2 py-1 rounded-lg input-theme text-[10px] outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            className="p-1 rounded-lg glass hover-theme text-theme-muted"
            aria-label="Add tag"
          >
            <Plus size={12} />
          </button>
        </div>
      </section>

      <section>
        <p className={headingClass}>Properties</p>
        <div className="space-y-1">
          {propertyKeys.map((key) => (
            <label key={key} className="block text-[10px]">
              <span className="text-theme-muted capitalize">{key}</span>
              <input
                value={properties[key] ?? ''}
                onChange={(e) => setProperty(key, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 rounded-lg input-theme text-[11px] outline-none"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              const key = prompt('Property name')
              if (key?.trim()) setProperty(key.trim(), '')
            }}
            className="text-[10px] text-accent hover:underline"
          >
            + Add property
          </button>
        </div>
      </section>

      {todos.length > 0 && (
        <section>
          <p className={headingClass}>
            <CheckSquare size={10} /> Tasks ({todos.filter((t) => !t.done).length})
          </p>
          <ul className="space-y-1">
            {todos.map((todo) => (
              <li key={todo.lineIndex}>
                <label className="flex items-start gap-1.5 text-[11px] cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => toggleTodo(todo.lineIndex)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span className={todo.done ? 'line-through text-theme-muted' : 'text-theme-secondary'}>
                    {todo.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className={headingClass}>
          <ArrowUpRight size={10} /> Outgoing links ({outgoing.length})
        </p>
        {outgoing.length === 0 ? (
          <p className="text-[10px] text-theme-muted">No wiki links yet. Use [[Note Title]].</p>
        ) : (
          <div className="space-y-0.5">
            {outgoing.map((link) => (
              <LinkRow key={link.title} link={link} onSelectNote={onSelectNote} />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className={headingClass}>
          <Link2 size={10} /> Backlinks ({backlinks.length})
        </p>
        {backlinks.length === 0 ? (
          <p className="text-[10px] text-theme-muted">No backlinks</p>
        ) : (
          <div className="space-y-0.5">
            {backlinks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectNote(b.id)}
                className="block text-[11px] text-accent hover:underline truncate w-full text-left"
              >
                {b.title}
              </button>
            ))}
          </div>
        )}
      </section>

      {linkedEmails.length > 0 && (
        <section>
          <p className={headingClass}>
            <Mail size={10} /> Linked emails ({linkedEmails.length})
          </p>
          <div className="space-y-1">
            {linkedEmails.slice(0, 6).map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => onSelectEmail(email.id)}
                className="w-full text-left px-2 py-1.5 rounded-lg glass hover-theme"
              >
                <span className="text-[11px] text-theme-secondary block truncate">{email.subject}</span>
                <span className="text-[10px] text-theme-muted">{email.fromName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className={headingClass}>
          <Sparkles size={10} /> Actions
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={onComposeFromNote}
            className="w-full text-left text-[11px] px-2 py-1.5 rounded-lg glass hover-theme text-theme-secondary"
          >
            Compose email from note
          </button>
          {onMeetingPrepNote && (
            <button
              type="button"
              onClick={onMeetingPrepNote}
              className="w-full text-left text-[11px] px-2 py-1.5 rounded-lg glass hover-theme text-theme-secondary flex items-center gap-1"
            >
              <Calendar size={10} /> Save meeting prep note
            </button>
          )}
          {['Find similar notes', 'Suggest tags'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onAiAction(action)}
              className="w-full text-left text-[11px] px-2 py-1.5 rounded-lg glass hover-theme text-theme-secondary"
            >
              {action}
            </button>
          ))}
        </div>
        {!compact && (
          <p className="text-[9px] text-theme-muted mt-2 leading-relaxed">
            Callouts: {CALLOUT_TYPES.map((t) => `> [!${t}]`).join(' · ')}
          </p>
        )}
      </section>
    </div>
  )
}

function LinkRow({
  link,
  onSelectNote,
}: {
  link: WikiLinkRef
  onSelectNote: (id: string) => void
}) {
  if (link.note) {
    return (
      <button
        type="button"
        onClick={() => onSelectNote(link.note!.id)}
        className="block text-[11px] text-accent hover:underline truncate w-full text-left"
      >
        {link.alias ? `${link.alias} → ${link.title}` : link.title}
      </button>
    )
  }
  return (
    <span className="block text-[11px] text-theme-muted truncate">
      {link.title} <span className="opacity-70">(missing)</span>
    </span>
  )
}
