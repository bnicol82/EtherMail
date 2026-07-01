import { useMemo, useState, useEffect } from 'react'
import {
  ArrowLeft,
  Shield,
  Search,
  Check,
  X,
  Lock,
  Unlock,
  RotateCcw,
  Building2,
  Users,
  ScrollText,
  Share2,
  KeyRound,
} from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import {
  FEATURE_CATALOG,
  FEATURE_CATEGORIES,
  type FeatureCategory,
  type FeatureId,
  type OrgRole,
} from '../types/admin'
import { PLAN_LABELS, type PlanTier } from '../lib/plan'
import { countDeniedFeatures } from '../lib/orgPolicy'
import { canUseFeature, featureGateFromStore } from '../lib/featureGates'
import { AuditLogPanel } from './admin/AuditLogPanel'
import { MembersPanel } from './admin/MembersPanel'
import { SharedVaultsPanel } from './admin/SharedVaultsPanel'
import { SsoConfigPanel } from './admin/SsoConfigPanel'
import { hasOrgApi } from '../lib/orgApi'

const ROLES: { id: OrgRole; label: string }[] = [
  { id: 'member', label: 'Member' },
  { id: 'admin', label: 'Admin' },
  { id: 'owner', label: 'Owner' },
]

const PLANS: PlanTier[] = ['free', 'pro', 'team', 'enterprise']

const RISK_STYLES = {
  low: 'text-theme-muted',
  medium: 'text-amber-500',
  high: 'text-red-400',
} as const

type AdminTab = 'policy' | 'audit' | 'members' | 'vaults' | 'sso'

const TABS: { id: AdminTab; label: string; icon: typeof Shield }[] = [
  { id: 'policy', label: 'Policy', icon: Shield },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'vaults', label: 'Shared vaults', icon: Share2 },
  { id: 'sso', label: 'SSO & API', icon: KeyRound },
]

