import { useEffect, useRef, type RefObject } from 'react'
import { calendarHapticMonth, calendarHapticTick } from '../lib/calendarFeedback'

type HapticMode = 'day' | 'month'

/**
 * Fires haptic feedback when the most-visible snap item changes while scrolling.
 */
export function useSnapScrollFeedback(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  itemSelector: string,
  getItemKey: (el: Element) => string,
  onActiveKeyChange?: (key: string) => void,
  shouldTick: () => boolean = () => true,
  mode: HapticMode = 'day',
) {
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const root = containerRef.current
    const items = root.querySelectorAll(itemSelector)
    if (items.length === 0) return

    const pickActive = () => {
      const rootRect = root.getBoundingClientRect()
      const centerX = rootRect.left + rootRect.width / 2
      const centerY = rootRect.top + Math.min(rootRect.height * 0.35, 120)

      let bestEl: Element | null = null
      let bestDist = Infinity
      items.forEach((el) => {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dist = Math.hypot(cx - centerX, cy - centerY)
        if (dist < bestDist) {
          bestDist = dist
          bestEl = el
        }
      })
      if (!bestEl) return

      const key = getItemKey(bestEl)
      if (key && key !== lastKey.current) {
        lastKey.current = key
        if (shouldTick()) {
          if (mode === 'month') calendarHapticMonth()
          else calendarHapticTick()
        }
        onActiveKeyChange?.(key)
      }
    }

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(pickActive)
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('scroll', onScroll)
    }
  }, [containerRef, enabled, itemSelector, getItemKey, onActiveKeyChange, shouldTick, mode])
}
