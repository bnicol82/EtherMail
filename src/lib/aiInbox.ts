import type { Email, EmailInboxClassification, EmailInboxTraining, EmailJunkCategory } from '../types'

const MARKETING_RE =
  /\b(sale|discount|\d+%\s*off|limited time|act now|exclusive offer|shop now|free shipping|deal of the day)\b/i
const NEWSLETTER_RE =
  /\b(newsletter|weekly digest|unsubscribe|this week in|roundup|edition #)\b/i
const SPAM_RE =
  /\b(congratulations|you('ve)? won|lottery|claim your prize|free money|nigerian|wire transfer|bitcoin giveaway|work from home \$)\b/i
const PHISHING_RE =
  /\b(verify your account|suspended|unusual (sign[- ]?in|activity)|confirm your password|click here immediately|security alert.*click|download attachment.*invoice\.exe)\b/i
const SOCIAL_RE =
  /\b(linkedin|facebook|twitter|instagram).*(notification|mentioned you|commented on|new connection)\b/i
const AUTOMATED_RE =
  /\b(order (has )?shipped|tracking number|delivery update|no-?reply|automated message|do not reply)\b/i
const IMPORTANT_SIGNAL_RE =
  /\b(meeting|invitation|deadline|action required|project|budget|client|review|feedback|expense|reminder:)\b/i

const CATEGORY_LABELS: Record<EmailJunkCategory, string> = {
  important: 'Important',
  marketing: 'Marketing',
  newsletter: 'Newsletters',
  spam: 'Spam',
  phishing: 'Suspicious',
  promotional: 'Promotions',
  social: 'Social',
  automated: 'Automated',
}

export function getCategoryLabel(category: EmailJunkCategory): string {
  return CATEGORY_LABELS[category]
}

function domainFrom(email: string): string {
  const at = email.lastIndexOf('@')
  return at >= 0 ? email.slice(at + 1).toLowerCase() : email.toLowerCase()
}

function matchesSenderOrDomain(
  email: Email,
  senders: string[],
  domains: string[],
): boolean {
  const from = email.from.toLowerCase()
  const name = email.fromName.toLowerCase()
  if (senders.some((s) => from.includes(s.toLowerCase()) || name.includes(s.toLowerCase()))) {
    return true
  }
  const domain = domainFrom(email.from)
  return domains.some((d) => domain === d.toLowerCase() || domain.endsWith(`.${d.toLowerCase()}`))
}

function textBlob(email: Email): string {
  return `${email.subject} ${email.preview} ${email.body}`.toLowerCase()
}

function scoreCategory(email: Email, training: EmailInboxTraining): EmailInboxClassification {
  const text = textBlob(email)

  if (matchesSenderOrDomain(email, training.importantSenders, training.importantDomains)) {
    return { category: 'important', important: true, confidence: 0.98, reason: 'You marked this sender as important' }
  }
  if (matchesSenderOrDomain(email, training.junkSenders, training.junkDomains)) {
    return { category: 'spam', important: false, confidence: 0.98, reason: 'You marked this sender as not important' }
  }

  for (const kw of training.importantKeywords) {
    if (text.includes(kw.toLowerCase())) {
      return { category: 'important', important: true, confidence: 0.9, reason: `Matches your keyword "${kw}"` }
    }
  }
  for (const kw of training.junkKeywords) {
    if (text.includes(kw.toLowerCase())) {
      return { category: 'spam', important: false, confidence: 0.9, reason: `Matches your blocked keyword "${kw}"` }
    }
  }

  if (PHISHING_RE.test(text) || /\.exe\b|malware|virus scan/i.test(text)) {
    return { category: 'phishing', important: false, confidence: 0.92, reason: 'Possible phishing or harmful attachment' }
  }
  if (SPAM_RE.test(text)) {
    return { category: 'spam', important: false, confidence: 0.88, reason: 'Common spam patterns detected' }
  }
  if (NEWSLETTER_RE.test(text) || /newsletter@|digest@|weekly@/i.test(email.from)) {
    return { category: 'newsletter', important: false, confidence: 0.85, reason: 'Newsletter or digest' }
  }
  if (MARKETING_RE.test(text) || /promo@|marketing@|offers@/i.test(email.from)) {
    return { category: 'marketing', important: false, confidence: 0.82, reason: 'Marketing or advertising' }
  }
  if (SOCIAL_RE.test(text)) {
    return { category: 'social', important: false, confidence: 0.8, reason: 'Social network notification' }
  }
  if (AUTOMATED_RE.test(text) || /no-?reply@|noreply@|notifications@/i.test(email.from)) {
    return { category: 'automated', important: false, confidence: 0.75, reason: 'Automated notification' }
  }
  if (/promotional|flash sale|clearance/i.test(text)) {
    return { category: 'promotional', important: false, confidence: 0.78, reason: 'Promotional offer' }
  }

  // Boost signals for real mail
  let score = 0
  if (email.starred) score += 3
  if (email.linkedNoteId) score += 2
  if (!email.read) score += 1
  if (IMPORTANT_SIGNAL_RE.test(text)) score += 2
  if (/@[a-z0-9.-]+\.(com|corp\.com)$/i.test(email.from) && !/newsletter|promo|marketing/i.test(email.from)) {
    score += 1
  }
  if (/invitation:|calendar@/i.test(email.subject + email.from)) score += 3
  if (email.attachmentIds?.length && !SPAM_RE.test(text)) score += 1

  if (score >= 3) {
    return { category: 'important', important: true, confidence: 0.7 + score * 0.05, reason: 'Work-related signals detected' }
  }

  if (score >= 1) {
    return { category: 'important', important: true, confidence: 0.55, reason: 'Likely personal or work mail' }
  }

  return { category: 'automated', important: false, confidence: 0.5, reason: 'Low priority automated or bulk mail' }
}

export function classifyEmail(
  email: Email,
  training: EmailInboxTraining,
  override?: { verdict: 'important' | 'junk'; category?: EmailJunkCategory },
): EmailInboxClassification {
  if (override?.verdict === 'important') {
    return {
      category: 'important',
      important: true,
      confidence: 1,
      reason: 'You marked this as important',
    }
  }
  if (override?.verdict === 'junk') {
    const cat = override.category ?? 'spam'
    return {
      category: cat,
      important: false,
      confidence: 1,
      reason: `You marked this as ${getCategoryLabel(cat).toLowerCase()}`,
    }
  }

  return scoreCategory(email, training)
}

export interface InboxHiddenStats {
  total: number
  hidden: number
  shown: number
  byCategory: Partial<Record<EmailJunkCategory, number>>
}

export function computeInboxStats(
  emails: Email[],
  training: EmailInboxTraining,
  overrides: Record<string, { verdict: 'important' | 'junk'; category?: EmailJunkCategory }>,
): InboxHiddenStats {
  const inbox = emails.filter((e) => (e.folder ?? 'inbox') === 'inbox')
  const byCategory: Partial<Record<EmailJunkCategory, number>> = {}
  let hidden = 0

  for (const email of inbox) {
    const c = classifyEmail(email, training, overrides[email.id])
    if (c.important) continue
    hidden += 1
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1
  }

  return {
    total: inbox.length,
    hidden,
    shown: inbox.length - hidden,
    byCategory,
  }
}

export const DEFAULT_INBOX_TRAINING: EmailInboxTraining = {
  importantSenders: ['sarah.j@corp.com', 'finance@corp.com', 'client@acme.com', 'calendar@corp.com'],
  junkSenders: [],
  importantDomains: ['corp.com', 'acme.com'],
  junkDomains: [],
  importantKeywords: ['project athena', 'budget', 'expense'],
  junkKeywords: [],
}
