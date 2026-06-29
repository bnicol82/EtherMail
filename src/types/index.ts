export type View = 'dashboard' | 'email' | 'vault' | 'calendar' | 'notes' | 'graph' | 'ai' | 'settings'

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash'

export type Theme = 'glass' | 'dark' | 'blue'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  attendees?: string[]
  location?: string
  room?: string
  sourceEmailId?: string
}

export type AckStatus = 'received' | 'working' | 'thanks' | 'emoji'

export interface EmailAcknowledgement {
  id: string
  fromName: string
  status: AckStatus
  label: string
  emoji?: string
  timestamp: string
}

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'enterprise'

export interface EmailAccount {
  id: string
  email: string
  provider: EmailProvider
  connected: boolean
  connectedAt?: string
  /** demo = simulated OAuth; oauth = real token stored locally */
  syncMode?: 'demo' | 'oauth'
}

export interface OAuthSettings {
  googleClientId: string
  microsoftClientId: string
  yahooClientId: string
}

export interface Note {
  id: string
  title: string
  content: string
  folderId: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  /** System folders are auto-populated (e.g. Email Files) */
  isSystem?: boolean
}

/** User-uploaded file stored in a vault folder */
export interface VaultFile {
  id: string
  folderId: string
  filename: string
  sizeBytes: number
  mimeType: string
  uploadedAt: string
  /** Base64 data URL for demo persistence (small files only) */
  dataUrl?: string
}

export interface EmailAttachment {
  id: string
  emailId: string
  accountId: string
  filename: string
  sizeBytes: number
  mimeType: string
  date: string
}

export const EMAIL_FILES_FOLDER_ID = 'email-files'

export interface Email {
  id: string
  accountId: string
  from: string
  fromName: string
  to: string
  subject: string
  body: string
  preview: string
  date: string
  read: boolean
  starred: boolean
  linkedNoteId: string | null
  attachmentIds?: string[]
  folder?: EmailFolder
  acknowledgements?: EmailAcknowledgement[]
  snoozedUntil?: string
}

/** AI Inbox classification for non-important mail */
export type EmailJunkCategory =
  | 'important'
  | 'marketing'
  | 'newsletter'
  | 'spam'
  | 'phishing'
  | 'promotional'
  | 'social'
  | 'automated'

export interface EmailInboxClassification {
  category: EmailJunkCategory
  important: boolean
  confidence: number
  reason: string
}

export interface EmailInboxTraining {
  /** Senders always treated as important (email or from address) */
  importantSenders: string[]
  /** Senders always hidden */
  junkSenders: string[]
  importantDomains: string[]
  junkDomains: string[]
  /** Subject/body keywords that boost importance */
  importantKeywords: string[]
  /** Subject/body keywords that signal junk */
  junkKeywords: string[]
}

export interface EmailInboxOverride {
  verdict: 'important' | 'junk'
  category?: EmailJunkCategory
  trainedAt: string
}

export interface ComposeDraft {
  id?: string
  to: string
  subject: string
  body: string
  accountId: string
}

export interface GraphNode {
  id: string
  label: string
  type: 'note' | 'email' | 'person' | 'tag'
  x?: number
  y?: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'links_to' | 'references' | 'tagged' | 'from'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  mode: 'vault' | 'external'
  timestamp: string
}

export interface AISettings {
  externalApiKey: string
  externalProvider: 'openai' | 'anthropic' | 'google'
  bridgeEnabled: boolean
}

export interface WeatherSettings {
  /** Fallback city when geolocation is off or denied */
  fallbackCity: string
  useGeolocation: boolean
}

export type AIAlertSeverity = 'info' | 'warning' | 'urgent'

export type AIAlertCategory = 'email' | 'calendar' | 'todo' | 'vault' | 'account'

export interface AIAlert {
  id: string
  title: string
  message: string
  severity: AIAlertSeverity
  category: AIAlertCategory
  actionView?: View
  sourceId?: string
  /** Optional secondary action (e.g. "Prep brief") */
  secondaryActionLabel?: string
  secondaryActionQuery?: string
  createdAt: string
  read: boolean
}

export interface AlertMeta {
  read?: boolean
  dismissed?: boolean
  snoozedUntil?: string
}

export type AssistantPersonality = 'professional' | 'friendly' | 'concise' | 'warm'

export interface AssistantSettings {
  /** Name the assistant uses when speaking proactively */
  userName: string
  voiceURI: string
  voiceRate: number
  voicePitch: number
  personality: AssistantPersonality
  /** Speak new-email and meeting reminders while using the app */
  proactiveEnabled: boolean
  /** Enable microphone voice chat in AI Assistant */
  voiceChatEnabled: boolean
  meetingReminderMinutes: number
  announceNewEmails: boolean
}

export interface SearchResult {
  id: string
  type: 'note' | 'email' | 'calendar' | 'view'
  title: string
  subtitle?: string
  view?: View
  sourceId?: string
}

export interface CommandItem {
  id: string
  label: string
  description?: string
  category: string
  action: () => void
}
