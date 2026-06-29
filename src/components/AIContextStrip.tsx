import { useEtherMailStore } from '../store/useStore'
import { getAIContext } from '../lib/aiContext'
import { Sparkles, Bot } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'

/** Always-on contextual AI lane — sits above the bottom dock on every page */
export function AIContextStrip() {
  const view = useEtherMailStore((s) => s.view)
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const activeEmailId = useEtherMailStore((s) => s.activeEmailId)
  const activeNoteId = useEtherMailStore((s) => s.activeNoteId)
  const aiLoading = useEtherMailStore((s) => s.aiLoading)
  const aiContextResponse = useEtherMailStore((s) => s.aiContextResponse)
  const submitAiQuery = useEtherMailStore((s) => s.submitAiQuery)

  const activeEmail = emails.find((e) => e.id === activeEmailId) ?? null
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null
  const ctx = getAIContext(view, { activeEmail, activeNote, emails, notes })

  const hasResponse = aiLoading || aiContextResponse

  return (
    <div className="fixed inset-x-0 z-20 bottom-[3.5rem] sm:bottom-[3.25rem] pointer-events-none">
      <div className="mx-2 sm:mx-3 pointer-events-auto">
        {/* Response area — expands inline, no overlay */}
        {hasResponse && (
          <div className="glass-frost rounded-t-xl border border-b-0 border-[var(--glass-border)] overflow-hidden max-h-[min(35vh,240px)] flex flex-col mb-0">
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {aiLoading ? (
                <p className="text-sm text-theme-muted animate-pulse flex items-center gap-2">
                  <Sparkles size={14} className="text-accent" />
                  EtherMail AI is thinking...
                </p>
              ) : aiContextResponse ? (
                <div className="text-sm text-theme-secondary">
                  <MarkdownContent content={aiContextResponse} />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Always-visible contextual suggestion bar */}
        <div className="glass-frost rounded-xl border border-[var(--glass-border)] px-3 py-2 flex items-center gap-2 flex-wrap shadow-md">
          <div className="flex items-center gap-1.5 shrink-0">
            <Bot size={13} className="text-accent" />
            <span className="text-[11px] font-semibold text-theme max-w-[120px] sm:max-w-[200px] truncate">
              {ctx.label}
            </span>
          </div>
          <div className="flex gap-1 flex-wrap flex-1 min-w-0">
            {ctx.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => submitAiQuery(s, ctx.contextPrefix)}
                disabled={aiLoading}
                className="text-[10px] sm:text-[11px] px-2 py-1 rounded-full glass hover-theme text-theme-secondary disabled:opacity-50 whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
