import { useEffect } from 'react'
import { useEtherMailStore } from '../store/useStore'
import { hasOrgApi } from '../lib/orgApi'

const REFRESH_INTERVAL_MS = 5 * 60_000

/** Keeps org session and remote policy state fresh while the app is open. */
export function useOrgSessionRefresh() {
  const bootstrapOrgSession = useEtherMailStore((s) => s.bootstrapOrgSession)
  const syncAuditFromApi = useEtherMailStore((s) => s.syncAuditFromApi)

  useEffect(() => {
    if (!hasOrgApi()) return

    const refresh = () => {
      void bootstrapOrgSession()
      void syncAuditFromApi()
    }

    const id = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [bootstrapOrgSession, syncAuditFromApi])
}
