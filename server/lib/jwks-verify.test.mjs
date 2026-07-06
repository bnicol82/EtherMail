import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateKeyPairSync, createSign, randomUUID } from 'node:crypto'
import { emailFromPayload, idTokenVerifyOptions, verifyIdToken } from './jwks-verify.mjs'

function base64url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url')
}

function signToken(payload, { kid = 'test-key', alg = 'RS256', privateKey, header: headerOverrides } = {}) {
  const header = { alg, typ: 'JWT', kid, ...headerOverrides }
  const encodedHeader = base64url(header)
  const encodedPayload = base64url(payload)
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(privateKey).toString('base64url')
  return `${signingInput}.${signature}`
}

describe('verifyIdToken', () => {
  let privateKey
  let publicJwk
  // fetchJwks caches by URL for an hour, so each test needs its own URL to avoid
  // reusing another test's cached (and therefore mismatched) signing key.
  let jwksUrl

  beforeEach(() => {
    const { privateKey: priv, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    privateKey = priv
    publicJwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key' }
    jwksUrl = `https://jwks.example.com/${randomUUID()}`
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ keys: [publicJwk] }),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const now = Math.floor(Date.now() / 1000)
  const basePayload = { email: 'user@example.com', iss: 'https://issuer.example.com', aud: 'client-1', exp: now + 3600 }

  it('verifies a correctly signed token and returns its payload', async () => {
    const token = signToken(basePayload, { privateKey })
    const payload = await verifyIdToken(token, { jwksUrl })
    expect(payload.email).toBe('user@example.com')
  })

  it('rejects a malformed token (wrong number of segments)', async () => {
    await expect(verifyIdToken('not.a.valid.token', { jwksUrl })).rejects.toThrow(
      'Malformed id_token',
    )
  })

  it('rejects an unsupported algorithm', async () => {
    const token = signToken(basePayload, { privateKey, header: { alg: 'HS256' } })
    await expect(verifyIdToken(token, { jwksUrl })).rejects.toThrow(
      'Unsupported JWT alg',
    )
  })

  it('rejects when the kid does not match any JWKS key', async () => {
    const token = signToken(basePayload, { privateKey, kid: 'wrong-kid' })
    await expect(verifyIdToken(token, { jwksUrl })).rejects.toThrow(
      'Signing key not found',
    )
  })

  it('rejects a token signed with a different private key (bad signature)', async () => {
    const { privateKey: otherKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const token = signToken(basePayload, { privateKey: otherKey })
    await expect(verifyIdToken(token, { jwksUrl })).rejects.toThrow(
      'Invalid id_token signature',
    )
  })

  it('rejects an expired token', async () => {
    const token = signToken({ ...basePayload, exp: now - 3600 }, { privateKey })
    await expect(verifyIdToken(token, { jwksUrl })).rejects.toThrow('expired')
  })

  it('rejects a token used before its nbf', async () => {
    const token = signToken({ ...basePayload, nbf: now + 3600 }, { privateKey })
    await expect(verifyIdToken(token, { jwksUrl })).rejects.toThrow('not yet valid')
  })

  it('rejects an issuer mismatch', async () => {
    const token = signToken(basePayload, { privateKey })
    await expect(
      verifyIdToken(token, { jwksUrl, issuer: 'https://someone-else.example.com' }),
    ).rejects.toThrow('issuer mismatch')
  })

  it('accepts an issuer that is a prefix match (tenant-specific issuer variants)', async () => {
    const token = signToken(basePayload, { privateKey })
    const payload = await verifyIdToken(token, {
      jwksUrl,
      issuer: 'https://issuer.example.com',
    })
    expect(payload.iss).toBe('https://issuer.example.com')
  })

  it('rejects an audience mismatch', async () => {
    const token = signToken(basePayload, { privateKey })
    await expect(
      verifyIdToken(token, { jwksUrl, audience: 'someone-else' }),
    ).rejects.toThrow('audience mismatch')
  })

  it('accepts when aud is an array containing the expected audience', async () => {
    const token = signToken({ ...basePayload, aud: ['client-1', 'client-2'] }, { privateKey })
    const payload = await verifyIdToken(token, { jwksUrl, audience: 'client-1' })
    expect(payload.aud).toContain('client-1')
  })
})

describe('idTokenVerifyOptions', () => {
  it('builds Entra options with a tenant-scoped JWKS URL and dual issuer forms', () => {
    const opts = idTokenVerifyOptions('entra', { tenantId: 'tenant-1', clientId: 'client-1' })
    expect(opts.jwksUrl).toBe('https://login.microsoftonline.com/tenant-1/discovery/v2.0/keys')
    expect(opts.issuer).toEqual([
      'https://login.microsoftonline.com/tenant-1/v2.0',
      'https://sts.windows.net/tenant-1/',
    ])
    expect(opts.audience).toBe('client-1')
  })

  it('defaults Entra tenant to "common" when not provided', () => {
    const opts = idTokenVerifyOptions('entra', { clientId: 'client-1' })
    expect(opts.jwksUrl).toContain('/common/')
  })

  it('builds Google Workspace options with the fixed Google JWKS URL', () => {
    const opts = idTokenVerifyOptions('google_workspace', { clientId: 'client-1' })
    expect(opts.jwksUrl).toBe('https://www.googleapis.com/oauth2/v3/certs')
    expect(opts.issuer).toContain('https://accounts.google.com')
  })

  it('builds Okta options from the org domain', () => {
    const opts = idTokenVerifyOptions('okta', { domain: 'acme.okta.com', clientId: 'client-1' })
    expect(opts.jwksUrl).toBe('https://acme.okta.com/oauth2/v1/keys')
    expect(opts.issuer).toBe('https://acme.okta.com')
  })

  it('returns null for an unknown provider', () => {
    expect(idTokenVerifyOptions('unknown', {})).toBeNull()
  })
})

describe('emailFromPayload', () => {
  it('prefers email, then falls back through preferred_username/upn/unique_name', () => {
    expect(emailFromPayload({ email: 'a@b.com', upn: 'ignored' })).toBe('a@b.com')
    expect(emailFromPayload({ preferred_username: 'a@b.com' })).toBe('a@b.com')
    expect(emailFromPayload({ upn: 'a@b.com' })).toBe('a@b.com')
    expect(emailFromPayload({ unique_name: 'a@b.com' })).toBe('a@b.com')
  })

  it('returns null when no known claim is present', () => {
    expect(emailFromPayload({})).toBeNull()
  })
})
