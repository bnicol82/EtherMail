/** Snooze duration helpers for alerts and emails */
export const SNOOZE_PRESETS = [
  { id: '1h', label: '1 hour', hours: 1 },
  { id: '3h', label: '3 hours', hours: 3 },
  { id: 'tomorrow', label: 'Tomorrow 9am', hours: 0, tomorrow9am: true },
  { id: '1w', label: '1 week', hours: 24 * 7 },
] as const

export function snoozeUntilFromPreset(presetId: string): string {
  const preset = SNOOZE_PRESETS.find((p) => p.id === presetId)
  if (!preset) return new Date(Date.now() + 3600000).toISOString()

  if ('tomorrow9am' in preset && preset.tomorrow9am) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d.toISOString()
  }

  return new Date(Date.now() + preset.hours * 3600000).toISOString()
}
