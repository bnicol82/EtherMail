import { useState, useEffect } from 'react'
import { Check, Loader2, Shield, X } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { getProviderConfig } from '../lib/oauth/providers'
import { canUseRealOAuth, simulateOAuthDelay, startRealOAuth } from '../lib/oauth/connect'
import { providerLabel } from '../lib/utils'

type Step = 'consent' | 'syncing' | 'done' | 'error'

export function ConnectAccountModal() {
  const connectingAccountId = useEtherMailStore((s) => s.connectingAccountId)
  const accounts = useEtherMailStore((s) => s.accounts)
  const oauthSettings = useEtherMailStore((s) => s.oauthSettings)
  const setConnectingAccountId = useEtherMailStore((s) => s.setConnectingAccountId)
  const finishConnectAccount = useEtherMailStore((s) => s.finishConnectAccount)

  const [step, setStep] = useState<Step>('consent')
  const [error, setError] = useState<string | null>(null)

  const account = accounts.find((a) => a.id === connectingAccountId)

  useEffect(() => {
    if (connectingAccountId) {
      setStep('consent')
      setError(null)
    }
  }, [connectingAccountId])

  if (!account) return null

  const config = getProviderConfig(account.provider)
  const useReal = canUseRealOAuth(account.provider, oauthSettings)

  const close = () => {
    setConnectingAccountId(null)
    setStep('consent')
    setError(null)
  }

  const handleAllow = async () => {
    if (useReal) {
      try {
        await startRealOAuth(account, oauthSettings)
      } catch {
        setError('Could not start OAuth. Check your client ID in Settings.')
        setStep('error')
      }
      return
    }

    setStep('syncing')
    await simulateOAuthDelay()
    finishConnectAccount(account.id, 'demo')
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-frost rounded-2xl w-full max-w-md shadow-2xl border border-[var(--glass-border)] overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `3px solid ${config.brandColor}` }}
        >
          <div>
            <p className="text-xs text-theme-muted uppercase tracking-wider">Connect account</p>
            <p className="text-lg font-semibold text-theme">{config.name}</p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover-theme text-theme-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {step === 'consent' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: config.brandColor }}
                >
                  {config.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-theme">{account.email}</p>
                  <p className="text-xs text-theme-muted">{providerLabel(account.provider)}</p>
                </div>
              </div>

              <div className="glass rounded-xl p-4 mb-5 text-sm text-theme-secondary space-y-2">
                <p className="flex items-center gap-2 font-medium text-theme">
                  <Shield size={14} className="text-emerald-500" />
                  EtherMail is requesting access to:
                </p>
                <ul className="text-xs space-y-1.5 ml-1 text-theme-muted">
                  <li>· Read your email messages</li>
                  <li>· Read calendar events</li>
                  <li>· Sync attachments to your vault</li>
                </ul>
                {!useReal && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 pt-2 border-t border-[var(--glass-border)]">
                    Demo mode — no client ID configured. Simulated OAuth will import demo data.
                    Add OAuth client IDs in Settings for live sync.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="flex-1 py-2.5 rounded-xl glass text-sm text-theme-secondary hover-theme"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllow}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: config.brandColor }}
                >
                  Allow
                </button>
              </div>
            </>
          )}

          {step === 'syncing' && (
            <div className="text-center py-8">
              <Loader2 size={32} className="mx-auto text-accent animate-spin mb-3" />
              <p className="text-sm font-medium text-theme">Syncing inbox & calendar…</p>
              <p className="text-xs text-theme-muted mt-1">{account.email}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-theme">Connected!</p>
              <p className="text-xs text-theme-muted mt-1 mb-4">
                Inbox and calendar events are now synced.
              </p>
              <button onClick={close} className="px-6 py-2 rounded-xl btn-accent text-sm">
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-6">
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button onClick={close} className="px-6 py-2 rounded-xl glass text-sm">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
