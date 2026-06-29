import { useState } from 'react'
import type { Email } from '../types'
import { AccountDot } from './AccountDot'
import { useEtherMailStore } from '../store/useStore'
import type { EmailThread } from '../lib/emailThreads'

interface Props {
  thread: EmailThread
  activeEmailId: string | null
  onSelectMessage: (id: string) => void
}

export function EmailThreadConversation({ thread, activeEmailId, onSelectMessage }: Props) {
  const accounts = useEtherMailStore((s) => s.accounts)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([activeEmailId ?? thread.latest.id]))

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    onSelectMessage(id)
  }

  if (thread.emails.length <= 1) return null

  return (
    <div className="mb-4 pb-4 border-b border-[var(--glass-border)]">
      <p className="text-xs text-theme-muted mb-3 flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded-full bg-accent-soft text-accent font-medium">
          {thread.emails.length} messages
        </span>
        in this conversation
      </p>
      <div className="space-y-2">
        {thread.emails.map((email, index) => (
          <ThreadMessageCard
            key={email.id}
            email={email}
            account={accounts.find((a) => a.id === email.accountId)}
            expanded={expanded.has(email.id)}
            isLatest={index === thread.emails.length - 1}
            isActive={activeEmailId === email.id}
            onToggle={() => toggle(email.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ThreadMessageCard({
  email,
  account,
  expanded,
  isLatest,
  isActive,
  onToggle,
}: {
  email: Email
  account: ReturnType<typeof useEtherMailStore.getState>['accounts'][0] | undefined
  expanded: boolean
  isLatest: boolean
  isActive: boolean
  onToggle: () => void
}) {
  const folder = email.folder ?? 'inbox'
  const folderLabel =
    folder === 'sent' ? 'Sent' : folder === 'drafts' ? 'Draft' : folder === 'archive' ? 'Archive' : null

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isActive ? 'border-[var(--accent)]/50 bg-accent-soft/20' : 'border-[var(--glass-border)] glass'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-theme">{email.fromName}</span>
            <AccountDot account={account} />
            {!email.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            )}
            {isLatest && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-accent">
                Latest
              </span>
            )}
            {folderLabel && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full glass text-theme-muted">
                {folderLabel}
              </span>
            )}
          </div>
          <p className="text-[10px] text-theme-muted mt-0.5">
            {new Date(email.date).toLocaleString()}
            {email.to && <span className="ml-2">→ {email.to}</span>}
          </p>
          {!expanded && (
            <p className="text-xs text-theme-muted mt-1 truncate">{email.preview}</p>
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--glass-border)]/60">
          <div className="whitespace-pre-wrap text-sm text-theme-secondary leading-relaxed pt-3">
            {email.body}
          </div>
        </div>
      )}
    </div>
  )
}
