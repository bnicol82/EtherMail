import type { AssistantPersonality, AssistantSettings, CalendarEvent, Email } from '../types'
import { stripMarkdownForSpeech } from './voice'

const PERSONALITY_PREFIX: Record<AssistantPersonality, (name: string) => string> = {
  professional: (name) => `Hi ${name},`,
  friendly: (name) => `Hey ${name}!`,
  concise: (name) => `${name},`,
  warm: (name) => `Hi there ${name},`,
}

function prefix(settings: AssistantSettings): string {
  return PERSONALITY_PREFIX[settings.personality](settings.userName)
}

export function formatNewEmailAnnouncement(email: Email, settings: AssistantSettings): string {
  const summary = email.preview || email.body.slice(0, 120)
  return `${prefix(settings)} looks like you just received an email from ${email.fromName} about "${email.subject}". ${summary}`
}

export function formatMeetingReminder(
  event: CalendarEvent,
  minutesUntil: number,
  settings: AssistantSettings,
): string {
  const time = new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const room = event.room ? ` in room ${event.room}` : event.location ? ` at ${event.location}` : ''
  if (minutesUntil <= 1) {
    return `${prefix(settings)} your meeting "${event.title}" is starting now${room}. Don't forget!`
  }
  return `${prefix(settings)} looks like you have "${event.title}" in ${minutesUntil} minutes at ${time}${room}. Don't forget.`
}

export function formatAssistantReplyForSpeech(content: string): string {
  return stripMarkdownForSpeech(content).slice(0, 500)
}
