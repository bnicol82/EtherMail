import type { PlanLimits } from '../lib/plan'

/** Organization member role — gates access to the admin panel */
export type OrgRole = 'member' | 'admin' | 'owner'

/**
 * Every user-facing capability that enterprise admins can allow or deny.
 * Add new features here when shipping toggles — wire enforcement via featureGates.ts.
 */
export type FeatureId =
  // AI & assistants
  | 'vault_ai'
  | 'external_ai'
  | 'ai_bridge'
  | 'ai_inbox'
  | 'ai_outbox'
  | 'follow_up_filter'
  | 'voice_chat'
  | 'voice_input'
  | 'proactive_assistant'
  | 'announce_emails'
  | 'inbox_training'
  | 'meeting_prep_ai'
  // Email & calendar
  | 'compose_email'
  | 'scheduled_send'
  | 'thread_view'
  | 'email_labels'
  | 'batch_email_actions'
  | 'connect_mailbox'
  | 'gmail_live_sync'
  | 'calendar_import_export'
  // Vault & notes
  | 'note_export'
  | 'note_share'
  | 'note_ai_assist'
  | 'vault_file_upload'
  | 'graph_view'
  | 'shared_vaults'
  // Integrations
  | 'oauth_byo_client'
  | 'provider_gmail'
  | 'provider_outlook'
  | 'provider_yahoo'
  | 'provider_enterprise'
  // UX & preferences (admins may lock these org-wide)
  | 'theme_customization'
  | 'touch_feedback'
  | 'weather_widget'
  | 'command_palette'
  | 'background_sync'

export type FeaturePolicy = Record<FeatureId, boolean>

export interface OrgPolicy {
  organizationId: string
  organizationName: string
  /** Per-feature allow (true) / deny (false) for all members */
  features: FeaturePolicy
  /** When true, denied features are hidden/disabled — members cannot override */
  enforceLocks: boolean
  /** Optional org-level quota overrides (merged with plan limits) */
  quotaOverrides?: Partial<PlanLimits>
}

export type FeatureCategory =
  | 'ai'
  | 'email'
  | 'vault'
  | 'integrations'
  | 'preferences'

export interface FeatureDefinition {
  id: FeatureId
  label: string
  description: string
  category: FeatureCategory
  /** Higher = more sensitive for enterprise IT review */
  risk: 'low' | 'medium' | 'high'
}

export const FEATURE_CATEGORIES: { id: FeatureCategory; label: string }[] = [
  { id: 'ai', label: 'AI & assistants' },
  { id: 'email', label: 'Email & calendar' },
  { id: 'vault', label: 'Vault & notes' },
  { id: 'integrations', label: 'Integrations & OAuth' },
  { id: 'preferences', label: 'Appearance & UX' },
]

