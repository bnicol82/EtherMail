import type { FeatureId } from '../types/admin'
import type { AuditCategory, AuditEvent } from '../types/audit'

let seq = 0

export function createAuditEvent(
  category: AuditCategory,
  action: string,
  opts?: {
    actorEmail?: string
    featureId?: FeatureId
    detail?: string
    metadata?: Record<string, string>
  },
): AuditEvent {
  seq += 1
  return {
    id: `audit-${Date.now()}-${seq}`,
    timestamp: new Date().toISOString(),
    category,
    action,
    actorEmail: opts?.actorEmail,
    featureId: opts?.featureId,
    detail: opts?.detail,
    metadata: opts?.metadata,
  }
}

export function trimAuditLog(events: AuditEvent[], max = 500): AuditEvent[] {
  return events.slice(-max)
}
