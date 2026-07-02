import type { FeatureId } from '../types/admin'
import type { AuditEvent } from '../types/audit'
import { hasOrgApi, checkServerGate } from './orgApi'
import { appendAudit, gateOrToast, type PolicySlice } from './storePolicy'

export type GatePatch = { policyToast: string; auditLog: AuditEvent[] }

type StoreGet = () => PolicySlice
type StoreSet = (partial: GatePatch | Record<string, unknown>) => void

/** Run client + server gate; returns false and applies patch when denied. */
export async function withFullGate(
  get: StoreGet,
  set: StoreSet,
  featureId: FeatureId,
  actionLabel: string,
): Promise<boolean> {
  const gate = await gateClientAndServer(get(), featureId, actionLabel)
  if (gate.ok) return true
  set(gate.patch)
  return false
}

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