export function AdminView() {
  const setView = useEtherMailStore((s) => s.setView)
  const orgPolicy = useEtherMailStore((s) => s.orgPolicy)
  const userRole = useEtherMailStore((s) => s.userRole)
  const planTier = useEtherMailStore((s) => s.planTier)
  const setOrgFeature = useEtherMailStore((s) => s.setOrgFeature)
  const setOrgPolicy = useEtherMailStore((s) => s.setOrgPolicy)
  const setUserRole = useEtherMailStore((s) => s.setUserRole)
  const setPlanTier = useEtherMailStore((s) => s.setPlanTier)
  const applyStrictEnterprisePolicy = useEtherMailStore((s) => s.applyStrictEnterprisePolicy)
  const resetOrgPolicy = useEtherMailStore((s) => s.resetOrgPolicy)
  const allowAllFeatures = useEtherMailStore((s) => s.allowAllFeatures)
  const denyAllFeatures = useEtherMailStore((s) => s.denyAllFeatures)
  const syncOrgFromApi = useEtherMailStore((s) => s.syncOrgFromApi)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<FeatureCategory | 'all'>('all')
  const [tab, setTab] = useState<AdminTab>('policy')

  useEffect(() => {
    if (hasOrgApi()) void syncOrgFromApi()
  }, [syncOrgFromApi])

  const gateCtx = useMemo(
    () => featureGateFromStore({ orgPolicy, userRole: 'member', planTier }),
    [orgPolicy, planTier],
  )

  const deniedCount = countDeniedFeatures(orgPolicy)

  const filteredFeatures = useMemo(() => {
    const q = search.trim().toLowerCase()
    return FEATURE_CATALOG.filter((f) => {
      if (activeCategory !== 'all' && f.category !== activeCategory) return false
      if (!q) return true
      return (
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.id.includes(q)
      )
    })
  }, [search, activeCategory])

  const previewDenied = FEATURE_CATALOG.filter((f) => !canUseFeature(f.id, gateCtx))

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 max-w-4xl mx-auto w-full">
      <button
        onClick={() => setView('dashboard')}
        className="flex items-center gap-2 text-sm text-theme-muted hover:text-theme mb-4"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-theme flex items-center gap-2">
            <Shield size={22} className="text-accent" />
            Organization admin
          </h1>
          <p className="text-xs md:text-sm text-theme-muted mt-1">
            Allow or deny every capability for members. Admins and owners always retain access for
            configuration.
          </p>
        </div>
        <div className="glass rounded-xl px-3 py-2 text-xs text-theme-secondary">
          <span className="text-theme-muted">Denied for members:</span>{' '}
          <span className="font-semibold text-theme">{deniedCount}</span>
          {' · '}
          <span className="text-theme-muted">Locks:</span>{' '}
          {orgPolicy.enforceLocks ? (
            <Lock size={12} className="inline text-accent" />
          ) : (
            <Unlock size={12} className="inline text-theme-muted" />
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-3 mb-4 border-b border-[var(--glass-border)]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors ${
              tab === id
                ? 'bg-accent-soft text-accent font-medium'
                : 'text-theme-muted hover-theme'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'audit' && <AuditLogPanel />}
      {tab === 'members' && <MembersPanel />}
      {tab === 'vaults' && <SharedVaultsPanel />}
      {tab === 'sso' && <SsoConfigPanel />}

      {tab === 'policy' && (
        <>
          <section className="glass rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-accent" />
              <h2 className="font-semibold text-theme">Organization</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-theme-muted mb-1 block">Organization name</span>
                <input
                  value={orgPolicy.organizationName}
                  onChange={(e) => setOrgPolicy({ organizationName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-theme-muted mb-1 block">Plan tier (demo)</span>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value as PlanTier)}
                  className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-theme-muted mb-1 flex items-center gap-1">
                  <Users size={12} /> Your role (demo)
                </span>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as OrgRole)}
                  className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer self-end pb-2">
                <input
                  type="checkbox"
                  checked={orgPolicy.enforceLocks}
                  onChange={(e) => setOrgPolicy({ enforceLocks: e.target.checked })}
                  className="rounded border-[var(--glass-border)] accent-[var(--accent)]"
                />
                Enforce policy locks for members
              </label>
            </div>
          </section>

          <section className="glass rounded-xl p-4 mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={allowAllFeatures}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass hover-theme text-xs text-theme-secondary"
            >
              <Check size={14} className="text-emerald-500" />
              Allow all
            </button>
            <button
              type="button"
              onClick={denyAllFeatures}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass hover-theme text-xs text-theme-secondary"
            >
              <X size={14} className="text-red-400" />
              Deny all
            </button>
            <button
              type="button"
              onClick={applyStrictEnterprisePolicy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass hover-theme text-xs text-theme-secondary"
            >
              <Shield size={14} className="text-accent" />
              Apply strict enterprise preset
            </button>
            <button
              type="button"
              onClick={resetOrgPolicy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass hover-theme text-xs text-theme-muted"
            >
              <RotateCcw size={14} />
              Reset to defaults
            </button>
          </section>

          {previewDenied.length > 0 && (
            <section className="glass rounded-xl p-4 mb-6 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-500 mb-2">
                Member preview — {previewDenied.length} blocked feature
                {previewDenied.length === 1 ? '' : 's'}
              </p>
              <p className="text-[11px] text-theme-muted leading-relaxed">
                {previewDenied
                  .slice(0, 6)
                  .map((f) => f.label)
                  .join(' · ')}
                {previewDenied.length > 6 ? ` · +${previewDenied.length - 6} more` : ''}
              </p>
            </section>
          )}

          <section className="glass rounded-xl p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <h2 className="font-semibold text-theme shrink-0">Feature policy</h2>
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-muted"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search features…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg input-theme text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${
                  activeCategory === 'all'
                    ? 'bg-accent-soft text-accent font-medium'
                    : 'glass text-theme-muted'
                }`}
              >
                All
              </button>
              {FEATURE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-accent-soft text-accent font-medium'
                      : 'glass text-theme-muted'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredFeatures.map((feature) => {
                const allowed = orgPolicy.features[feature.id as FeatureId]
                return (
                  <div
                    key={feature.id}
                    className="flex items-start gap-3 p-3 rounded-xl glass hover-theme"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-theme">{feature.label}</p>
                        <span
                          className={`text-[10px] uppercase tracking-wide ${RISK_STYLES[feature.risk]}`}
                        >
                          {feature.risk} risk
                        </span>
                      </div>
                      <p className="text-xs text-theme-muted mt-0.5">{feature.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowed}
                      onClick={() => setOrgFeature(feature.id as FeatureId, !allowed)}
                      className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${
                        allowed ? 'bg-accent' : 'bg-theme-muted/30'
                      }`}
                      title={allowed ? 'Allowed — click to deny' : 'Denied — click to allow'}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          allowed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
              {filteredFeatures.length === 0 && (
                <p className="text-sm text-theme-muted text-center py-6">
                  No features match your search.
                </p>
              )}
            </div>
          </section>

          <p className="text-[11px] text-theme-muted leading-relaxed px-1">
            Policy is stored in your browser for this demo. Set{' '}
            <code className="text-accent">VITE_ORG_API_URL</code> and use the SSO tab to sync from a
            backend — client gates are UX until server enforcement ships.
          </p>
        </>
      )}
    </div>
  )
}
