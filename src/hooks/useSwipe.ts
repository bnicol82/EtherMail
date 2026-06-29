import { useCallback, useRef, useState } from 'react'

interface SwipeHandlers {
  offset: number
  isDragging: boolean
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 56,
): SwipeHandlers {
  const startX = useRef(0)
  const startY = useRef(0)
  const active = useRef(false)
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const reset = useCallback(() => {
    active.current = false
    setIsDragging(false)
    setOffset(0)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    active.current = true
    startX.current = e.clientX
    startY.current = e.clientY
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (Math.abs(dy) > Math.abs(dx) * 1.25) {
      reset()
      return
    }
    setOffset(dx)
  }, [reset])

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!active.current) return
      const delta = e.clientX - startX.current
      if (delta > threshold) onSwipeRight()
      else if (delta < -threshold) onSwipeLeft()
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      reset()
    },
    [onSwipeLeft, onSwipeRight, reset, threshold],
  )

  const onPointerCancel = useCallback(() => {
    reset()
  }, [reset])

  return {
    offset,
    isDragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