export const FEATURE_CATALOG: FeatureDefinition[] = [
  { id: 'vault_ai', label: 'Vault AI (RAG)', description: 'AI queries over private vault data', category: 'ai', risk: 'medium' },
  { id: 'external_ai', label: 'External AI (BYOK)', description: 'Third-party models with user API keys', category: 'ai', risk: 'high' },
  { id: 'ai_bridge', label: 'AI Bridge mode', description: 'Send curated vault excerpts to external AI', category: 'ai', risk: 'high' },
  { id: 'ai_inbox', label: 'AI Inbox', description: 'Automatic junk/marketing filtering', category: 'ai', risk: 'medium' },
  { id: 'ai_outbox', label: 'AI Outbox', description: 'AI-assisted outbound mail review', category: 'ai', risk: 'medium' },
  { id: 'follow_up_filter', label: 'Follow-up filter', description: 'Surface emails needing replies', category: 'ai', risk: 'low' },
  { id: 'voice_chat', label: 'Voice chat', description: 'Speak with the AI assistant', category: 'ai', risk: 'medium' },
  { id: 'voice_input', label: 'Voice input', description: 'Microphone dictation in AI chat', category: 'ai', risk: 'medium' },
  { id: 'proactive_assistant', label: 'Proactive assistant', description: 'Voice alerts for mail and meetings', category: 'ai', risk: 'medium' },
  { id: 'announce_emails', label: 'Announce new emails', description: 'Read new mail aloud proactively', category: 'ai', risk: 'low' },
  { id: 'inbox_training', label: 'AI inbox training', description: 'Per-sender important/junk rules', category: 'ai', risk: 'low' },
  { id: 'meeting_prep_ai', label: 'Meeting prep AI', description: 'Generate meeting briefs from vault', category: 'ai', risk: 'medium' },
  { id: 'compose_email', label: 'Compose email', description: 'Create and send messages', category: 'email', risk: 'medium' },
  { id: 'scheduled_send', label: 'Scheduled send', description: 'Queue messages for later delivery', category: 'email', risk: 'medium' },
  { id: 'thread_view', label: 'Thread view', description: 'Group conversations in inbox', category: 'email', risk: 'low' },
  { id: 'email_labels', label: 'Email labels', description: 'Custom labels and filters', category: 'email', risk: 'low' },
  { id: 'batch_email_actions', label: 'Batch email actions', description: 'Multi-select archive, delete, etc.', category: 'email', risk: 'medium' },
  { id: 'connect_mailbox', label: 'Connect mailboxes', description: 'Add email accounts via OAuth', category: 'email', risk: 'high' },
  { id: 'gmail_live_sync', label: 'Gmail live sync', description: 'Real-time Gmail API sync', category: 'email', risk: 'high' },
  { id: 'calendar_import_export', label: 'Calendar import/export', description: '.ics import and export', category: 'email', risk: 'medium' },
  { id: 'note_export', label: 'Note export', description: 'Download notes as PDF/HTML', category: 'vault', risk: 'high' },
  { id: 'note_share', label: 'Note share', description: 'Native share sheet and copy', category: 'vault', risk: 'high' },
  { id: 'note_ai_assist', label: 'Note AI assist', description: 'Format, polish, and link suggestions', category: 'vault', risk: 'medium' },
  { id: 'vault_file_upload', label: 'Vault file upload', description: 'Upload files to vault folders', category: 'vault', risk: 'medium' },
  { id: 'graph_view', label: 'Graph view', description: 'Contact and note relationship graph', category: 'vault', risk: 'low' },
  { id: 'shared_vaults', label: 'Shared vaults', description: 'Team vault collaboration', category: 'vault', risk: 'high' },
  { id: 'oauth_byo_client', label: 'Bring-your-own OAuth clients', description: 'User-defined OAuth client IDs', category: 'integrations', risk: 'high' },
  { id: 'provider_gmail', label: 'Gmail provider', description: 'Connect Google mailboxes', category: 'integrations', risk: 'medium' },
  { id: 'provider_outlook', label: 'Outlook provider', description: 'Connect Microsoft consumer mail', category: 'integrations', risk: 'medium' },
  { id: 'provider_yahoo', label: 'Yahoo provider', description: 'Connect Yahoo mailboxes', category: 'integrations', risk: 'medium' },
  { id: 'provider_enterprise', label: 'Enterprise (Microsoft) provider', description: 'Microsoft 365 / Entra OAuth', category: 'integrations', risk: 'high' },
  { id: 'theme_customization', label: 'Theme customization', description: 'Glass, dark, and blue themes', category: 'preferences', risk: 'low' },
  { id: 'touch_feedback', label: 'Touch feedback', description: 'Haptic vibration and click sounds', category: 'preferences', risk: 'low' },
  { id: 'weather_widget', label: 'Weather widget', description: 'Location-based weather in dock', category: 'preferences', risk: 'low' },
  { id: 'command_palette', label: 'Command palette', description: '⌘K quick search and navigation', category: 'preferences', risk: 'low' },
  { id: 'background_sync', label: 'Background sync', description: 'Automatic mailbox sync', category: 'preferences', risk: 'medium' },
]
