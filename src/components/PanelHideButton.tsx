import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'

interface Props {
  panelId: string
  label?: string
  className?: string
}

export function PanelHideButton({ panelId, label = 'Hide', className = '' }: Props) {
  const hidden = useEtherMailStore((s) => s.hiddenPanels[panelId] ?? false)
  const togglePanelHidden = useEtherMailStore((s) => s.togglePanelHidden)

  return (
    <button
      type="button"
      onClick={() => togglePanelHidden(panelId)}
      className={`p-1.5 rounded-lg hover-theme text-theme-muted hover:text-theme ${className}`}
      title={hidden ? `Show ${label}` : `Collapse ${label}`}
      aria-label={hidden ? `Show ${label}` : `Collapse ${label}`}
    >
      {hidden ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
    </button>
  )
}

/** Horizontal restore bar — shown at the top when a panel is collapsed upward */
export function PanelRestoreTab({
  panelId,
  label,
  className = '',
}: {
  panelId: string
  label: string
  className?: string
}) {
  const hidden = useEtherMailStore((s) => s.hiddenPanels[panelId] ?? false)
  const togglePanelHidden = useEtherMailStore((s) => s.togglePanelHidden)

  if (!hidden) return null

  return (
    <button
      type="button"
      onClick={() => togglePanelHidden(panelId)}
      className={`w-full shrink-0 flex items-center justify-center gap-1.5 py-2 px-3 glass border border-[var(--glass-border)] rounded-lg text-xs font-medium text-theme-muted hover:text-theme hover-theme ${className}`}
      title={`Show ${label}`}
    >
      <ChevronDown size={14} />
      {label}
    </button>
  )
}
