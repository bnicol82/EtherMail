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
  createdAt: string
  read: boolean
}

export interface AlertMeta {
  read?: boolean
  dismissed?: boolean
}

export interface CommandItem {
  id: string
  label: string
  description?: string
  category: string
  action: () => void
}
