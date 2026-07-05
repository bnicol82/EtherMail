import { useState } from 'react'
import { Copy, Lock, LockOpen, Shield, Trash2 } from 'lucide-react'
import { useNexusStore } from '../store/useStore'

export function E2eeSettingsPanel() {
  const e2ee = useNexusStore((s) => s.e2ee)
  const e2eeUnlocked = useNexusStore((s) => s.e2eeUnlocked)
  const accounts = useNexusStore((s) => s.accounts)
  const setE2eeEnabled = useNexusStore((s) => s.setE2eeEnabled)
  const generateE2eeKeys = useNexusStore((s) => s.generateE2eeKeys)
  const unlockE2ee = useNexusStore((s) => s.unlockE2ee)
  const lockE2ee = useNexusStore((s) => s.lockE2ee)
  const addRecipientPublicKey = useNexusStore((s) => s.addRecipientPublicKey)
  const removeRecipientPublicKey = useNexusStore((s) => s.removeRecipientPublicKey)

  const [passphrase, setPassphrase] = useState('')
  const [unlockPass, setUnlockPass] = useState('')
  const [keyEmail, setKeyEmail] = useState(
    () => accounts.find((a) => a.connected)?.email ?? accounts[0]?.email ?? '',
  )
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientKey, setRecipientKey] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const copyPublicKey = async () => {
    if (!e2ee.publicKeyArmored) return
    await navigator.clipboard.writeText(e2ee.publicKeyArmored)
    setStatus('Public key copied to clipboard.')
  }

  const onGenerate = async () => {
    setBusy(true)
    setError(null)
    setStatus(null)
    const result = await generateE2eeKeys(keyEmail, passphrase)
    setBusy(false)
    if (result.ok) {
      setPassphrase('')
      setStatus('Keypair generated. Your private key is encrypted with your passphrase and stored locally.')
    } else {
      setError(result.error ?? 'Failed')
    }
  }

  const onUnlock = async () => {
    setBusy(true)
    setError(null)
    const result = await unlockE2ee(unlockPass)
    setBusy(false)
    if (result.ok) {
      setUnlockPass('')
      setStatus('Keys unlocked for this session.')
    } else {
      setError(result.error ?? 'Unlock failed')
    }
  }

  const onAddRecipient = async () => {
    setBusy(true)
    setError(null)
    const result = await addRecipientPublicKey(recipientEmail, recipientKey)
    setBusy(false)
    if (result.ok) {
      setRecipientEmail('')
      setRecipientKey('')
      setStatus('Recipient public key saved.')
    } else {
      setError(result.error ?? 'Failed')
    }
  }

  return (
    <section className="glass rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={18} className="text-emerald-400" />
        <h2 className="font-semibold text-white">End-to-end encryption (OpenPGP)</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Email is encrypted in your browser with OpenPGP before it leaves the device. Mail providers
        and servers only see ciphertext — not the message body. TLS protects data in transit; E2EE
        protects content at rest on provider servers.
      </p>

      <label className="flex items-center gap-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={e2ee.enabled}
          onChange={(e) => setE2eeEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-emerald-500"
        />
        <span className="text-sm text-slate-300">Encrypt outgoing mail by default</span>
      </label>

      {!e2ee.publicKeyArmored ? (
        <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm text-slate-400">Generate your OpenPGP keypair</p>
          <input
            type="email"
            value={keyEmail}
            onChange={(e) => setKeyEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none"
          />
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Passphrase (8+ characters)"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none"
          />
          <button
            type="button"
            disabled={busy || !keyEmail || passphrase.length < 8}
            onClick={() => void onGenerate()}
            className="px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm disabled:opacity-40"
          >
            Generate keys
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
            <p className="text-emerald-300 font-medium">{e2ee.keyEmail}</p>
            <p className="text-xs text-slate-500 mt-1 font-mono truncate">
              Fingerprint: {e2ee.fingerprint}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => void copyPublicKey()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 hover:bg-white/10"
              >
                <Copy size={12} /> Copy public key
              </button>
              {e2eeUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    lockE2ee()
                    setStatus('Keys locked.')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 hover:bg-white/10"
                >
                  <Lock size={12} /> Lock keys
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400">
                  <Lock size={12} /> Locked
                </span>
              )}
            </div>
          </div>

          {!e2eeUnlocked && (
            <div className="flex gap-2">
              <input
                type="password"
                value={unlockPass}
                onChange={(e) => setUnlockPass(e.target.value)}
                placeholder="Passphrase to unlock"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none"
              />
              <button
                type="button"
                disabled={busy || !unlockPass}
                onClick={() => void onUnlock()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600/80 text-white text-sm disabled:opacity-40"
              >
                <LockOpen size={14} /> Unlock
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/10">
        <h3 className="text-sm font-medium text-white mb-2">Recipient public keys</h3>
        <p className="text-xs text-slate-500 mb-3">
          Add OpenPGP public keys for people you email. Share your public key so they can encrypt to you.
        </p>
        {e2ee.recipientKeys.length > 0 && (
          <ul className="space-y-2 mb-3">
            {e2ee.recipientKeys.map((k) => (
              <li
                key={k.email}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-slate-300 truncate">{k.email}</p>
                  <p className="text-[10px] text-slate-600 font-mono truncate">{k.fingerprint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRecipientPublicKey(k.email)}
                  className="p-1.5 text-slate-500 hover:text-red-400"
                  aria-label={`Remove key for ${k.email}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="w-full mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none"
        />
        <textarea
          value={recipientKey}
          onChange={(e) => setRecipientKey(e.target.value)}
          placeholder="Paste armored public key (-----BEGIN PGP PUBLIC KEY BLOCK-----)"
          rows={4}
          className="w-full mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono outline-none resize-none"
        />
        <button
          type="button"
          disabled={busy || !recipientEmail || !recipientKey.trim()}
          onClick={() => void onAddRecipient()}
          className="px-4 py-2 rounded-lg bg-white/10 text-sm text-slate-300 hover:bg-white/15 disabled:opacity-40"
        >
          Add recipient key
        </button>
      </div>

      {status && <p className="text-xs text-emerald-400 mt-3">{status}</p>}
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </section>
  )
}
