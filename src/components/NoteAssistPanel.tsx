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
  { id: 'headings', label: 'Headings', prompt: 'Format headings' },
  { id: 'bullets', label: 'Bullets', prompt: 'Bulletize lists' },
  { id: 'structure', label: 'Structure', prompt: 'Improve note structure' },
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

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
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

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5 flex items-center gap-1">
          <Link2 size={10} /> Auto-link suggestions
        </p>
        {suggestions.length === 0 ? (
          <p className="text-[10px] text-theme-muted leading-relaxed">
            Mention other note titles in your text and suggested wiki links will appear here.
          </p>
        ) : (
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
        )}
      </div>
    </div>
  )
}
