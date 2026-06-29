import { useState } from 'react'
import { Shield, ShieldOff, Megaphone, Newspaper, AlertTriangle, Bot, Users, Package, Trash2 } from 'lucide-react'
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
  inboxEnabled: boolean
  outboxEnabled: boolean
  onToggleInbox: () => void
  onToggleOutbox: () => void
  stats: InboxHiddenStats
  onDeleteAllOutbox: () => void
}

export function AIInboxBar({
  inboxEnabled,
  outboxEnabled,
  onToggleInbox,
  onToggleOutbox,
  stats,
  onDeleteAllOutbox,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const hiddenCategories = (Object.entries(stats.byCategory) as [EmailJunkCategory, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  const handleDeleteAll = () => {
    onDeleteAllOutbox()
    setConfirmDelete(false)
  }

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={onToggleInbox}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            inboxEnabled
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'glass text-theme-secondary hover-theme'
          }`}
          aria-pressed={inboxEnabled}
        >
          <Bot size={14} />
          AI Inbox
          {inboxEnabled && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
        </button>
        <button
          type="button"
          onClick={onToggleOutbox}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            outboxEnabled
              ? 'bg-red-500/90 text-white shadow-sm'
              : 'glass text-theme-secondary hover-theme'
          }`}
          aria-pressed={outboxEnabled}
        >
          <ShieldOff size={14} />
          AI Outbox
          {stats.hidden > 0 && !outboxEnabled && (
            <span className="text-[10px] px-1 rounded-full bg-black/20">{stats.hidden}</span>
          )}
        </button>
        {inboxEnabled && !outboxEnabled && (
          <span className="text-[10px] text-theme-muted truncate flex-1 min-w-0 text-right">
            {stats.shown} important · {stats.hidden} hidden
          </span>
        )}
        {outboxEnabled && (
          <span className="text-[10px] text-theme-muted truncate flex-1 min-w-0 text-right">
            {stats.hidden} filtered
          </span>
        )}
      </div>

      {inboxEnabled && !outboxEnabled && stats.hidden > 0 && (
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

      {inboxEnabled && !outboxEnabled && stats.hidden === 0 && stats.total > 0 && (
        <p className="text-[10px] text-emerald-400/90">All inbox mail looks important — nothing hidden.</p>
      )}

      {outboxEnabled && (
        <div className="space-y-2">
          {stats.hidden > 0 ? (
            <>
              <div className="flex flex-wrap gap-1">
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
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-400 glass hover-theme border border-red-500/30 w-full justify-center"
                >
                  <Trash2 size={14} />
                  Delete all outbox ({stats.hidden})
                </button>
              ) : (
                <div className="glass rounded-lg p-2.5 border border-red-500/30 space-y-2">
                  <p className="text-xs text-theme-secondary text-center">
                    Delete all {stats.hidden} filtered email{stats.hidden === 1 ? '' : 's'}? They will move to Trash.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 px-2 py-1.5 rounded-lg glass text-xs text-theme-muted hover-theme"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAll}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-red-500/90 text-white text-xs font-medium hover:opacity-90"
                    >
                      Yes, delete all
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[10px] text-theme-muted">No filtered mail in your outbox.</p>
          )}
        </div>
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
