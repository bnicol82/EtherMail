import { useState, useEffect, useRef } from 'react'
import { Search, Command } from 'lucide-react'
import { useNexusStore } from '../store/useStore'
import { searchVault } from '../lib/utils'

export function CommandBar() {
  const commandOpen = useNexusStore((s) => s.commandOpen)
  const setCommandOpen = useNexusStore((s) => s.setCommandOpen)
  const notes = useNexusStore((s) => s.notes)
  const emails = useNexusStore((s) => s.emails)
  const setView = useNexusStore((s) => s.setView)
  const selectNote = useNexusStore((s) => s.selectNote)
  const selectEmail = useNexusStore((s) => s.selectEmail)
  const createNote = useNexusStore((s) => s.createNote)
  const setAiMode = useNexusStore((s) => s.setAiMode)
  const addChatMessage = useNexusStore((s) => s.addChatMessage)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commandOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandOpen])

  if (!commandOpen) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4">
        <button
          onClick={() => setCommandOpen(true)}
          className="w-full glass-strong rounded-xl px-4 py-3 flex items-center gap-3 text-slate-500 hover:text-slate-300 transition-colors shadow-2xl shadow-black/40"
        >
          <Command size={16} />
          <span className="text-sm">Command /... (e.g. &apos;Draft email about budget&apos;)</span>
          <kbd className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded hidden sm:inline">⌘K</kbd>
        </button>
      </div>
    )
  }

  const results = query.trim()
    ? searchVault(query, notes, emails)
    : { notes: notes.slice(0, 4), emails: emails.slice(0, 3) }

  const actions = [
    {
      label: 'New Note',
      action: () => {
        createNote()
        setCommandOpen(false)
      },
    },
    {
      label: 'Go to Vault',
      action: () => {
        setView('vault')
        setCommandOpen(false)
      },
    },
    {
      label: 'Go to Email',
      action: () => {
        setView('email')
        setCommandOpen(false)
      },
    },
    {
      label: 'Ask Vault AI: Summarize Q3 Plan',
      action: () => {
        setView('ai')
        setAiMode('vault')
        addChatMessage({ role: 'user', content: 'Summarize Q3 Plan', mode: 'vault' })
        setCommandOpen(false)
      },
    },
    {
      label: 'Open Knowledge Graph',
      action: () => {
        setView('graph')
        setCommandOpen(false)
      },
    },
  ].filter((a) => !query || a.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm px-4"
      onClick={() => setCommandOpen(false)}
    >
      <div
        className="glass-strong rounded-xl w-full max-w-xl shadow-2xl animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vault, emails, or run a command..."
            className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setCommandOpen(false)
            }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {actions.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs text-slate-500 uppercase">Commands</p>
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.action}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {results.notes.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs text-slate-500 uppercase">Notes</p>
              {results.notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    selectNote(n.id)
                    setCommandOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10"
                >
                  <span className="text-white">{n.title}</span>
                  <span className="text-slate-500 ml-2 text-xs">{n.tags.join(' ')}</span>
                </button>
              ))}
            </div>
          )}

          {results.emails.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs text-slate-500 uppercase">Emails</p>
              {results.emails.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setView('email')
                    selectEmail(e.id)
                    setCommandOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10"
                >
                  <span className="text-white">{e.subject}</span>
                  <span className="text-slate-500 ml-2 text-xs">— {e.fromName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
