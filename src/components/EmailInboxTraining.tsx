import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, ChevronDown, Sparkles } from 'lucide-react'
import type { Email, EmailJunkCategory } from '../types'

const JUNK_OPTIONS: { id: EmailJunkCategory; label: string }[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'phishing', label: 'Suspicious / harmful' },
  { id: 'promotional', label: 'Promotion' },
  { id: 'social', label: 'Social notification' },
  { id: 'automated', label: 'Automated / low priority' },
]

interface Props {
  email: Email
  classificationReason?: string
  onMarkImportant: () => void
  onMarkJunk: (category: EmailJunkCategory) => void
}

export function EmailInboxTraining({ email, classificationReason, onMarkImportant, onMarkJunk }: Props) {
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
    <div className="mt-6 pt-4 border-t border-[var(--glass-border)]">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-accent" />
        <p className="text-xs font-semibold text-theme">Train AI Inbox</p>
      </div>
      {classificationReason && (
        <p className="text-[10px] text-theme-muted mb-2">AI thinks: {classificationReason}</p>
      )}
      <p className="text-[10px] text-theme-muted mb-2">
        Teach the assistant what matters — future mail from <strong className="text-theme-secondary">{email.fromName}</strong> will be classified accordingly.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMarkImportant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-emerald-400 hover-theme border border-emerald-500/30"
        >
          <ThumbsUp size={14} />
          Always important
        </button>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme"
          >
            <ThumbsDown size={14} />
            Not important
            <ChevronDown size={12} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 z-20 glass-frost rounded-xl p-1.5 min-w-[180px] shadow-xl border border-[var(--glass-border)]">
              {JUNK_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onMarkJunk(opt.id)
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-theme-secondary hover-theme"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
