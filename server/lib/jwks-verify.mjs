import { createPublicKey, verify as cryptoVerify } from 'node:crypto'

const jwksCache = new Map()

/** @param {string} jwksUrl */
async function fetchJwks(jwksUrl) {
  const cached = jwksCache.get(jwksUrl)
  if (cached && cached.expires > Date.now()) return cached.keys

  const res = await fetch(jwksUrl)
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`)
  const body = await res.json()
  const keys = body.keys ?? []
  jwksCache.set(jwksUrl, { keys, expires: Date.now() + 60 * 60 * 1000 })
  return keys
}

/**
 * Verify OIDC id_token signature and standard claims.
 * @param {string} idToken
 * @param {{ jwksUrl: string, issuer?: string|string[], audience?: string }} opts
 */
export async function verifyIdToken(idToken, opts) {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('Malformed id_token')

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))

  if (header.alg !== 'RS256') throw new Error(`Unsupported JWT alg: ${header.alg}`)

  const jwks = await fetchJwks(opts.jwksUrl)
  const jwk = jwks.find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('Signing key not found in JWKS')

  const key = createPublicKey({ key: jwk, format: 'jwk' })
  const signed = `${parts[0]}.${parts[1]}`
  const signature = Buffer.from(parts[2], 'base64url')
  const valid = cryptoVerify('RSA-SHA256', Buffer.from(signed), key, signature)
  if (!valid) throw new Error('Invalid id_token signature')

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now - 30) throw new Error('id_token expired')
  if (payload.nbf && payload.nbf > now + 30) throw new Error('id_token not yet valid')

  if (opts.issuer) {
    const issuers = Array.isArray(opts.issuer) ? opts.issuer : [opts.issuer]
    if (!issuers.some((iss) => payload.iss === iss || String(payload.iss).startsWith(iss))) {
      throw new Error('id_token issuer mismatch')
    }
  }

  if (opts.audience) {
    const aud = payload.aud
    const ok = Array.isArray(aud)
      ? aud.includes(opts.audience)
      : aud === opts.audience
    if (!ok) throw new Error('id_token audience mismatch')
  }

  return payload
}

export function idTokenVerifyOptions(provider, { tenantId, clientId, domain }) {
  switch (provider) {
    case 'entra': {
      const tenant = tenantId || 'common'
      return {
        jwksUrl: `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`,
        issuer: [
          `https://login.microsoftonline.com/${tenant}/v2.0`,
          `https://sts.windows.net/${tenant}/`,
        ],
        audience: clientId,
      }
    }
    case 'google_workspace':
      return {
        jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: clientId,
      }
    case 'okta':
      return {
        jwksUrl: `https://${domain}/oauth2/v1/keys`,
        issuer: `https://${domain}`,
        audience: clientId,
      }
    default:
      return null
  }
}

export function emailFromPayload(payload) {
  return (
    payload.email ??
    payload.preferred_username ??
    payload.upn ??
    payload.unique_name ??
    null
  )
}
