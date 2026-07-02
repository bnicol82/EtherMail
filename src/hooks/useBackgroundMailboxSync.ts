import { useEffect, useRef } from 'react'
import { useEtherMailStore } from '../store/useStore'
import { useFeatureVisible } from './useFeatureGate'

const SYNC_INTERVAL_MS = 5 * 60_000

/** Periodically sync connected Gmail accounts when background sync is allowed. */
export function useBackgroundMailboxSync() {
  const accounts = useEtherMailStore((s) => s.accounts)
  const gmailSyncingAccountId = useEtherMailStore((s) => s.gmailSyncingAccountId)
  const syncGmailInbox = useEtherMailStore((s) => s.syncGmailInbox)
  const backgroundSync = useFeatureVisible('background_sync')
  const gmailLiveSync = useFeatureVisible('gmail_live_sync')
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!backgroundSync || !gmailLiveSync) return

    const run = async () => {
      if (syncingRef.current || gmailSyncingAccountId) return
      const targets = accounts.filter(
        (a) =>
          a.connected &&
          a.provider === 'gmail' &&
          a.syncMode === 'oauth' &&
          Boolean(a.oauthAccessToken),
      )
      if (targets.length === 0) return

      syncingRef.current = true
      try {
        for (const account of targets) {
          await syncGmailInbox(account.id)
        }
      } finally {
        syncingRef.current = false
      }
    }

    const id = setInterval(() => {
      void run()
    }, SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [accounts, backgroundSync, gmailLiveSync, gmailSyncingAccountId, syncGmailInbox])
}
