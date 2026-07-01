/** Short haptic pulse when the calendar snaps to a new day or month */
export function calendarHapticTick(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
  } catch {
    /* vibrate blocked or unsupported */
  }
}

/** Slightly stronger pulse for month boundaries */
export function calendarHapticMonth(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 24, 10])
    }
  } catch {
    /* vibrate blocked or unsupported */
  }
}
