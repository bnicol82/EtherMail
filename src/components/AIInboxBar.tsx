import { Shield, ShieldOff, Megaphone, Newspaper, AlertTriangle, Bot, Users, Package } from 'lucide-react'
import type { EmailJunkCategory } from '../types'
import { getCategoryLabel } from '../lib/aiInbox'
import type { InboxHiddenStats } from '../lib/aiInbox'

const CATEGORY_STYLES: Record<
  EmailJunkCategory,
  { icon: typeof Shield; className: string }
> = {
  important: { icon: Shield, className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  marketing: { icon: Megaphone, className: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  newsletter: { icon: Newspaper, className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  spam: { icon: ShieldOff, className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  phishing: { icon: AlertTriangle, className: 'bg-red-600/20 text-red-300 border-red-500/40' },
  promotional: { icon: Megaphone, className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  social: { icon: Users, className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  automated: { icon: Package, className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
}

interface Props {
  enabled: boolean
  onToggle: () => void
  stats: InboxHiddenStats
}

export function AIInboxBar({ enabled, onToggle, stats }: Props) {
  const hiddenCategories = (Object.entries(stats.byCategory) as [EmailJunkCategory, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            enabled
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'glass text-theme-secondary hover-theme'
          }`}
          aria-pressed={enabled}
        >
          <Bot size={14} />
          AI Inbox
          {enabled && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
        </button>
        {enabled && (
          <span className="text-[10px] text-theme-muted truncate">
            {stats.shown} important · {stats.hidden} hidden
          </span>
        )}
      </div>

      {enabled && stats.hidden > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-theme-muted w-full">AI is hiding for you:</span>
          {hiddenCategories.map(([cat, count]) => {
            const style = CATEGORY_STYLES[cat]
            const Icon = style.icon
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${style.className}`}
              >
                <Icon size={10} />
                {count} {getCategoryLabel(cat).toLowerCase()}
              </span>
            )
          })}
        </div>
      )}

      {enabled && stats.hidden === 0 && stats.total > 0 && (
        <p className="text-[10px] text-emerald-400/90">All inbox mail looks important — nothing hidden.</p>
      )}
    </div>
  )
}

export function CategoryBadge({ category }: { category: EmailJunkCategory }) {
  if (category === 'important') return null
  const style = CATEGORY_STYLES[category]
  const Icon = style.icon
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] border ${style.className}`}
    >
      <Icon size={9} />
      {getCategoryLabel(category)}
    </span>
  )
}
