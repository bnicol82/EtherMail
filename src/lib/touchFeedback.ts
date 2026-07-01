import { useEtherMailStore } from '../store/useStore'

let audioCtx: AudioContext | null = null
let audioUnlocked = false

function getFeedbackSettings(): { hapticEnabled: boolean; hapticSoundEnabled: boolean } {
  return useEtherMailStore.getState().feedbackSettings
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

/** Call on first user gesture so iOS can play feedback sounds */
export function unlockTouchAudio(): void {
  if (audioUnlocked) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    audioUnlocked = true
  } catch {
    /* ignore */
  }
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** True when navigator.vibrate actually works (Android, not iOS Safari) */
export function canUseVibration(): boolean {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false
  if (isIOS()) return false
  try {
    return navigator.vibrate(0) !== false
  } catch {
    return false
  }
}

/**
 * Short tactile click — used when vibration is unavailable (especially iOS).
 * Tuned to feel like a light tap rather than a beep.
 */
export function playTouchClick(strong = false): void {
  try {
    unlockTouchAudio()
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()

    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(strong ? 180 : 220, t)
    osc.frequency.exponentialRampToValueAtTime(strong ? 90 : 110, t + 0.02)
    gain.gain.setValueAtTime(strong ? 0.14 : 0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + (strong ? 0.05 : 0.035))
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + (strong ? 0.055 : 0.04))
  } catch {
    /* audio blocked */
  }
}

/** Touch feedback: vibrate on Android, audible tick on iOS / unsupported browsers */
export function touchTick(strong = false): void {
  const { hapticEnabled, hapticSoundEnabled } = getFeedbackSettings()

  if (hapticEnabled && canUseVibration()) {
    try {
      navigator.vibrate(strong ? [10, 22, 10] : 12)
      return
    } catch {
      /* fall through to audio */
    }
  }

  if (hapticSoundEnabled) {
    playTouchClick(strong)
  }
}

export function isFinePointerDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
