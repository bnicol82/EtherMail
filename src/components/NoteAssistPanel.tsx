import { Link2, Sparkles, Wand2 } from 'lucide-react'
import type { AutoLinkSuggestion } from '../lib/noteAssist'

interface Props {
  suggestions: AutoLinkSuggestion[]
  onApplyLink: (suggestion: AutoLinkSuggestion) => void
  onFormatHeadings: () => void
  onFormatBullets: () => void
  onFormatStructure: () => void
  onAiFormat: (prompt: string) => void
  compact?: boolean
}

const FORMAT_ACTIONS = [
  { id: 'headings', label: 'Headings' },
  { id: 'bullets', label: 'Bullets' },
  { id: 'structure', label: 'Structure' },
] as const

export function NoteAssistPanel({
  suggestions,
  onApplyLink,
  onFormatHeadings,
  onFormatBullets,
  onFormatStructure,
  onAiFormat,
  compact,
}: Props) {
  const formatHandlers: Record<string, () => void> = {
    headings: onFormatHeadings,
    bullets: onFormatBullets,
    structure: onFormatStructure,
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <Wand2 size={12} className="text-theme-muted shrink-0" aria-hidden />
        {FORMAT_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => formatHandlers[action.id]()}
            className="text-[10px] px-2 py-1 rounded-full glass hover-theme text-theme-secondary whitespace-nowrap shrink-0"
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onAiFormat('Polish wording and formatting for this note')}
          className="text-[10px] px-2 py-1 rounded-full glass hover-theme text-accent flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <Sparkles size={10} /> AI
        </button>
        {suggestions.length > 0 && (
          <>
            <span className="w-px h-4 bg-[var(--glass-border)] shrink-0 mx-0.5" />
            <Link2 size={12} className="text-accent shrink-0" aria-hidden />
            {suggestions.map((s) => (
              <button
                key={`${s.noteId}-${s.matchText}`}
                type="button"
                onClick={() => onApplyLink(s)}
                className="text-[10px] px-2 py-1 rounded-full border border-[var(--accent-border)] bg-accent-soft text-accent whitespace-nowrap shrink-0"
                title={`Insert [[${s.title}]] for "${s.matchText}"`}
              >
                [[{s.title.length > 14 ? `${s.title.slice(0, 12)}…` : s.title}]]
              </button>
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5 flex items-center gap-1">
          <Wand2 size={10} /> Quick format
        </p>
        <div className="flex flex-wrap gap-1">
          {FORMAT_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => formatHandlers[action.id]()}
              className="text-[10px] px-2 py-1 rounded-full glass hover-theme text-theme-secondary"
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onAiFormat('Polish wording and formatting for this note')}
            className="text-[10px] px-2 py-1 rounded-full glass hover-theme text-accent flex items-center gap-1"
          >
            <Sparkles size={10} /> AI polish
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5 flex items-center gap-1">
            <Link2 size={10} /> Auto-link suggestions
          </p>
          <div className="space-y-1">
            {suggestions.map((s) => (
              <button
                key={`${s.noteId}-${s.matchText}`}
                type="button"
                onClick={() => onApplyLink(s)}
                className="w-full text-left px-2 py-1.5 rounded-lg glass hover-theme group"
              >
                <span className="text-[11px] text-accent font-medium block truncate">
                  [[{s.title}]]
                </span>
                <span className="text-[10px] text-theme-muted block truncate">
                  “{s.matchText}” · {s.reason}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
