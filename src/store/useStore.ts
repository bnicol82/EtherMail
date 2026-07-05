import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SEED_ACCOUNTS,
  SEED_EMAILS,
  SEED_FOLDERS,
  SEED_NOTES,
} from '../data/seed'
import type {
  AISettings,
  ChatMessage,
  ComposeDraft,
  E2eeSettings,
  Email,
  Note,
  View,
} from '../types'
import {
  encryptForRecipients,
  generateKeypair,
  lockE2eeSession,
  readPublicKeyFingerprint,
  unlockPrivateKey,
} from '../lib/e2ee/pgpMail'

interface NexusState {
  view: View
  setView: (view: View) => void

  notes: Note[]
  folders: typeof SEED_FOLDERS
  emails: Email[]
  accounts: typeof SEED_ACCOUNTS

  activeNoteId: string | null
  activeEmailId: string | null
  activeFolderId: string

  editorMode: 'edit' | 'preview' | 'split'
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void

  searchQuery: string
  setSearchQuery: (q: string) => void

  commandOpen: boolean
  setCommandOpen: (open: boolean) => void

  aiSettings: AISettings
  setAISettings: (settings: Partial<AISettings>) => void

  chatMessages: ChatMessage[]
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearChat: () => void

  aiMode: 'vault' | 'external'
  setAiMode: (mode: 'vault' | 'external') => void

  selectNote: (id: string | null) => void
  selectEmail: (id: string | null) => void
  selectFolder: (id: string) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  createNote: (folderId?: string) => string
  linkEmailToNote: (emailId: string, noteId: string | null) => void
  markEmailRead: (emailId: string) => void

  composeDraft: ComposeDraft | null
  openCompose: (initial?: Partial<ComposeDraft>) => void
  closeCompose: () => void
  sendComposedEmail: (draft: ComposeDraft) => Promise<{ ok: boolean; error?: string }>

