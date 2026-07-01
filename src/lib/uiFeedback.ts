import { isFinePointerDevice, playTouchClick, touchTick, unlockTouchAudio } from './touchFeedback'

export { unlockTouchAudio, isFinePointerDevice, touchTick }

/** Short pulse for touch / mobile menu traversal */
export function menuHapticTick(): void {
  touchTick()
}

/** Subtle click for desktop hover */
export function menuHoverClick(): void {
  playTouchClick()
}

/** Desktop hover: click sound */
export function menuHoverFeedback(): void {
  menuHoverClick()
}

/** Touch drag / scroll across menu items */
export function menuTouchFeedback(): void {
  unlockTouchAudio()
  touchTick()
}
