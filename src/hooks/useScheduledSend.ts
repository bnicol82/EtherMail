import { useEffect } from 'react'
import { useEtherMailStore } from '../store/useStore'

const CHECK_MS = 30_000

/** Promotes scheduled emails to sent when their send time arrives */
export function useScheduledSend() {
  const processScheduledEmails = useEtherMailStore((s) => s.processScheduledEmails)

  useEffect(() => {
    processScheduledEmails()
    const id = window.setInterval(processScheduledEmails, CHECK_MS)
    return () => window.clearInterval(id)
  }, [processScheduledEmails])
}
