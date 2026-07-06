import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export const INBOX_SWIPE_DELETE_WIDTH = 72
export const INBOX_SWIPE_ACK_WIDTH = 168
export const INBOX_SWIPE_THRESHOLD = 56

export type InboxSwipeSnap = 'none' | 'ack' | 'delete'

interface Options {
  onDelete: () => void
  ackEnabled?: boolean
}

/** Horizontal movement (px) before we treat the gesture as a swipe and capture the pointer */
const DRAG_START_PX = 10

export function useInboxSwipe({ onDelete, ackEnabled = true }: Options) {
  const startX = useRef(0)
  // Capturing the pointer on pointerdown retargets the eventual `click` to the
  // swipe container, which swallows taps on the row button. Only capture once
  // the pointer has actually moved horizontally.
  const capturedRef = useRef(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [snapped, setSnapped] = useState<InboxSwipeSnap>('none')

  const reset = () => {
    setDragging(false)
    setOffset(0)
    setSnapped('none')
    capturedRef.current = false
  }

  const snapAck = () => {
    setDragging(false)
    setSnapped('ack')
    setOffset(INBOX_SWIPE_ACK_WIDTH)
    capturedRef.current = false
  }

  const handlers = {
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return
      if (snapped === 'ack') {
        reset()
        return
      }
      startX.current = e.clientX
      capturedRef.current = false
      setDragging(true)
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (!dragging || snapped === 'ack') return
      const dx = e.clientX - startX.current
      if (!capturedRef.current) {
        if (Math.abs(dx) < DRAG_START_PX) return
        capturedRef.current = true
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      const min = -(INBOX_SWIPE_DELETE_WIDTH + 20)
      const max = ackEnabled ? INBOX_SWIPE_ACK_WIDTH + 20 : 0
      setOffset(Math.min(max, Math.max(dx, min)))
    },
    onPointerUp: (e: ReactPointerEvent) => {
      if (!dragging || snapped === 'ack') return
      if (capturedRef.current) {
        try {
          ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        } catch {
          /* released */
        }
      }
      setDragging(false)
      capturedRef.current = false
      if (offset < -INBOX_SWIPE_THRESHOLD) {
        onDelete()
        reset()
        return
      }
      if (ackEnabled && offset > INBOX_SWIPE_THRESHOLD) {
        snapAck()
        return
      }
      reset()
    },
    onPointerCancel: () => {
      if (snapped === 'ack') return
      reset()
    },
  }

  const dismissSnap = () => {
    if (snapped !== 'none') reset()
  }

  return {
    offset: snapped === 'ack' ? INBOX_SWIPE_ACK_WIDTH : offset,
    dragging,
    snapped,
    handlers,
    reset,
    dismissSnap,
    showDelete: offset < -8,
    showAck: ackEnabled && (offset > 8 || snapped === 'ack'),
  }
}
