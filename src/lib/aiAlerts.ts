import type { AIAlert, CalendarEvent, Email, EmailAccount, Note } from '../types'
import { extractTodos } from './todos'
import { detectFollowUps } from './followUp'
import { isSameDay } from './utils'

type AlertDraft = Omit<AIAlert, 'read'>

export function computeAIAlerts(
  notes: Note[],
  emails: Email[],
  calendarEvents: CalendarEvent[],
  accounts: EmailAccount[],
): AlertDraft[] {
  const alerts: AlertDraft[] = []
  const now = new Date()
  const today = new Date()

  const inbox = emails.filter(
    (e) => (e.folder ?? 'inbox') === 'inbox' && accounts.find((a) => a.id === e.accountId)?.connected,
  )
  const unread = inbox.filter((e) => !e.read)

  if (unread.length > 0) {
    const top = unread[0]
    alerts.push({
      id: 'alert-unread-summary',
      title: `${unread.length} unread email${unread.length === 1 ? '' : 's'}`,
      message:
        unread.length === 1
          ? `${top.fromName} sent "${top.subject}". I recommend reviewing it when you have a moment.`
          : `Your inbox has ${unread.length} unread messages. The most recent is from ${top.fromName}: "${top.subject}".`,
      severity: unread.length >= 3 ? 'warning' : 'info',
      category: 'email',
      actionView: 'email',
      sourceId: top.id,
      createdAt: now.toISOString(),
    })
  }

  const starredUnread = unread.filter((e) => e.starred)
  for (const email of starredUnread.slice(0, 2)) {
    alerts.push({
      id: `alert-starred-${email.id}`,
      title: 'Starred email waiting',
      message: `"${email.subject}" from ${email.fromName} is starred and still unread. This may need a prompt reply.`,
      severity: 'warning',
      category: 'email',
      actionView: 'email',
      sourceId: email.id,
      createdAt: email.date,
    })
  }

  for (const email of inbox) {
    if (!/reminder|deadline|submit|due/i.test(email.subject)) continue
    if (email.read) continue
    alerts.push({
      id: `alert-reminder-${email.id}`,
      title: 'Reminder detected',
      message: `I spotted a deadline-style message: "${email.subject}" from ${email.fromName}. ${email.preview}`,
      severity: 'urgent',
      category: 'email',
      actionView: 'email',
      sourceId: email.id,
      createdAt: email.date,
    })
  }

  const followUps = detectFollowUps(inbox)
  for (const hint of followUps.slice(0, 3)) {
    alerts.push({
      id: `alert-followup-${hint.emailId}`,
      title: 'Follow-up needed',
      message: `"${hint.subject}" from ${hint.fromName} — ${hint.label}.`,
      severity: hint.severity === 'urgent' ? 'urgent' : hint.severity === 'warning' ? 'warning' : 'info',
      category: 'email',
      actionView: 'email',
      sourceId: hint.emailId,
      secondaryActionLabel: 'Draft follow-up',
      secondaryActionQuery: `Draft a follow-up email for "${hint.subject}"`,
      createdAt: new Date(Date.now() - hint.daysSince * 86400000).toISOString(),
    })
  }

  const upcoming = [...calendarEvents]
    .filter((e) => new Date(e.end) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))

  const todayEvents = upcoming.filter((e) => isSameDay(new Date(e.start), today))
  if (todayEvents.length > 0) {
    const next = todayEvents[0]
    const time = new Date(next.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const room = next.room ? ` Room ${next.room}.` : ''
    alerts.push({
      id: `alert-today-${next.id}`,
      title: `${todayEvents.length} meeting${todayEvents.length === 1 ? '' : 's'} today`,
      message: `Next up: "${next.title}" at ${time}.${room} ${todayEvents.length > 1 ? `You have ${todayEvents.length} events on today's calendar.` : ''}`.trim(),
      severity: todayEvents.length > 2 ? 'warning' : 'info',
      category: 'calendar',
      actionView: 'calendar',
      sourceId: next.id,
      createdAt: next.start,
    })
  }

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowEvents = upcoming.filter((e) => isSameDay(new Date(e.start), tomorrow))
  if (tomorrowEvents.length > 0) {
    const first = tomorrowEvents[0]
    alerts.push({
      id: `alert-tomorrow-${first.id}`,
      title: 'Tomorrow on your calendar',
      message: `You have ${tomorrowEvents.length} event${tomorrowEvents.length === 1 ? '' : 's'} tomorrow. First: "${first.title}". Want me to help you prep?`,
      severity: 'info',
      category: 'calendar',
      actionView: 'calendar',
      sourceId: first.id,
      secondaryActionLabel: 'Prep brief',
      secondaryActionQuery: `Prep brief for ${first.title}`,
      createdAt: first.start,
    })
  }

  const todos = extractTodos(notes, emails, calendarEvents, [], 5)
  if (todos.length > 0) {
    alerts.push({
      id: 'alert-todos-open',
      title: `${todos.length} open to-do${todos.length === 1 ? '' : 's'}`,
      message: `I found action items in your notes and email. Top item: "${todos[0].text}" from ${todos[0].sourceLabel}.`,
      severity: todos.length >= 4 ? 'warning' : 'info',
      category: 'todo',
      actionView: todos[0].source === 'note' ? 'notes' : 'email',
      sourceId: todos[0].sourceId,
      createdAt: now.toISOString(),
    })
  }

  const disconnected = accounts.filter((a) => !a.connected)
  for (const acc of disconnected) {
    alerts.push({
      id: `alert-connect-${acc.id}`,
      title: 'Account not connected',
      message: `${acc.email} isn't connected yet. Connect it to sync inbox and calendar invites.`,
      severity: 'warning',
      category: 'account',
      actionView: 'settings',
      sourceId: acc.id,
      createdAt: now.toISOString(),
    })
  }

  const staleNotes = notes.filter((n) => {
    const updated = new Date(n.updatedAt)
    const days = (now.getTime() - updated.getTime()) / 86400000
    return days > 14 && /- \[ \]/.test(n.content)
  })
  if (staleNotes.length > 0) {
    const note = staleNotes[0]
    alerts.push({
      id: `alert-stale-note-${note.id}`,
      title: 'Stale note with open tasks',
      message: `"${note.title}" hasn't been updated in over two weeks but still has unchecked items. Worth revisiting.`,
      severity: 'info',
      category: 'vault',
      actionView: 'notes',
      sourceId: note.id,
      createdAt: note.updatedAt,
    })
  }

  return alerts.sort((a, b) => {
    const rank = { urgent: 0, warning: 1, info: 2 }
    const diff = rank[a.severity] - rank[b.severity]
    if (diff !== 0) return diff
    return b.createdAt.localeCompare(a.createdAt)
  })
}
