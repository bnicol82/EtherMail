import { touchTick } from './touchFeedback'

/** Short pulse when the calendar snaps to a new day */
export function calendarHapticTick(): void {
  touchTick()
}

/** Stronger pulse when crossing a month boundary */
export function calendarHapticMonth(): void {
  touchTick(true)
}
