import type { Email, EmailAccount, EmailFolder } from '../../types'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export class GmailSyncError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GmailSyncError'
    this.status = status
  }
}

interface GmailHeader {
  name: string
  value: string
}

interface GmailBody {
  data?: string
  size?: number
}

interface GmailPart {
  mimeType?: string
  body?: GmailBody
  parts?: GmailPart[]
}

interface GmailMessageListItem {
  id: string
  threadId?: string
}

interface GmailMessage {
  id: string
  threadId?: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailPart & { headers?: GmailHeader[] }
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function parseAddressField(raw: string): { email: string; name: string } {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return {
      name: match[1].replace(/^"|"$/g, '').trim(),
      email: match[2].trim(),
    }
  }
  return { email: trimmed, name: trimmed.split('@')[0] }
}

function extractBody(payload: GmailPart | undefined): string {
  if (!payload) return ''
  if (payload.body?.data) return decodeBase64Url(payload.body.data)

  if (payload.parts?.length) {
    const plain = payload.parts.find((p) => p.mimeType === 'text/plain')
    if (plain?.body?.data) return decodeBase64Url(plain.body.data)

    const html = payload.parts.find((p) => p.mimeType === 'text/html')
    if (html?.body?.data) {
      return decodeBase64Url(html.body.data)
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    for (const part of payload.parts) {
      const nested = extractBody(part)
      if (nested) return nested
    }
  }

  return ''
}

function folderFromLabels(labelIds: string[] | undefined): EmailFolder {
  const labels = labelIds ?? []
  if (labels.includes('TRASH')) return 'trash'
  if (labels.includes('DRAFT')) return 'drafts'
  if (labels.includes('SENT')) return 'sent'
  if (labels.includes('INBOX')) return 'inbox'
  return 'archive'
}

function gmailEmailId(messageId: string): string {
  return `gmail-${messageId}`
}

export function parseGmailMessage(message: GmailMessage, accountId: string): Email {
  const headers = message.payload?.headers
  const from = parseAddressField(getHeader(headers, 'From'))
  const subject = getHeader(headers, 'Subject') || '(no subject)'
  const body = extractBody(message.payload)
  const preview = message.snippet?.trim() || body.slice(0, 160)
  const dateMs = message.internalDate ? Number(message.internalDate) : Date.now()

  return {
    id: gmailEmailId(message.id),
    accountId,
    from: from.email,
    fromName: from.name || from.email,
    to: getHeader(headers, 'To'),
    cc: getHeader(headers, 'Cc') || undefined,
    bcc: getHeader(headers, 'Bcc') || undefined,
    subject,
    body: body || preview,
    preview,
    date: new Date(dateMs).toISOString(),
    read: !(message.labelIds ?? []).includes('UNREAD'),
    starred: (message.labelIds ?? []).includes('STARRED'),
    linkedNoteId: null,
    labelIds: [],
    folder: folderFromLabels(message.labelIds),
  }
}

async function gmailFetch<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new GmailSyncError(
      res.status === 401 ? 'Gmail authorization expired — reconnect the account.' : `Gmail API error (${res.status})`,
      res.status,
    )
  }
  return res.json() as Promise<T>
}

async function listMessageIds(
  accessToken: string,
  labelId: string,
  maxResults: number,
): Promise<string[]> {
  const params = new URLSearchParams({
    labelIds: labelId,
    maxResults: String(maxResults),
  })
  const data = await gmailFetch<{ messages?: GmailMessageListItem[] }>(
    accessToken,
    `/messages?${params.toString()}`,
  )
  return (data.messages ?? []).map((m) => m.id)
}

async function fetchMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  return gmailFetch<GmailMessage>(accessToken, `/messages/${messageId}?format=full`)
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(mapper))
    results.push(...batchResults)
  }
  return results
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new GmailSyncError('Could not read Google profile email', res.status)
  const data = (await res.json()) as { email?: string }
  if (!data.email) throw new GmailSyncError('Google profile did not include an email address')
  return data.email
}

export async function refreshGoogleAccessToken(
  clientId: string,
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new GmailSyncError('Could not refresh Gmail access token', res.status)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

export function accountNeedsTokenRefresh(account: EmailAccount): boolean {
  if (!account.oauthExpiresAt) return false
  return new Date(account.oauthExpiresAt).getTime() <= Date.now() + 60_000
}

export async function ensureGmailAccessToken(
  account: EmailAccount,
  clientId: string | null,
): Promise<string> {
  if (!account.oauthAccessToken) {
    throw new GmailSyncError('No Gmail access token — reconnect the account.')
  }
  if (!accountNeedsTokenRefresh(account)) return account.oauthAccessToken
  if (!account.oauthRefreshToken || !clientId) {
    throw new GmailSyncError('Gmail session expired — reconnect the account.')
  }
  const refreshed = await refreshGoogleAccessToken(clientId, account.oauthRefreshToken)
  return refreshed.accessToken
}

export async function syncGmailMessages(
  accessToken: string,
  accountId: string,
  maxPerLabel = 40,
): Promise<Email[]> {
  const [inboxIds, sentIds] = await Promise.all([
    listMessageIds(accessToken, 'INBOX', maxPerLabel),
    listMessageIds(accessToken, 'SENT', Math.min(20, maxPerLabel)),
  ])

  const uniqueIds = [...new Set([...inboxIds, ...sentIds])]
  const messages = await mapPool(uniqueIds, 6, (id) => fetchMessage(accessToken, id))
  return messages.map((m) => parseGmailMessage(m, accountId))
}

export async function syncGmailAccount(
  account: EmailAccount,
  clientId: string | null,
): Promise<{
  emails: Email[]
  accountEmail: string
  accessToken: string
  refreshToken?: string
  expiresAt?: string
}> {
  let accessToken = account.oauthAccessToken
  let refreshToken = account.oauthRefreshToken
  let expiresAt = account.oauthExpiresAt

  if (!accessToken) throw new GmailSyncError('No Gmail access token — reconnect the account.')

  if (accountNeedsTokenRefresh(account)) {
    if (!refreshToken || !clientId) {
      throw new GmailSyncError('Gmail session expired — reconnect the account.')
    }
    const refreshed = await refreshGoogleAccessToken(clientId, refreshToken)
    accessToken = refreshed.accessToken
    expiresAt = refreshed.expiresAt
  }

  const [accountEmail, emails] = await Promise.all([
    fetchGoogleUserEmail(accessToken),
    syncGmailMessages(accessToken, account.id),
  ])

  return { emails, accountEmail, accessToken, refreshToken, expiresAt }
}
