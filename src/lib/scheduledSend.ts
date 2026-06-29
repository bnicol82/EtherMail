/** Quick picks for scheduled email send */
export const SCHEDULE_PRESETS = [
  { id: '1h', label: 'In 1 hour' },
  { id: '3h', label: 'In 3 hours' },
  { id: 'tomorrow9', label: 'Tomorrow 9am' },
  { id: 'monday9', label: 'Monday 9am' },
] as const

export function scheduledAtFromPreset(presetId: string): string {
  const now = new Date()
  switch (presetId) {
    case '1h':
      return new Date(now.getTime() + 3600000).toISOString()
    case '3h':
      return new Date(now.getTime() + 3 * 3600000).toISOString()
    case 'tomorrow9': {
      const d = new Date(now)
      d.setDate(d.getDate() + 1)
      d.setHours(9, 0, 0, 0)
      return d.toISOString()
    }
    case 'monday9': {
      const d = new Date(now)
      const day = d.getDay()
      const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
      d.setDate(d.getDate() + daysUntilMonday)
      d.setHours(9, 0, 0, 0)
      return d.toISOString()
    }
    default:
      return new Date(now.getTime() + 3600000).toISOString()
  }
}

export function formatScheduledAt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today at ${time}`
  if (isTomorrow) return `Tomorrow at ${time}`
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}
