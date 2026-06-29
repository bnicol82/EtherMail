import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
      title={hidden ? `Show ${label}` : `Hide ${label}`}
      aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
    >
      {hidden ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
    </button>
  )
}

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
      className={`shrink-0 px-2 py-3 glass border border-[var(--glass-border)] rounded-lg text-[10px] font-medium text-theme-muted hover:text-theme hover-theme writing-mode-vertical ${className}`}
      style={{ writingMode: 'vertical-rl' }}
      title={`Show ${label}`}
    >
      {label}
    </button>
  )
}
