import { useEffect, useState } from 'react'
import { BarChart3, Bot, Mail } from 'lucide-react'
import { useEtherMailStore } from '../../store/useStore'
import { fetchOrgUsage, hasOrgApi } from '../../lib/orgApi'
import type { OrgUsageResponse } from '../../types/orgApi'
import { getEffectiveLimits, featureGateFromStore } from '../../lib/featureGates'

function formatLimit(used: number, limit: number | null) {
  if (limit === null) return `${used} / ∞`
  return `${used} / ${limit}`
}

function usagePercent(used: number, limit: number | null) {
  if (limit === null || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function UsagePanel() {
  const accounts = useEtherMailStore((s) => s.accounts)
  const orgPolicy = useEtherMailStore((s) => s.orgPolicy)
  const userRole = useEtherMailStore((s) => s.userRole)
  const planTier = useEtherMailStore((s) => s.planTier)

  const connectedMailboxes = accounts.filter((a) => a.connected).length
  const [remote, setRemote] = useState<OrgUsageResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const localLimits = getEffectiveLimits(featureGateFromStore({ orgPolicy, userRole, planTier }))

  useEffect(() => {
    if (!hasOrgApi()) return
    setLoading(true)
    void fetchOrgUsage(connectedMailboxes)
      .then(setRemote)
      .finally(() => setLoading(false))
  }, [connectedMailboxes])

  const aiUsed = remote?.aiQueries.used ?? 0
  const aiLimit = remote?.aiQueries.limit ?? (
    Number.isFinite(localLimits.aiQueriesPerMonth) ? localLimits.aiQueriesPerMonth : null
  )
  const mailboxUsed = remote?.mailboxes.used ?? connectedMailboxes
  const mailboxLimit = remote?.mailboxes.limit ?? (
    Number.isFinite(localLimits.maxMailboxes) ? localLimits.maxMailboxes : null
  )
  const period = remote?.period ?? new Date().toISOString().slice(0, 7)

  return (
    <section className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-accent" />
        <h2 className="font-semibold text-theme">Usage & quotas</h2>
      </div>
      <p className="text-xs text-theme-muted mb-4">
        Server-tracked usage for period <strong className="text-theme-secondary">{period}</strong>.
        {hasOrgApi() ? ' Synced from org API.' : ' Connect org API for authoritative counts.'}
      </p>

      {loading && <p className="text-xs text-theme-muted mb-3">Loading usage…</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl glass">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={16} className="text-accent" />
            <span className="text-sm font-medium text-theme">AI queries</span>
          </div>
          <p className="text-2xl font-bold text-theme">{formatLimit(aiUsed, aiLimit)}</p>
          {aiLimit !== null && (
            <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${usagePercent(aiUsed, aiLimit)}%` }}
              />
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl glass">
          <div className="flex items-center gap-2 mb-2">
            <Mail size={16} className="text-accent" />
            <span className="text-sm font-medium text-theme">Connected mailboxes</span>
          </div>
          <p className="text-2xl font-bold text-theme">{formatLimit(mailboxUsed, mailboxLimit)}</p>
          {mailboxLimit !== null && (
            <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${usagePercent(mailboxUsed, mailboxLimit)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
