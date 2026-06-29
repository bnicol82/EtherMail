import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { SNOOZE_PRESETS } from '../lib/snooze'

interface Props {
  onSnooze: (presetId: string) => void
  label?: string
  compact?: boolean
}

export function SnoozeMenu({ onSnooze, label = 'Snooze', compact }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg glass text-theme-secondary hover-theme ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs'
        }`}
      >
        <Clock size={compact ? 10 : 14} />
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 glass-frost rounded-xl p-1.5 min-w-[140px] shadow-xl border border-[var(--glass-border)]">
          {SNOOZE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSnooze(p.id)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-theme-secondary hover-theme"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
