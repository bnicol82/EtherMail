import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export const INBOX_SWIPE_DELETE_WIDTH = 72
export const INBOX_SWIPE_ACK_WIDTH = 168
export const INBOX_SWIPE_THRESHOLD = 56

export type InboxSwipeSnap = 'none' | 'ack' | 'delete'

interface Options {
  onDelete: () => void
  ackEnabled?: boolean
}

export function useInboxSwipe({ onDelete, ackEnabled = true }: Options) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [snapped, setSnapped] = useState<InboxSwipeSnap>('none')

  const reset = () => {
    setDragging(false)
    setOffset(0)
    setSnapped('none')
  }

  const snapAck = () => {
    setDragging(false)
    setSnapped('ack')
    setOffset(INBOX_SWIPE_ACK_WIDTH)
  }

  const handlers = {
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return
      if (snapped === 'ack') {
        reset()
        return
      }
      startX.current = e.clientX
      setDragging(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (!dragging || snapped === 'ack') return
      const dx = e.clientX - startX.current
      const min = -(INBOX_SWIPE_DELETE_WIDTH + 20)
      const max = ackEnabled ? INBOX_SWIPE_ACK_WIDTH + 20 : 0
      setOffset(Math.min(max, Math.max(dx, min)))
    },
    onPointerUp: (e: ReactPointerEvent) => {
      if (!dragging || snapped === 'ack') return
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* released */
      }
      setDragging(false)
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
