import type { FeatureId } from '../types/admin'
import type { AuditEvent } from '../types/audit'
import { hasOrgApi, checkServerGate } from './orgApi'
import { appendAudit, gateOrToast, type PolicySlice } from './storePolicy'

export type GatePatch = { policyToast: string; auditLog: AuditEvent[] }

/** Client gate, then optional server gate when org API is configured. */
export async function gateClientAndServer(
  state: PolicySlice,
  featureId: FeatureId,
  actionLabel: string,
): Promise<{ ok: true } | { ok: false; patch: GatePatch }> {
  const client = gateOrToast(state, featureId, actionLabel)
  if (!client.ok) return client

  if (!hasOrgApi()) return { ok: true }

  try {
    const server = await checkServerGate(featureId, actionLabel)
    if (server.allowed) return { ok: true }
    return {
      ok: false,
      patch: {
        policyToast: server.message ?? 'Action not allowed by organization policy',
        auditLog: appendAudit(state, 'policy', 'feature_denied_server', {
          featureId,
          detail: actionLabel,
        }),
      },
    }
  } catch {
    return { ok: true }
  }
}
