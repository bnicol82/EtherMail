import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { menuTouchFeedback, isFinePointerDevice } from '../lib/uiFeedback'

/**
 * Haptic tick when the finger scrolls or drags across a new menu item in the nav list.
 */
export function useMenuScrollHaptic(navRef: RefObject<HTMLElement | null>) {
  const lastKey = useRef<string | null>(null)
  const touchActive = useRef(false)

  const pickItemKey = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY)?.closest('[data-menu-item]')
    return el?.getAttribute('data-menu-item') ?? null
  }, [])

  const tickIfNew = useCallback((key: string | null) => {
    if (!key || key === lastKey.current) return
    lastKey.current = key
    menuTouchFeedback()
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      touchActive.current = true
      tickIfNew(pickItemKey(e.clientX, e.clientY))
    }
  }, [pickItemKey, tickIfNew])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!touchActive.current && e.pointerType !== 'touch' && e.pointerType !== 'pen') return
      if (e.pointerType === 'mouse' && e.buttons === 0) return
      tickIfNew(pickItemKey(e.clientX, e.clientY))
    },
    [pickItemKey, tickIfNew],
  )

  const onPointerUp = useCallback(() => {
    touchActive.current = false
    lastKey.current = null
  }, [])

  useEffect(() => {
    const root = navRef.current
    if (!root) return

    const items = root.querySelectorAll('[data-menu-item]')
    if (items.length === 0) return

    const pickFromScroll = () => {
      if (isFinePointerDevice()) return
      const rootRect = root.getBoundingClientRect()
      const probeY = rootRect.top + Math.min(48, rootRect.height * 0.2)

      let bestKey: string | null = null
      let bestDist = Infinity
      items.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.bottom < rootRect.top || r.top > rootRect.bottom) return
        const cy = r.top + r.height / 2
        const dist = Math.abs(cy - probeY)
        if (dist < bestDist) {
          bestDist = dist
          bestKey = el.getAttribute('data-menu-item')
        }
      })
      tickIfNew(bestKey)
    }

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(pickFromScroll)
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('scroll', onScroll)
    }
  }, [navRef, tickIfNew])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