  e2ee: E2eeSettings
  e2eeUnlocked: boolean
  setE2eeEnabled: (enabled: boolean) => void
  generateE2eeKeys: (email: string, passphrase: string) => Promise<{ ok: boolean; error?: string }>
  unlockE2ee: (passphrase: string) => Promise<{ ok: boolean; error?: string }>
  lockE2ee: () => void
  addRecipientPublicKey: (email: string, publicKeyArmored: string) => Promise<{ ok: boolean; error?: string }>
  removeRecipientPublicKey: (email: string) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  mobilePanel: 'nav' | 'list' | 'detail'
  setMobilePanel: (panel: 'nav' | 'list' | 'detail') => void
}

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      view: 'dashboard',
      setView: (view) => set({ view, mobilePanel: 'list' }),

      notes: SEED_NOTES,
      folders: SEED_FOLDERS,
      emails: SEED_EMAILS,
      accounts: SEED_ACCOUNTS,

      activeNoteId: 'note-research',
      activeEmailId: 'email-1',
      activeFolderId: 'athena',

      editorMode: 'split',
      setEditorMode: (editorMode) => set({ editorMode }),

      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      commandOpen: false,
      setCommandOpen: (commandOpen) => set({ commandOpen }),

      aiSettings: {
        externalApiKey: '',
        externalProvider: 'openai',
        bridgeEnabled: false,
      },
      setAISettings: (settings) =>
        set((s) => ({ aiSettings: { ...s.aiSettings, ...settings } })),

      chatMessages: [],
      addChatMessage: (msg) =>
        set((s) => ({
          chatMessages: [
            ...s.chatMessages,
            {
              ...msg,
              id: `msg-${Date.now()}`,
              timestamp: new Date().toISOString(),
            },
          ],
        })),
      clearChat: () => set({ chatMessages: [] }),

      aiMode: 'vault',
      setAiMode: (aiMode) => set({ aiMode }),

      selectNote: (id) =>
        set({ activeNoteId: id, view: 'vault', mobilePanel: 'detail' }),
      selectEmail: (id) =>
        set({ activeEmailId: id, mobilePanel: 'detail' }),
      selectFolder: (activeFolderId) => set({ activeFolderId }),
      updateNote: (id, updates) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, ...updates, updatedAt: new Date().toISOString() }
              : n,
          ),
        })),
      createNote: (folderId) => {
        const id = `note-${Date.now()}`
        const folder = folderId ?? get().activeFolderId
        const note: Note = {
          id,
          title: 'Untitled Note',
          content: '# Untitled Note\n\nStart writing...',
          folderId: folder,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          notes: [...s.notes, note],
          activeNoteId: id,
          view: 'vault',
          mobilePanel: 'detail',
        }))
        return id
      },
      linkEmailToNote: (emailId, noteId) =>
        set((s) => ({
          emails: s.emails.map((e) =>
            e.id === emailId ? { ...e, linkedNoteId: noteId } : e,
          ),
        })),
      markEmailRead: (emailId) =>
        set((s) => ({
          emails: s.emails.map((e) =>
            e.id === emailId ? { ...e, read: true } : e,
          ),
        })),

      composeDraft: null,
      openCompose: (initial) =>
        set({
          composeDraft: {
            to: initial?.to ?? '',
            subject: initial?.subject ?? '',
            body: initial?.body ?? '',
            encrypt: initial?.encrypt ?? get().e2ee.enabled,
          },
        }),
      closeCompose: () => set({ composeDraft: null }),

      sendComposedEmail: async (draft) => {
        const state = get()
        const account = state.accounts.find((a) => a.connected) ?? state.accounts[0]
        if (!account) return { ok: false, error: 'No email account configured.' }

        const toMatch = draft.to.match(/[\w.+-]+@[\w.-]+\.\w+/)
        const toEmail = toMatch?.[0].toLowerCase()
        if (!toEmail) return { ok: false, error: 'Enter a valid recipient email.' }

        let body = draft.body
        let encrypted = false
        let encryptedFor: string[] | undefined

        if (draft.encrypt) {
          if (!state.e2eeUnlocked || !state.e2ee.privateKeyArmored) {
            return { ok: false, error: 'Unlock your E2EE keys in Settings before sending encrypted mail.' }
          }

          const recipientKeys: string[] = []
          const recipient = state.e2ee.recipientKeys.find((k) => k.email === toEmail)
          if (recipient) recipientKeys.push(recipient.publicKeyArmored)
          if (state.e2ee.keyEmail?.toLowerCase() === toEmail && state.e2ee.publicKeyArmored) {
            if (!recipientKeys.includes(state.e2ee.publicKeyArmored)) {
              recipientKeys.push(state.e2ee.publicKeyArmored)
            }
          }

          if (recipientKeys.length === 0) {
            return {
              ok: false,
              error: `No public key for ${toEmail}. Add their key in Settings → End-to-end encryption.`,
            }
          }

          try {
            body = await encryptForRecipients(draft.body, recipientKeys)
            encrypted = true
            encryptedFor = [toEmail]
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : 'Encryption failed',
            }
          }
        }

        const id = `email-${Date.now()}`
        const email: Email = {
          id,
          accountId: account.id,
          from: account.email,
          fromName: account.email.split('@')[0],
          to: draft.to,
          subject: draft.subject || '(no subject)',
          body,
          preview: encrypted ? 'Encrypted message' : draft.body.slice(0, 120),
          date: new Date().toISOString(),
          read: true,
          starred: false,
          linkedNoteId: null,
          encrypted,
          encryptedFor,
        }

        set((s) => ({
          emails: [email, ...s.emails],
          composeDraft: null,
          view: 'email',
          activeEmailId: id,
          mobilePanel: 'detail',
        }))
        return { ok: true }
      },

      e2ee: {
        enabled: true,
        keyEmail: null,
        publicKeyArmored: null,
        privateKeyArmored: null,
        fingerprint: null,
        recipientKeys: [],
      },
      e2eeUnlocked: false,
      setE2eeEnabled: (enabled) =>
        set((s) => ({ e2ee: { ...s.e2ee, enabled } })),

      generateE2eeKeys: async (email, passphrase) => {
        if (!email.trim() || passphrase.length < 8) {
          return { ok: false, error: 'Use a valid email and passphrase (8+ characters).' }
        }
        try {
          const keys = await generateKeypair(email.trim(), passphrase)
          lockE2eeSession()
          await unlockPrivateKey(keys.privateKeyArmored, passphrase)
          set({
            e2ee: {
              enabled: true,
              keyEmail: email.trim().toLowerCase(),
              publicKeyArmored: keys.publicKeyArmored,
              privateKeyArmored: keys.privateKeyArmored,
              fingerprint: keys.fingerprint,
              recipientKeys: get().e2ee.recipientKeys,
            },
            e2eeUnlocked: true,
          })
          return { ok: true }
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Key generation failed' }
        }
      },

      unlockE2ee: async (passphrase) => {
        const { privateKeyArmored } = get().e2ee
        if (!privateKeyArmored) {
          return { ok: false, error: 'Generate encryption keys first.' }
        }
        try {
          await unlockPrivateKey(privateKeyArmored, passphrase)
          set({ e2eeUnlocked: true })
          return { ok: true }
        } catch {
          return { ok: false, error: 'Incorrect passphrase.' }
        }
      },

      lockE2ee: () => {
        lockE2eeSession()
        set({ e2eeUnlocked: false })
      },

      addRecipientPublicKey: async (email, publicKeyArmored) => {
        const normalized = email.trim().toLowerCase()
        if (!normalized) return { ok: false, error: 'Email required.' }
        try {
          const fingerprint = await readPublicKeyFingerprint(publicKeyArmored.trim())
          set((s) => ({
            e2ee: {
              ...s.e2ee,
              recipientKeys: [
                ...s.e2ee.recipientKeys.filter((k) => k.email !== normalized),
                { email: normalized, publicKeyArmored: publicKeyArmored.trim(), fingerprint },
              ],
            },
          }))
          return { ok: true }
        } catch {
          return { ok: false, error: 'Invalid OpenPGP public key.' }
        }
      },

      removeRecipientPublicKey: (email) =>
        set((s) => ({
          e2ee: {
            ...s.e2ee,
            recipientKeys: s.e2ee.recipientKeys.filter(
              (k) => k.email !== email.toLowerCase(),
            ),
          },
        })),

      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      mobilePanel: 'list',
      setMobilePanel: (mobilePanel) => set({ mobilePanel }),
    }),
    {
      name: 'nexus-core-v1',
      migrate: (persisted) => {
        const state = persisted as { view?: string; e2ee?: Partial<E2eeSettings> }
        if (state.view === 'graph') state.view = 'dashboard'
        if (!state.e2ee) {
          state.e2ee = {
            enabled: true,
            keyEmail: null,
            publicKeyArmored: null,
            privateKeyArmored: null,
            fingerprint: null,
            recipientKeys: [],
          }
        } else if (!state.e2ee.recipientKeys) {
          state.e2ee.recipientKeys = []
        }
        return persisted
      },
      partialize: (s) => ({
        notes: s.notes,
        emails: s.emails,
        e2ee: {
          enabled: s.e2ee.enabled,
          keyEmail: s.e2ee.keyEmail,
          publicKeyArmored: s.e2ee.publicKeyArmored,
          privateKeyArmored: s.e2ee.privateKeyArmored,
          fingerprint: s.e2ee.fingerprint,
          recipientKeys: s.e2ee.recipientKeys,
        },
        aiSettings: {
          ...s.aiSettings,
          externalApiKey: '',
        },
        chatMessages: s.chatMessages.slice(-50),
        activeNoteId: s.activeNoteId,
        activeEmailId: s.activeEmailId,
        view: s.view,
      }),
    },
  ),
)
