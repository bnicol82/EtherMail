import * as jose from 'https://esm.sh/jose@5.9.6'

export function jwksUrlForProvider(provider: string, tenantId: string, domain: string) {
  switch (provider) {
    case 'entra':
      return `https://login.microsoftonline.com/${tenantId || 'common'}/discovery/v2.0/keys`
    case 'google_workspace':
      return 'https://www.googleapis.com/oauth2/v3/certs'
    case 'okta':
      return `https://${domain}/oauth2/v1/keys`
    default:
      return null
  }
}

export function issuerOptionsForProvider(provider: string, tenantId: string, domain: string): string[] {
  switch (provider) {
    case 'entra': {
      const tenant = tenantId || 'common'
      return [
        `https://login.microsoftonline.com/${tenant}/v2.0`,
        `https://sts.windows.net/${tenant}/`,
      ]
    }
    case 'google_workspace':
      return ['https://accounts.google.com', 'accounts.google.com']
    case 'okta':
      return [`https://${domain}`]
    default:
      return []
  }
}

export function emailFromIdTokenPayload(payload: jose.JWTPayload) {
  return (
    (payload.email as string) ??
    (payload.preferred_username as string) ??
    (payload.upn as string) ??
    (payload.unique_name as string) ??
    null
  )
}

export async function verifyIdTokenStrict(
  idToken: string,
  provider: string,
  tenantId: string,
  clientId: string,
  domain: string,
) {
  const jwksUrl = jwksUrlForProvider(provider, tenantId, domain)
  if (!jwksUrl) throw new Error(`Unsupported SSO provider for JWKS: ${provider}`)

  const jwks = jose.createRemoteJWKSet(new URL(jwksUrl))
  const issuers = issuerOptionsForProvider(provider, tenantId, domain)

  const { payload } = await jose.jwtVerify(idToken, jwks, {
    audience: clientId || undefined,
    issuer: issuers.length === 1 ? issuers[0] : issuers,
    clockTolerance: 30,
  })

  const email = emailFromIdTokenPayload(payload)
  if (!email) throw new Error('No email claim in id_token')
  return { email: String(email).toLowerCase(), payload }
}
