import { isFinePointerDevice, playTouchClick, touchTick, unlockTouchAudio } from './touchFeedback'
import { useEtherMailStore } from '../store/useStore'

export { unlockTouchAudio, isFinePointerDevice, touchTick }

/** Short pulse for touch / mobile menu traversal */
export function menuHapticTick(): void {
  touchTick()
}

/** Subtle click for desktop hover */
export function menuHoverClick(): void {
  if (!useEtherMailStore.getState().feedbackSettings.hapticSoundEnabled) return
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

/** Tap feedback for header chrome buttons (menu, settings) */
export function buttonClickFeedback(): void {
  unlockTouchAudio()
  touchTick()
}
