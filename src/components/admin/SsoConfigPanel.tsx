import { KeyRound, ExternalLink } from 'lucide-react'
import { useEtherMailStore } from '../../store/useStore'
import type { SsoConfig } from '../../types/orgApi'
import { buildSsoLoginUrl } from '../../lib/sso'
import { hasOrgApi } from '../../lib/orgApi'

const PROVIDERS: SsoConfig['provider'][] = ['none', 'entra', 'okta', 'google_workspace']

export function SsoConfigPanel() {
  const ssoConfig = useEtherMailStore((s) => s.ssoConfig)
  const setSsoConfig = useEtherMailStore((s) => s.setSsoConfig)
  const syncOrgFromApi = useEtherMailStore((s) => s.syncOrgFromApi)
  const policySyncStatus = useEtherMailStore((s) => s.policySyncStatus)

  const testLoginUrl = buildSsoLoginUrl(
    ssoConfig,
    `${window.location.origin}${import.meta.env.BASE_URL}`,
  )

  return (
    <section className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={18} className="text-accent" />
        <h2 className="font-semibold text-theme">SSO & policy API</h2>
      </div>
      <p className="text-xs text-theme-muted mb-4">
        Configure identity provider for enterprise login. Set{' '}
        <code className="text-accent">VITE_ORG_API_URL</code> to enable server policy sync.
        {hasOrgApi() ? (
          <span className="text-emerald-500"> API configured.</span>
        ) : (
          <span> Demo mode — policy stored locally.</span>
        )}
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer sm:col-span-2">
          <input
            type="checkbox"
            checked={ssoConfig.enabled}
            onChange={(e) => setSsoConfig({ enabled: e.target.checked })}
            className="rounded accent-[var(--accent)]"
          />
          Enable SSO
        </label>
        <label className="block text-sm">
          <span className="text-theme-muted mb-1 block">Provider</span>
          <select
            value={ssoConfig.provider}
            onChange={(e) => setSsoConfig({ provider: e.target.value as SsoConfig['provider'] })}
            className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p === 'none' ? 'None' : p.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-theme-muted mb-1 block">Tenant / domain</span>
          <input
            value={ssoConfig.domain}
            onChange={(e) => setSsoConfig({ domain: e.target.value })}
            placeholder="company.com or tenant ID"
            className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-theme-muted mb-1 block">Tenant ID (Entra)</span>
          <input
            value={ssoConfig.tenantId}
            onChange={(e) => setSsoConfig({ tenantId: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-theme-muted mb-1 block">Client ID</span>
          <input
            value={ssoConfig.clientId}
            onChange={(e) => setSsoConfig({ clientId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer sm:col-span-2">
          <input
            type="checkbox"
            checked={ssoConfig.enforceSso}
            onChange={(e) => setSsoConfig({ enforceSso: e.target.checked })}
            className="rounded accent-[var(--accent)]"
          />
          Enforce SSO (disable local login for members)
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void syncOrgFromApi()}
          className="px-4 py-2 rounded-xl btn-accent text-sm font-medium"
        >
          Sync policy from API
        </button>
        {testLoginUrl && (
          <a
            href={testLoginUrl}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass text-sm text-theme-secondary hover-theme"
          >
            <ExternalLink size={14} />
            Test SSO login
          </a>
        )}
      </div>
      {policySyncStatus && (
        <p className="text-[11px] text-theme-muted mt-3">{policySyncStatus}</p>
      )}
    </section>
  )
}
