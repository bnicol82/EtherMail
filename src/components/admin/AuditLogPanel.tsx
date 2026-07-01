import { useMemo } from 'react'
import { ScrollText } from 'lucide-react'
import { useEtherMailStore } from '../../store/useStore'
import type { AuditEvent } from '../../types/audit'

const CATEGORY_LABELS: Record<AuditEvent['category'], string> = {
  policy: 'Policy',
  ai: 'AI',
  email: 'Email',
  vault: 'Vault',
  admin: 'Admin',
  auth: 'Auth',
  share: 'Share',
}

export function AuditLogPanel() {
  const auditLog = useEtherMailStore((s) => s.auditLog)
  const clearAuditLog = useEtherMailStore((s) => s.clearAuditLog)

  const sorted = useMemo(
    () => [...auditLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [auditLog],
  )

  return (
    <section className="glass rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">Audit log</h2>
        </div>
        {auditLog.length > 0 && (
          <button
            type="button"
            onClick={clearAuditLog}
            className="text-[11px] px-2.5 py-1 rounded-lg glass text-theme-muted hover-theme"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-theme-muted mb-4">
        Policy denials, AI queries, exports, and admin changes. Demo log stored locally; production
        syncs to <code className="text-accent">audit_events</code> table.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-theme-muted text-center py-8">No events yet.</p>
      ) : (
        <div className="max-h-[min(50vh,400px)] overflow-y-auto space-y-2">
          {sorted.map((event) => (
            <div key={event.id} className="p-3 rounded-lg glass text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-theme">
                  {CATEGORY_LABELS[event.category]} · {event.action}
                </span>
                <time className="text-[10px] text-theme-muted shrink-0">
                  {new Date(event.timestamp).toLocaleString()}
                </time>
              </div>
              {event.detail && <p className="text-theme-secondary">{event.detail}</p>}
              {event.featureId && (
                <p className="text-[10px] text-theme-muted mt-0.5">Feature: {event.featureId}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
