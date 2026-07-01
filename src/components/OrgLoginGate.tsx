import type { ReactNode } from 'react'
import { KeyRound, Shield } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { buildSsoLoginUrl } from '../lib/sso'
import { requiresOrgLogin } from '../lib/orgAuth'

export function OrgLoginGate({ children }: { children: ReactNode }) {
  const ssoConfig = useEtherMailStore((s) => s.ssoConfig)
  const orgSession = useEtherMailStore((s) => s.orgSession)
  const userRole = useEtherMailStore((s) => s.userRole)

  const blocked = requiresOrgLogin({ ssoConfig, orgSession, userRole })
  if (!blocked) return <>{children}</>

  const loginUrl = buildSsoLoginUrl(
    ssoConfig,
    `${window.location.origin}${import.meta.env.BASE_URL}`,
  )

  return (
    <div className="ethermail-bg h-full min-h-dvh flex items-center justify-center p-6">
      <div className="glass max-w-md w-full rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
          <Shield size={24} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-theme mb-2">Organization sign-in required</h1>
        <p className="text-sm text-theme-muted mb-6">
          Your organization requires SSO to use EtherMail. Sign in with your work account to continue.
        </p>
        {loginUrl ? (
          <a
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl btn-accent text-sm font-medium"
          >
            <KeyRound size={16} />
            Sign in with SSO
          </a>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            SSO is not fully configured. Contact your administrator.
          </p>
        )}
      </div>
    </div>
  )
}
