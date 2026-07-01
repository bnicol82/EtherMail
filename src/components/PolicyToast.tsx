import { useEffect } from 'react'
import { X, Shield } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'

/** Brief toast when an action is blocked by org policy */
export function PolicyToast() {
  const message = useEtherMailStore((s) => s.policyToast)
  const clearPolicyToast = useEtherMailStore((s) => s.clearPolicyToast)

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => clearPolicyToast(), 4500)
    return () => window.clearTimeout(timer)
  }, [message, clearPolicyToast])

  if (!message) return null

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[75] max-w-[min(92vw,24rem)] px-4 py-3 rounded-xl glass-frost border border-amber-500/30 shadow-xl flex items-start gap-2 animate-fade-in">
      <Shield size={16} className="text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs text-theme-secondary flex-1 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={clearPolicyToast}
        className="p-0.5 rounded hover-theme text-theme-muted shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
