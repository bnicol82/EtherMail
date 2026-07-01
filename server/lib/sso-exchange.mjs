import { emailFromIdToken } from './jwt-email.mjs'
import { verifyIdToken, idTokenVerifyOptions, emailFromPayload } from './jwks-verify.mjs'

/**
 * Exchange OAuth authorization code for tokens.
 * When client secret env vars are unset, returns demo email (local dev only).
 * When id_token is returned, JWKS signature validation is performed.
 */
export async function exchangeSsoAuthorizationCode({
  code,
  provider,
  tenantId,
  clientId,
  redirectUri,
  domain,
  demoEmail,
}) {
  const secret = resolveClientSecret(provider)
  if (!secret || !clientId) {
    return { email: (demoEmail ?? 'demo@acme.com').toLowerCase(), mode: 'demo' }
  }

  const tokenUrl = tokenEndpoint(provider, tenantId, domain)
  const body = tokenRequestBody(provider, {
    code,
    clientId,
    clientSecret: secret,
    redirectUri,
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SSO token exchange failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const tokens = await res.json()
  let email = null

  if (tokens.id_token) {
    const verifyOpts = idTokenVerifyOptions(provider, { tenantId, clientId, domain })
    if (verifyOpts) {
      const payload = await verifyIdToken(tokens.id_token, verifyOpts)
      email = emailFromPayload(payload)
    } else {
      email = emailFromIdToken(tokens.id_token)
    }
  }

  email = email ?? (tokens.email ? String(tokens.email).toLowerCase() : null)

  if (!email) throw new Error('SSO response did not include an email')
  return { email, mode: 'oauth', idToken: tokens.id_token ?? null }
}

function resolveClientSecret(provider) {
  switch (provider) {
    case 'entra':
      return process.env.SSO_ENTRA_CLIENT_SECRET ?? process.env.SSO_CLIENT_SECRET
    case 'okta':
      return process.env.SSO_OKTA_CLIENT_SECRET ?? process.env.SSO_CLIENT_SECRET
    case 'google_workspace':
      return process.env.SSO_GOOGLE_CLIENT_SECRET ?? process.env.SSO_CLIENT_SECRET
    default:
      return process.env.SSO_CLIENT_SECRET
  }
}

function tokenEndpoint(provider, tenantId, domain) {
  switch (provider) {
    case 'entra':
      return `https://login.microsoftonline.com/${tenantId || 'common'}/oauth2/v2.0/token`
    case 'okta':
      return `https://${domain}/oauth2/v1/token`
    case 'google_workspace':
      return 'https://oauth2.googleapis.com/token'
    default:
      throw new Error(`Unsupported SSO provider: ${provider}`)
  }
}

function tokenRequestBody(provider, { code, clientId, clientSecret, redirectUri }) {
  const base = {
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  }
  if (provider === 'google_workspace') {
    return base
  }
  return { ...base, scope: 'openid profile email' }
}
