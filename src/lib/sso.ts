import type { SsoConfig } from '../types/orgApi'

/**
 * Build SSO authorization URL for Entra / Okta / Google Workspace.
 * Demo: returns null when SSO is not enabled or API is not configured.
 */
export function buildSsoLoginUrl(config: SsoConfig, redirectUri: string): string | null {
  if (!config.enabled || config.provider === 'none') return null

  const state = crypto.randomUUID()
  sessionStorage.setItem('ethermail-sso-state', state)

  switch (config.provider) {
    case 'entra': {
      if (!config.tenantId || !config.clientId) return null
      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state,
      })
      return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params}`
    }
    case 'okta': {
      if (!config.domain || !config.clientId) return null
      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        scope: 'openid profile email',
        redirect_uri: redirectUri,
        state,
      })
      return `https://${config.domain}/oauth2/v1/authorize?${params}`
    }
    case 'google_workspace': {
      if (!config.clientId) return null
      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        state,
        hd: config.domain,
      })
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    }
    default:
      return null
  }
}

export function validateSsoCallback(state: string | null): boolean {
  const expected = sessionStorage.getItem('ethermail-sso-state')
  sessionStorage.removeItem('ethermail-sso-state')
  return Boolean(state && expected && state === expected)
}
