import type { EmailAccount, EmailProvider, OAuthSettings } from '../../types'
import { getProviderConfig } from './providers'
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
  getOAuthRedirectUri,
} from './pkce'

const OAUTH_SESSION_KEY = 'ethermail-oauth-pending'

interface PendingOAuth {
  accountId: string
  provider: EmailProvider
  codeVerifier: string
  state: string
}

export function getClientIdForProvider(
  provider: EmailProvider,
  settings: OAuthSettings,
): string | null {
  const config = getProviderConfig(provider)
  const id = settings[config.clientIdKey]?.trim()
  if (id) return id
  if (config.clientIdKey === 'googleClientId' && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID as string
  }
  return null
}

export function canUseRealOAuth(
  provider: EmailProvider,
  settings: OAuthSettings,
): boolean {
  return !!getClientIdForProvider(provider, settings)
}

export async function startRealOAuth(
  account: EmailAccount,
  settings: OAuthSettings,
): Promise<void> {
  const config = getProviderConfig(account.provider)
  const clientId = getClientIdForProvider(account.provider, settings)
  if (!clientId) throw new Error('No OAuth client ID configured')

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateOAuthState()
  const redirectUri = getOAuthRedirectUri()

  const pending: PendingOAuth = {
    accountId: account.id,
    provider: account.provider,
    codeVerifier,
    state,
  }
  sessionStorage.setItem(OAUTH_SESSION_KEY, JSON.stringify(pending))

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  window.location.href = `${config.authUrl}?${params.toString()}`
}

export async function handleOAuthCallback(
  code: string,
  state: string,
  settings: OAuthSettings,
): Promise<{ accountId: string; accessToken: string } | null> {
  const raw = sessionStorage.getItem(OAUTH_SESSION_KEY)
  if (!raw) return null

  const pending: PendingOAuth = JSON.parse(raw)
  if (pending.state !== state) return null

  sessionStorage.removeItem(OAUTH_SESSION_KEY)

  const config = getProviderConfig(pending.provider)
  const clientId = getClientIdForProvider(pending.provider, settings)
  if (!clientId) return null

  const redirectUri = getOAuthRedirectUri()
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: pending.codeVerifier,
  })

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) return null

  const data = (await res.json()) as { access_token: string }
  cleanOAuthUrl()

  return { accountId: pending.accountId, accessToken: data.access_token }
}

export function cleanOAuthUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('scope')
  url.searchParams.delete('authuser')
  url.searchParams.delete('prompt')
  window.history.replaceState({}, '', url.pathname + url.search)
}

export function simulateOAuthDelay(ms = 1400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
