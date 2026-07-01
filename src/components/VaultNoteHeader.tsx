import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  breadcrumbs: string[]
  title: string
  onBack?: () => void
  showBack?: boolean
  actions?: ReactNode
}

/** Two-row note header — breadcrumbs on line 1, title + actions on line 2 */
export function VaultNoteHeader({ breadcrumbs, title, onBack, showBack, actions }: Props) {
  return (
    <div className="shrink-0 flex flex-col gap-2 px-3 sm:px-4 py-2.5 border-b border-[var(--glass-border)] glass">
      <div className="flex items-center gap-2 min-w-0">
        {showBack && onBack && (
          <button
            type="button"
            className="shrink-0 text-theme-secondary hover:text-theme text-sm"
            onClick={onBack}
          >
            ← Back
          </button>
        )}
        <nav
          className="flex items-center gap-1 text-[11px] text-theme-muted min-w-0 flex-1 overflow-x-auto whitespace-nowrap"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((c, i) => (
            <span key={`${c}-${i}`} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight size={11} className="opacity-60" />}
              <span className={i === breadcrumbs.length - 1 ? 'text-theme-secondary' : ''}>{c}</span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center justify-between gap-3 min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-theme truncate min-w-0 flex-1">
          {title}
        </h2>
        {actions && <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">{actions}</div>}
      </div>
    </div>
  )
}
