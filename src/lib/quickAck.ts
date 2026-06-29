import type { AckStatus } from '../types'

export const QUICK_ACK_PRESETS: { status: AckStatus; label: string; message: string }[] = [
  { status: 'received', label: 'Received it', message: "Got it — I've received your email." },
  { status: 'working', label: 'Working on it', message: "Thanks — I'm working on this and will follow up soon." },
  { status: 'thanks', label: 'Thanks!', message: 'Thanks for reaching out!' },
]

export const QUICK_ACK_EMOJIS = ['👍', '✅', '🙏', '👀', '🎉', '💯']

export function ackStatusColor(status: AckStatus): string {
  switch (status) {
    case 'received':
      return 'text-sky-400'
    case 'working':
      return 'text-amber-400'
    case 'thanks':
      return 'text-emerald-400'
    case 'emoji':
      return 'text-theme-secondary'
    default:
      return 'text-theme-muted'
  }
}
