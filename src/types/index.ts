export type View = 'dashboard' | 'vault' | 'email' | 'ai' | 'settings'

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'enterprise'

export interface EmailAccount {
  id: string
  email: string
  provider: EmailProvider
  connected: boolean
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
}

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
  /** OpenPGP-encrypted body (armored). Plaintext lives only after client decrypt. */
  encrypted?: boolean
  /** Outbound messages encrypted for these addresses. */
  encryptedFor?: string[]
}

export interface RecipientPublicKey {
  email: string
  publicKeyArmored: string
  fingerprint?: string
}

export interface E2eeSettings {
  /** Encrypt outgoing mail by default when recipient keys exist. */
  enabled: boolean
  keyEmail: string | null
  publicKeyArmored: string | null
  /** Passphrase-protected private key (never store passphrase). */
  privateKeyArmored: string | null
  fingerprint: string | null
  recipientKeys: RecipientPublicKey[]
}

export interface ComposeDraft {
  to: string
  subject: string
  body: string
  encrypt: boolean
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

export interface CommandItem {
  id: string
  label: string
  description?: string
  category: string
  action: () => void
}
