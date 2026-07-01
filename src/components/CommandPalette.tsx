import { useEffect, useRef, useState } from 'react'
import { Search, Mail, FileText, Calendar, LayoutDashboard, Sparkles } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { globalSearch } from '../lib/globalSearch'
import { useFeatureVisible } from '../hooks/useFeatureGate'
import type { SearchResult } from '../types'

const TYPE_ICONS = {
  note: FileText,
  email: Mail,
  calendar: Calendar,
  view: LayoutDashboard,
}

export function CommandPalette() {
  const open = useEtherMailStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useEtherMailStore((s) => s.setCommandPaletteOpen)
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const setView = useEtherMailStore((s) => s.setView)
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const enabled = useFeatureVisible('command_palette')

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = globalSearch(query, notes, emails, calendarEvents)

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!open)
      }
      if (e.key === 'Escape' && open) {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setCommandPaletteOpen, enabled])

  useEffect(() => {
    if (!enabled && open) setCommandPaletteOpen(false)
  }, [enabled, open, setCommandPaletteOpen])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open || !enabled) return null

  const navigate = (result: SearchResult) => {
    if (result.view) setView(result.view)
    if (result.type === 'note' && result.sourceId) {
      selectNote(result.sourceId, { view: 'notes' })
    }
    if (result.type === 'email' && result.sourceId) {
      selectEmail(result.sourceId)
    }
    setCommandPaletteOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      navigate(results[activeIndex])
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="glass-frost w-full max-w-lg rounded-xl border border-[var(--glass-border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--glass-border)]">
          <Search size={18} className="text-theme-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search notes, emails, calendar, pages…"
            className="flex-1 bg-transparent outline-none text-sm text-theme placeholder:text-theme-muted"
          />
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded glass text-theme-muted">⌘K</kbd>
        </div>

        <div className="max-h-[min(50vh,320px)] overflow-y-auto py-2">
          {query.trim() === '' ? (
            <div className="px-4 py-6 text-center text-sm text-theme-muted">
              <Sparkles size={24} className="mx-auto mb-2 text-accent opacity-60" />
              Type to search your vault, inbox, and calendar
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-theme-muted text-center">No results for &quot;{query}&quot;</p>
          ) : (
            results.map((result, i) => {
              const Icon = TYPE_ICONS[result.type]
              return (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => navigate(result)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex ? 'bg-[var(--accent)]/15' : 'hover-theme'
                  }`}
                >
                  <Icon size={16} className="text-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-theme truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-theme-muted truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-[10px] uppercase text-theme-muted shrink-0">{result.type}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
