import type {
  CalendarEvent,
  Email,
  EmailAccount,
  GraphEdge,
  GraphNode,
  Note,
} from '../types'
import { normalizeAddress, parseAddressList } from './emailCompose'
import { accountVaultId } from './vaults'

export interface ContactRecord {
  personId: string
  label: string
  email?: string
  emailCount: number
  calendarCount: number
  totalInteractions: number
}

export function personNodeId(key: string): string {
  const normalized = normalizeAddress(key)
  if (normalized.includes('@')) return `person-${normalized}`
  return `person-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function upsertContact(
  index: Map<string, ContactRecord>,
  key: string,
  label: string,
  delta: { email?: number; calendar?: number },
): string {
  const email = key.includes('@') ? normalizeAddress(key) : undefined
  const id = personNodeId(email ?? key)
  const existing = index.get(id)
  const next: ContactRecord = existing ?? {
    personId: id,
    label: label.trim() || key,
    email,
    emailCount: 0,
    calendarCount: 0,
    totalInteractions: 0,
  }
  if (!existing || label.trim().length > existing.label.length) {
    next.label = label.trim() || next.label
  }
  if (email && !next.email) next.email = email
  next.emailCount += delta.email ?? 0
  next.calendarCount += delta.calendar ?? 0
  next.totalInteractions = next.emailCount + next.calendarCount
  index.set(id, next)
  return id
}

function matchAttendeeToPersonId(
  attendee: string,
  emails: Email[],
  index: Map<string, ContactRecord>,
): string {
  const trimmed = attendee.trim()
  if (!trimmed) return personNodeId('unknown')

  const asEmail = normalizeAddress(trimmed)
  if (asEmail.includes('@')) {
    const fromEmail = emails.find((e) => normalizeAddress(e.from) === asEmail)
    return upsertContact(index, asEmail, fromEmail?.fromName ?? trimmed, { calendar: 1 })
  }

  const term = trimmed.toLowerCase().split(/[@\s.]+/)[0]
  const matched = emails.find((e) => {
    const haystack = `${e.fromName} ${e.from}`.toLowerCase()
    return term.length > 2 && haystack.includes(term)
  })
  if (matched) {
    return upsertContact(index, matched.from, matched.fromName, { calendar: 1 })
  }

  return upsertContact(index, trimmed, trimmed, { calendar: 1 })
}

export function buildContactIndex(
  emails: Email[],
  calendarEvents: CalendarEvent[],
): Map<string, ContactRecord> {
  const index = new Map<string, ContactRecord>()

  for (const email of emails) {
    upsertContact(index, email.from, email.fromName, { email: 1 })

    const recipients = [
      ...parseAddressList(email.to),
      ...(email.cc ? parseAddressList(email.cc) : []),
      ...(email.bcc ? parseAddressList(email.bcc) : []),
    ]
    for (const raw of recipients) {
      const addr = normalizeAddress(raw)
      if (!addr.includes('@')) continue
      const nameMatch = raw.match(/^([^<]+)</)
      const label = nameMatch ? nameMatch[1].trim() : addr.split('@')[0]
      upsertContact(index, addr, label, { email: 1 })
    }
  }

  for (const event of calendarEvents) {
    for (const attendee of event.attendees ?? []) {
      matchAttendeeToPersonId(attendee, emails, index)
    }
  }

  return index
}

export function personRadius(metadata?: GraphNode['metadata']): number {
  const total = metadata?.totalInteractions ?? 1
  return Math.min(18, Math.max(6, 5 + Math.sqrt(total) * 2.5))
}

export function emailsForVault(
  emails: Email[],
  accounts: EmailAccount[],
  vaultId: string | null | undefined,
): Email[] {
  if (!vaultId) return emails
  const accountIds = new Set(
    accounts.filter((a) => accountVaultId(a) === vaultId).map((a) => a.id),
  )
  return emails.filter((e) => accountIds.has(e.accountId))
}

export function notesForVault(notes: Note[], vaultId: string | null | undefined): Note[] {
  if (!vaultId) return notes
  return notes.filter((n) => n.vaultId === vaultId)
}

export function emailMatchesPerson(email: Email, personId: string): boolean {
  const key = personId.replace(/^person-/, '')
  if (normalizeAddress(email.from) === key) return true
  if (email.fromName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === key) return true

  const recipients = [
    ...parseAddressList(email.to),
    ...(email.cc ? parseAddressList(email.cc) : []),
    ...(email.bcc ? parseAddressList(email.bcc) : []),
  ]
  return recipients.some((raw) => normalizeAddress(raw) === key)
}

export function buildContactGraph(
  notes: Note[],
  emails: Email[],
  calendarEvents: CalendarEvent[],
  accounts: EmailAccount[],
  vaultId?: string | null,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const scopedNotes = notesForVault(notes, vaultId)
  const scopedEmails = emailsForVault(emails, accounts, vaultId)
  const scopedCalendar = vaultId
    ? calendarEvents.filter((event) => {
        if (event.sourceEmailId) {
          const source = emails.find((e) => e.id === event.sourceEmailId)
          if (source && !scopedEmails.some((e) => e.id === source.id)) return false
        }
        return true
      })
    : calendarEvents

  const contactIndex = buildContactIndex(scopedEmails, scopedCalendar)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  const addNode = (node: GraphNode) => {
    if (!seen.has(node.id)) {
      seen.add(node.id)
      nodes.push(node)
    }
  }

  for (const note of scopedNotes) {
    addNode({ id: note.id, label: note.title, type: 'note' })
    for (const tag of note.tags) {
      const tagId = `tag-${tag}`
      addNode({ id: tagId, label: tag, type: 'tag' })
      edges.push({ id: `${note.id}-${tagId}`, source: note.id, target: tagId, type: 'tagged' })
    }

    const linkRegex = /\[\[([^\]]+)\]\]/g
    let match: RegExpExecArray | null
    while ((match = linkRegex.exec(note.content)) !== null) {
      const linkedTitle = match[1]
      const linked = scopedNotes.find((n) => n.title === linkedTitle)
      if (linked) {
        edges.push({
          id: `${note.id}-${linked.id}`,
          source: note.id,
          target: linked.id,
          type: 'links_to',
        })
      }
    }
  }

  for (const email of scopedEmails) {
    addNode({ id: email.id, label: email.subject.slice(0, 30), type: 'email' })

    const senderId = upsertContact(contactIndex, email.from, email.fromName, { email: 0 })
    const sender = contactIndex.get(senderId)!
    addNode({
      id: sender.personId,
      label: sender.label,
      type: 'person',
      metadata: {
        email: sender.email,
        emailCount: sender.emailCount,
        calendarCount: sender.calendarCount,
        totalInteractions: sender.totalInteractions,
      },
    })
    edges.push({
      id: `${sender.personId}-${email.id}-from`,
      source: sender.personId,
      target: email.id,
      type: 'from',
    })

    const recipients = [
      ...parseAddressList(email.to),
      ...(email.cc ? parseAddressList(email.cc) : []),
    ]
    for (const raw of recipients) {
      const addr = normalizeAddress(raw)
      if (!addr.includes('@')) continue
      const nameMatch = raw.match(/^([^<]+)</)
      const label = nameMatch ? nameMatch[1].trim() : addr.split('@')[0]
      const recipientId = upsertContact(contactIndex, addr, label, { email: 0 })
      const recipient = contactIndex.get(recipientId)!
      addNode({
        id: recipient.personId,
        label: recipient.label,
        type: 'person',
        metadata: {
          email: recipient.email,
          emailCount: recipient.emailCount,
          calendarCount: recipient.calendarCount,
          totalInteractions: recipient.totalInteractions,
        },
      })
      edges.push({
        id: `${recipient.personId}-${email.id}-emailed`,
        source: recipient.personId,
        target: email.id,
        type: 'emailed',
      })
    }

    if (email.linkedNoteId && scopedNotes.some((n) => n.id === email.linkedNoteId)) {
      edges.push({
        id: `${email.id}-${email.linkedNoteId}`,
        source: email.id,
        target: email.linkedNoteId,
        type: 'references',
      })
    }
  }

  for (const event of scopedCalendar) {
    addNode({
      id: event.id,
      label: event.title.slice(0, 28),
      type: 'calendar',
    })

    for (const attendee of event.attendees ?? []) {
      const personId = matchAttendeeToPersonId(attendee, scopedEmails, contactIndex)
      const person = contactIndex.get(personId)!
      addNode({
        id: person.personId,
        label: person.label,
        type: 'person',
        metadata: {
          email: person.email,
          emailCount: person.emailCount,
          calendarCount: person.calendarCount,
          totalInteractions: person.totalInteractions,
        },
      })
      edges.push({
        id: `${person.personId}-${event.id}-attended`,
        source: person.personId,
        target: event.id,
        type: 'attended',
      })
    }

    if (event.sourceEmailId && scopedEmails.some((e) => e.id === event.sourceEmailId)) {
      edges.push({
        id: `${event.sourceEmailId}-${event.id}`,
        source: event.sourceEmailId,
        target: event.id,
        type: 'references',
      })
    }
  }

  return { nodes, edges }
}

/** @deprecated use buildContactGraph */
export function buildGraphFromData(notes: Note[], emails: Email[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return buildContactGraph(notes, emails, [], [], null)
}
