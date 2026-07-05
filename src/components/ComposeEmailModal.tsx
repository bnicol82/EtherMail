import { useEffect, useState } from 'react'
import { Lock, Send, X, AlertCircle } from 'lucide-react'
import { useNexusStore } from '../store/useStore'

export function ComposeEmailModal() {
  const composeDraft = useNexusStore((s) => s.composeDraft)
  const accounts = useNexusStore((s) => s.accounts)
  const e2ee = useNexusStore((s) => s.e2ee)
  const e2eeUnlocked = useNexusStore((s) => s.e2eeUnlocked)
  const closeCompose = useNexusStore((s) => s.closeCompose)
  const sendComposedEmail = useNexusStore((s) => s.sendComposedEmail)
  const setView = useNexusStore((s) => s.setView)

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [encrypt, setEncrypt] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!composeDraft) return
    setTo(composeDraft.to)
    setSubject(composeDraft.subject)
    setBody(composeDraft.body)
    setEncrypt(composeDraft.encrypt)
    setError(null)
  }, [composeDraft])

  if (!composeDraft) return null

  const fromAccount = accounts.find((a) => a.connected) ?? accounts[0]

  const handleSend = async () => {
    setError(null)
    setSending(true)
    const result = await sendComposedEmail({ to, subject, body, encrypt })
    setSending(false)
    if (!result.ok) {
      setError(result.error ?? 'Send failed')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={closeCompose}
    >
      <div
        className="glass-strong w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="font-semibold text-white">Compose</h2>
          <button
            type="button"
            onClick={closeCompose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
            aria-label="Close compose"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500">From</label>
            <p className="text-sm text-slate-300">{fromAccount?.email ?? 'No account'}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500">To</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write your message..."
              className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50 resize-none font-mono leading-relaxed"
            />
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 cursor-pointer">
            <input
              type="checkbox"
              checked={encrypt}
              onChange={(e) => setEncrypt(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-emerald-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                <Lock size={14} />
                Encrypt with OpenPGP (E2EE)
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Message body is encrypted in your browser before send. Only recipients with the
                matching private key can read it. Phase 2 OAuth send will transmit the ciphertext.
              </p>
              {encrypt && !e2ee.publicKeyArmored && (
                <p className="text-xs text-amber-400 mt-2">
                  Generate your keys in Settings → End-to-end encryption first.
                </p>
              )}
              {encrypt && e2ee.publicKeyArmored && !e2eeUnlocked && (
                <p className="text-xs text-amber-400 mt-2">
                  Unlock your keys in Settings before sending encrypted mail.
                </p>
              )}
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setView('settings')}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            E2EE settings
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeCompose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !to.trim() || !body.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40"
            >
              <Send size={16} />
              {sending ? 'Sending…' : encrypt ? 'Send encrypted' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
