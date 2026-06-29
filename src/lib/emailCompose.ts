import type { ComposeDraft, Email, EmailAccount } from '../types'

/** Parse comma/semicolon-separated email addresses */
export function parseAddressList(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatAddressList(addresses: string[]): string {
  return [...new Set(addresses)].join(', ')
}

/** Extract bare email from "Name <email@x.com>" or plain address */
export function normalizeAddress(addr: string): string {
  const match = addr.match(/<([^>]+)>/)
  return (match ? match[1] : addr).toLowerCase().trim()
}

export function getMyAddresses(accounts: EmailAccount[], accountId?: string): string[] {
  const list = accountId
    ? accounts.filter((a) => a.id === accountId)
    : accounts.filter((a) => a.connected)
  return [...new Set(list.map((a) => normalizeAddress(a.email)))]
}

function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`
}

function quotedBody(email: Email): string {
  return `\n\n---\nOn ${new Date(email.date).toLocaleString()}, ${email.fromName} wrote:\n\n${email.body
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')}`
}

export function buildReplyDraft(email: Email): Pick<ComposeDraft, 'to' | 'subject' | 'body'> {
  return {
    to: email.from,
    subject: replySubject(email.subject),
    body: quotedBody(email),
  }
}

/** Reply all: sender in To, other recipients in Cc (excluding self) */
export function buildReplyAllDraft(
  email: Email,
  accounts: EmailAccount[],
): Pick<ComposeDraft, 'to' | 'cc' | 'subject' | 'body'> {
  const myAddresses = new Set(getMyAddresses(accounts, email.accountId))
  const sender = normalizeAddress(email.from)

  const others = [...parseAddressList(email.to), ...(email.cc ? parseAddressList(email.cc) : [])]
    .map(normalizeAddress)
    .filter((addr) => addr && !myAddresses.has(addr) && addr !== sender)

  return {
    to: email.from,
    cc: formatAddressList(others),
    subject: replySubject(email.subject),
    body: quotedBody(email),
  }
}

export function buildForwardDraft(email: Email): Pick<ComposeDraft, 'subject' | 'body'> {
  return {
    subject: /^fwd:/i.test(email.subject.trim()) ? email.subject : `Fwd: ${email.subject}`,
    body: `\n\n---------- Forwarded message ----------\nFrom: ${email.fromName} <${email.from}>\nDate: ${new Date(email.date).toLocaleString()}\nSubject: ${email.subject}\n\n${email.body}`,
  }
}

/** Whether this message has additional recipients beyond a simple 1:1 reply */
export function hasMultipleRecipients(email: Email): boolean {
  const toCount = parseAddressList(email.to).length
  const ccCount = email.cc ? parseAddressList(email.cc).length : 0
  return toCount > 1 || ccCount > 0
}
