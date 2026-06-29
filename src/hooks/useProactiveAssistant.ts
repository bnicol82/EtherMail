import { useEffect, useRef } from 'react'
import { useEtherMailStore } from '../store/useStore'
import { formatMeetingReminder, formatNewEmailAnnouncement } from '../lib/proactiveAssistant'
import { speakText } from '../lib/voice'

const MEETING_CHECK_MS = 30_000
const INITIAL_DELAY_MS = 2_500

/** Runs proactive voice announcements for new emails and upcoming meetings */
export function useProactiveAssistant() {
  const assistantSettings = useEtherMailStore((s) => s.assistantSettings)
  const emails = useEtherMailStore((s) => s.emails)
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const announcedProactive = useEtherMailStore((s) => s.announcedProactive)
  const markProactiveAnnounced = useEtherMailStore((s) => s.markProactiveAnnounced)

  const speakingRef = useRef(false)
  const knownEmailIdsRef = useRef<Set<string> | null>(null)

  // New email announcements
  useEffect(() => {
    if (!assistantSettings.proactiveEnabled || !assistantSettings.announceNewEmails) return

    const inboxUnread = emails.filter(
      (e) => (e.folder ?? 'inbox') === 'inbox' && !e.read && !e.snoozedUntil,
    )

    if (knownEmailIdsRef.current === null) {
      knownEmailIdsRef.current = new Set(emails.map((e) => e.id))
      const bootEmail = inboxUnread.sort((a, b) => b.date.localeCompare(a.date))[0]
      if (bootEmail && !announcedProactive[`email-${bootEmail.id}`]) {
        const t = setTimeout(async () => {
          if (speakingRef.current) return
          speakingRef.current = true
          try {
            const text = formatNewEmailAnnouncement(bootEmail, assistantSettings)
            await speakText(text, assistantSettings)
            markProactiveAnnounced(`email-${bootEmail.id}`)
          } finally {
            speakingRef.current = false
          }
        }, INITIAL_DELAY_MS)
        return () => clearTimeout(t)
      }
      return
    }

    for (const email of emails) {
      if (knownEmailIdsRef.current.has(email.id)) continue
      knownEmailIdsRef.current.add(email.id)
      if (email.read || (email.folder ?? 'inbox') !== 'inbox') continue
      const key = `email-${email.id}`
      if (announcedProactive[key]) continue

      ;(async () => {
        if (speakingRef.current) return
        speakingRef.current = true
        try {
          const text = formatNewEmailAnnouncement(email, assistantSettings)
          await speakText(text, assistantSettings)
          markProactiveAnnounced(key)
        } finally {
          speakingRef.current = false
        }
      })()
    }
  }, [
    emails,
    assistantSettings,
    announcedProactive,
    markProactiveAnnounced,
  ])

  // Meeting reminders
  useEffect(() => {
    if (!assistantSettings.proactiveEnabled) return

    const check = () => {
      const now = Date.now()
      const windowMs = assistantSettings.meetingReminderMinutes * 60 * 1000

      let events = [...calendarEvents]
      const hasSoon = events.some((e) => {
        const diff = new Date(e.start).getTime() - now
        return diff > 0 && diff <= windowMs
      })
      if (!hasSoon) {
        const demoStart = new Date(now + 8 * 60 * 1000).toISOString()
        const demoEnd = new Date(now + 38 * 60 * 1000).toISOString()
        events = [
          ...events,
          { id: 'demo-proactive-meeting', title: 'Project Sync', start: demoStart, end: demoEnd },
        ]
      }

      for (const event of events) {
        const start = new Date(event.start).getTime()
        const diff = start - now
        if (diff <= 0 || diff > windowMs) continue

        const key = `meeting-${event.id}-${assistantSettings.meetingReminderMinutes}`
        if (announcedProactive[key]) continue

        const minutesUntil = Math.max(1, Math.round(diff / 60_000))
        ;(async () => {
          if (speakingRef.current) return
          speakingRef.current = true
          try {
            const text = formatMeetingReminder(event, minutesUntil, assistantSettings)
            await speakText(text, assistantSettings)
            markProactiveAnnounced(key)
          } finally {
            speakingRef.current = false
          }
        })()
      }
    }

    check()
    const id = setInterval(check, MEETING_CHECK_MS)
    return () => clearInterval(id)
  }, [
    calendarEvents,
    assistantSettings,
    announcedProactive,
    markProactiveAnnounced,
  ])
}
