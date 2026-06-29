import { useEffect, useState } from 'react'
import { Send, FileEdit, X } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { ComposeDraft } from '../types'
import { providerColor, providerLabel } from '../lib/utils'

export function ComposeEmailModal() {
  const composeDraft = useEtherMailStore((s) => s.composeDraft)
  const accounts = useEtherMailStore((s) => s.accounts)
  const closeCompose = useEtherMailStore((s) => s.closeCompose)
  const sendComposedEmail = useEtherMailStore((s) => s.sendComposedEmail)
  const saveComposeDraft = useEtherMailStore((s) => s.saveComposeDraft)

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    if (!composeDraft) return
    setTo(composeDraft.to)
    setSubject(composeDraft.subject)
    setBody(composeDraft.body)
    setAccountId(composeDraft.accountId)
  }, [composeDraft])

  if (!composeDraft) return null

  const connectedAccounts = accounts.filter((a) => a.connected)
  const draft: ComposeDraft = {
    id: composeDraft.id,
    to,
    subject,
    body,
    accountId: accountId || composeDraft.accountId,
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-24 sm:pb-4 bg-black/40 backdrop-blur-sm"
      onClick={closeCompose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-title"
    >
      <div
        className="glass-frost rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[min(90vh,36rem)] shadow-2xl border border-[var(--glass-border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--glass-border)] shrink-0">
          <h2 id="compose-title" className="text-base font-semibold text-theme">
            {composeDraft.id ? 'Edit draft' : 'New message'}
          </h2>
          <button
            type="button"
            onClick={closeCompose}
            className="p-1.5 rounded-lg hover-theme text-theme-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {connectedAccounts.length > 1 && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
                From
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
              >
                {connectedAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.email} ({providerLabel(acc.provider)})
                  </option>
                ))}
              </select>
            </div>
          )}
          {connectedAccounts.length === 1 && (
            <p className="text-xs text-theme-muted flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: providerColor(connectedAccounts[0].provider) }}
              />
              From {connectedAccounts[0].email}
            </p>
          )}

          <div>
            <label htmlFor="compose-to" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
              To
            </label>
            <input
              id="compose-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
            />
          </div>

          <div>
            <label htmlFor="compose-subject" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
              Subject
            </label>
            <input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
            />
          </div>

          <div className="flex-1 min-h-[140px]">
            <label htmlFor="compose-body" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
              Message
            </label>
            <textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={8}
              className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none resize-y min-h-[140px]"
            />
          </div>
        </div>

        <div className="flex gap-2 p-3 border-t border-[var(--glass-border)] shrink-0">
          <button
            type="button"
            onClick={() => saveComposeDraft(draft)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl glass text-sm text-theme-secondary hover-theme"
          >
            <FileEdit size={14} />
            Save draft
          </button>
          <button
            type="button"
            onClick={closeCompose}
            className="px-3 py-2 rounded-xl glass text-sm text-theme-muted hover-theme"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => sendComposedEmail(draft)}
            disabled={!to.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl btn-accent text-sm font-medium disabled:opacity-40"
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
