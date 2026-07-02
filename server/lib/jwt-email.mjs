/** Extract email claim from an OIDC id_token payload (call verifyIdToken first in production). */
export function emailFromIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null
  const parts = idToken.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return (
      payload.email ??
      payload.preferred_username ??
      payload.upn ??
      payload.unique_name ??
      null
    )
  } catch {
    return null
  }
}
