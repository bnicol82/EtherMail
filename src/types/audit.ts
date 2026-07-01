import type { FeatureId } from './admin'

export type AuditCategory = 'policy' | 'ai' | 'email' | 'vault' | 'admin' | 'auth' | 'share'

export interface AuditEvent {
  id: string
  timestamp: string
  category: AuditCategory
  action: string
  actorEmail?: string
  featureId?: FeatureId
  detail?: string
  metadata?: Record<string, string>
}
