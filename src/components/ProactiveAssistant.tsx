import { useProactiveAssistant } from '../hooks/useProactiveAssistant'

/** Invisible component — runs proactive voice announcements */
export function ProactiveAssistant() {
  useProactiveAssistant()
  return null
}
