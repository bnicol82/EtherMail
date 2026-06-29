import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SEED_ACCOUNTS,
  SEED_ATTACHMENTS,
  SEED_CALENDAR,
  SEED_EMAILS,
  SEED_FOLDERS,
  SEED_NOTES,
  buildGraphFromData,
  getDemoEmailsForAccount,
} from '../data/seed'
import type {
  AISettings,
  AckStatus,
  AlertMeta,
  AssistantSettings,
  CalendarEvent,
  ChatMessage,
  ComposeDraft,
  Email,
  EmailAcknowledgement,
  EmailAttachment,
  EmailFolder,
  EmailInboxOverride,
  EmailInboxTraining,
  EmailJunkCategory,
  Note,
  OAuthSettings,
  Theme,
  VaultFile,
  View,
  WeatherSettings,
} from '../types'
import { EMAIL_FILES_FOLDER_ID } from '../types'
import { formatCalendarInviteBody, formatForwardInviteSubject } from '../lib/calendarInvite'
import {
  buildForwardDraft,
  buildReplyAllDraft,
  buildReplyDraft,
} from '../lib/emailCompose'
import { computeAIAlerts } from '../lib/aiAlerts'
import { generateVaultAIResponse, generateExternalAIResponse } from '../lib/rag'
import { syncCalendarFromEmails } from '../lib/calendarSync'
import { completeNoteTodo } from '../lib/todos'
import { snoozeUntilFromPreset } from '../lib/snooze'
import { DEFAULT_INBOX_TRAINING, getOutboxEmails } from '../lib/aiInbox'
import { generateMeetingBrief } from '../lib/meetingPrep'
import { findFreeSlots, formatProposalEmail } from '../lib/smartPropose'

function uniquePush(arr: string[], value: string): string[] {
  const v = value.toLowerCase()
  if (arr.some((x) => x.toLowerCase() === v)) return arr
  return [...arr, value]
}

function domainFromAddress(email: string): string {
  const at = email.lastIndexOf('@')
  return at >= 0 ? email.slice(at + 1) : email
}

interface EtherMailState {
  view: View
  setView: (view: View) => void

  theme: Theme
  setTheme: (theme: Theme) => void

  notes: Note[]
  folders: typeof SEED_FOLDERS
  emails: Email[]
  emailAttachments: EmailAttachment[]
  vaultFiles: VaultFile[]
  accounts: typeof SEED_ACCOUNTS
  calendarEvents: typeof SEED_CALENDAR

  activeNoteId: string | null
  activeEmailId: string | null
  activeAttachmentId: string | null
  activeVaultFileId: string | null
  activeFolderId: string
  activeAccountId: string | null
  activeEmailFolder: EmailFolder

  editorMode: 'edit' | 'preview' | 'split'
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void

  searchQuery: string
  setSearchQuery: (q: string) => void

  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  assistantSettings: AssistantSettings
  setAssistantSettings: (settings: Partial<AssistantSettings>) => void
  announcedProactive: Record<string, string>
  markProactiveAnnounced: (key: string) => void

  completedTodos: string[]
  completeTodo: (todoId: string) => void

  aiAssistantOpen: boolean
  setAiAssistantOpen: (open: boolean) => void

  aiLoading: boolean
  aiContextResponse: string | null
  submitAiQuery: (query: string, contextPrefix?: string, opts?: { eventId?: string }) => Promise<void>
  clearAiContextResponse: () => void
  openMeetingPrepBrief: (eventId: string) => Promise<void>
  smartProposeMeetingTimes: (eventId?: string) => void

  aiSettings: AISettings
  setAISettings: (settings: Partial<AISettings>) => void

  weatherSettings: WeatherSettings
  setWeatherSettings: (settings: Partial<WeatherSettings>) => void

  chatMessages: ChatMessage[]
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearChat: () => void

  aiMode: 'vault' | 'external'
  setAiMode: (mode: 'vault' | 'external') => void

  selectNote: (id: string | null, opts?: { view?: 'vault' | 'notes' }) => void
  selectEmail: (id: string | null) => void
  selectAttachment: (id: string | null) => void
  selectFolder: (id: string) => void
  selectAccount: (accountId: string | null) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  createNote: (folderId?: string) => string
  createFolder: (name: string, parentId?: string) => string
  uploadVaultFile: (file: File, folderId: string) => Promise<void>
  selectVaultFile: (id: string | null) => void
  linkEmailToNote: (emailId: string, noteId: string | null) => void
  markEmailRead: (emailId: string) => void
  markEmailUnread: (emailId: string) => void
  setActiveEmailFolder: (folder: EmailFolder) => void
  deleteEmail: (emailId: string) => void
  archiveEmail: (emailId: string) => void
  toggleEmailStar: (emailId: string) => void

  composeDraft: ComposeDraft | null
  openCompose: (
    initial?: Partial<ComposeDraft> & {
      replyTo?: Email
      replyAllTo?: Email
      forwardEmail?: Email
    },
  ) => void
  closeCompose: () => void
  sendComposedEmail: (draft: ComposeDraft) => void
  saveComposeDraft: (draft: ComposeDraft) => void

  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void
  forwardCalendarInvite: (eventId: string) => void
  editingEventId: string | null
  setEditingEventId: (id: string | null) => void

  sendQuickAck: (
    emailId: string,
    ack: { status: AckStatus; label: string; message?: string; emoji?: string },
  ) => void

  alertMeta: Record<string, AlertMeta>
  markAlertRead: (id: string) => void
  dismissAlert: (id: string) => void
  snoozeAlert: (id: string, presetId: string) => void
  markAllAlertsRead: () => void
  snoozeEmail: (emailId: string, presetId: string) => void

  aiInboxEnabled: boolean
  setAiInboxEnabled: (enabled: boolean) => void
  aiOutboxEnabled: boolean
  setAiOutboxEnabled: (enabled: boolean) => void
  deleteAllOutboxEmails: () => void
  inboxTraining: EmailInboxTraining
  emailInboxOverrides: Record<string, EmailInboxOverride>
  trainEmailImportant: (emailId: string) => void
  trainEmailJunk: (emailId: string, category: EmailJunkCategory) => void
  clearInboxTraining: () => void

  selectedEmailIds: string[]
  emailSelectionMode: boolean
  followUpFilterEnabled: boolean
  setEmailSelectionMode: (enabled: boolean) => void
  setFollowUpFilterEnabled: (enabled: boolean) => void
  toggleEmailSelection: (emailId: string) => void
  selectAllVisibleEmails: (emailIds: string[]) => void
  clearEmailSelection: () => void
  batchArchiveEmails: (emailIds: string[]) => void
  batchDeleteEmails: (emailIds: string[]) => void
  batchStarEmails: (emailIds: string[], starred: boolean) => void
  batchMarkEmailsRead: (emailIds: string[], read: boolean) => void

  hiddenPanels: Record<string, boolean>
  togglePanelHidden: (panelId: string) => void

  oauthSettings: OAuthSettings
  setOAuthSettings: (settings: Partial<OAuthSettings>) => void
  connectingAccountId: string | null
  setConnectingAccountId: (id: string | null) => void
  startConnectAccount: (accountId: string) => void
  finishConnectAccount: (accountId: string, syncMode: 'demo' | 'oauth') => void
  disconnectAccount: (accountId: string) => void
  completeOAuthConnect: (accountId: string) => void

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  mobilePanel: 'nav' | 'list' | 'detail'
  setMobilePanel: (panel: 'nav' | 'list' | 'detail') => void
}

export const useEtherMailStore = create<EtherMailState>()(
  persist(
    (set, get) => ({
      view: 'dashboard',
      setView: (view) => set({ view, mobilePanel: 'list' }),

      theme: 'glass',
      setTheme: (theme) => set({ theme }),

      notes: SEED_NOTES,
      folders: SEED_FOLDERS,
      emails: SEED_EMAILS,
      emailAttachments: SEED_ATTACHMENTS,
      vaultFiles: [],
      accounts: SEED_ACCOUNTS,
      calendarEvents: SEED_CALENDAR,

      activeNoteId: 'note-research',
      activeEmailId: 'email-1',
      activeAttachmentId: null,
      activeVaultFileId: null,
      activeFolderId: 'athena',
      activeAccountId: null,
      activeEmailFolder: 'inbox',

      editorMode: 'split',
      setEditorMode: (editorMode) => set({ editorMode }),

      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),

      assistantSettings: {
        userName: 'Billy',
        voiceURI: '',
        voiceRate: 1,
        voicePitch: 1,
        personality: 'friendly',
        proactiveEnabled: true,
        voiceChatEnabled: true,
        meetingReminderMinutes: 10,
        announceNewEmails: true,
      },
      setAssistantSettings: (settings) =>
        set((s) => ({ assistantSettings: { ...s.assistantSettings, ...settings } })),
      announcedProactive: {},
      markProactiveAnnounced: (key) =>
        set((s) => ({
          announcedProactive: { ...s.announcedProactive, [key]: new Date().toISOString() },
        })),

      completedTodos: [],
      completeTodo: (todoId) => {
        const state = get()
        if (state.completedTodos.includes(todoId)) return

        if (todoId.startsWith('note:')) {
          const [, noteId, lineStr] = todoId.split(':')
          const lineIndex = parseInt(lineStr, 10)
          const note = state.notes.find((n) => n.id === noteId)
          if (note && !Number.isNaN(lineIndex)) {
            const content = completeNoteTodo(note, lineIndex)
            get().updateNote(noteId, { content })
          }
        } else if (todoId.startsWith('email-')) {
          const emailId = todoId.replace('email-', '')
          get().markEmailRead(emailId)
        }

        set((s) => ({ completedTodos: [...s.completedTodos, todoId] }))
      },

      aiAssistantOpen: false,
      setAiAssistantOpen: (aiAssistantOpen) => set({ aiAssistantOpen }),

      aiLoading: false,
      aiContextResponse: null,
      submitAiQuery: async (query, contextPrefix = '', opts) => {
        const state = get()
        const mode = state.aiMode
        set({ aiLoading: true })
        state.addChatMessage({ role: 'user', content: query, mode })
        const fullQuery = contextPrefix ? `${contextPrefix}${query}` : query

        const reply =
          mode === 'vault'
            ? await generateVaultAIResponse(fullQuery, state.notes, state.emails, {
                calendarEvents: state.calendarEvents,
                eventId: opts?.eventId,
              })
            : await generateExternalAIResponse(
                fullQuery,
                state.aiSettings.externalApiKey,
                state.aiSettings.externalProvider,
                state.aiSettings.bridgeEnabled,
                state.aiSettings.bridgeEnabled ? state.notes : [],
                state.aiSettings.bridgeEnabled ? state.emails : [],
                state.aiSettings.bridgeEnabled ? state.calendarEvents : [],
              )

        state.addChatMessage({ role: 'assistant', content: reply, mode })
        set({ aiLoading: false, aiContextResponse: reply, aiAssistantOpen: true })
      },
      clearAiContextResponse: () => set({ aiContextResponse: null, aiAssistantOpen: false }),

      openMeetingPrepBrief: async (eventId) => {
        const state = get()
        const event = state.calendarEvents.find((e) => e.id === eventId)
        if (!event) return
        const brief = generateMeetingBrief(event, state.notes, state.emails)
        set({ aiLoading: true, view: 'ai' })
        state.addChatMessage({ role: 'user', content: `Prep brief for ${event.title}`, mode: 'vault' })
        state.addChatMessage({ role: 'assistant', content: brief.markdown, mode: 'vault' })
        set({ aiLoading: false, aiContextResponse: brief.markdown, aiAssistantOpen: true })
      },

      smartProposeMeetingTimes: (eventId) => {
        const state = get()
        const event = eventId ? state.calendarEvents.find((e) => e.id === eventId) : undefined
        const topic = event?.title ?? 'our meeting'
        const slots = findFreeSlots(state.calendarEvents, 60, 3)
        const proposal = formatProposalEmail(slots, topic, event?.attendees)
        const account =
          state.accounts.find((a) => a.connected) ?? state.accounts[0]
        state.openCompose({
          to: event?.attendees?.join(', ') ?? '',
          subject: proposal.subject,
          body: proposal.body,
          accountId: account?.id ?? '',
        })
      },

      aiSettings: {
        externalApiKey: '',
        externalProvider: 'openai',
        bridgeEnabled: false,
      },
      setAISettings: (settings) =>
        set((s) => ({ aiSettings: { ...s.aiSettings, ...settings } })),

      weatherSettings: {
        fallbackCity: 'San Francisco',
        useGeolocation: true,
      },
      setWeatherSettings: (settings) =>
        set((s) => ({ weatherSettings: { ...s.weatherSettings, ...settings } })),

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

      selectNote: (id, opts) => {
        const current = get().view
        const nextView = opts?.view ?? (current === 'notes' ? 'notes' : 'vault')
        set({
          activeNoteId: id,
          activeAttachmentId: null,
          activeVaultFileId: null,
          view: nextView,
          mobilePanel: 'detail',
        })
      },
      selectEmail: (id) =>
        set({ activeEmailId: id, view: 'email', mobilePanel: 'detail' }),
      selectAttachment: (id) =>
        set({
          activeAttachmentId: id,
          activeNoteId: null,
          activeVaultFileId: null,
          view: 'vault',
          mobilePanel: 'detail',
        }),
      selectVaultFile: (id) =>
        set({
          activeVaultFileId: id,
          activeNoteId: null,
          activeAttachmentId: null,
          view: 'vault',
          mobilePanel: 'detail',
        }),
      selectFolder: (activeFolderId) => {
        const state = get()
        if (activeFolderId === 'email-files') {
          const first = state.emailAttachments[0]
          set({
            activeFolderId,
            activeNoteId: null,
            activeVaultFileId: null,
            activeAttachmentId: state.activeAttachmentId ?? first?.id ?? null,
            view: 'vault',
          })
        } else {
          set({ activeFolderId, activeAttachmentId: null, activeVaultFileId: null })
        }
      },
      selectAccount: (activeAccountId) =>
        set({ activeAccountId, view: 'email', mobilePanel: 'list' }),
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
        let folder = folderId ?? get().activeFolderId
        if (folder === EMAIL_FILES_FOLDER_ID) folder = 'athena'
        const note: Note = {
          id,
          title: 'Untitled Note',
          content: '# Untitled Note\n\nStart writing...',
          folderId: folder,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const view = get().view === 'notes' ? 'notes' : 'vault'
        set((s) => ({
          notes: [...s.notes, note],
          activeNoteId: id,
          activeVaultFileId: null,
          view,
          mobilePanel: 'detail',
        }))
        return id
      },

      createFolder: (name, parentId) => {
        const parent = parentId ?? get().activeFolderId
        if (parent === EMAIL_FILES_FOLDER_ID) return ''
        const trimmed = name.trim()
        if (!trimmed) return ''
        const id = `folder-${Date.now()}`
        set((s) => ({
          folders: [...s.folders, { id, name: trimmed, parentId: parent }],
          activeFolderId: id,
        }))
        return id
      },

      uploadVaultFile: async (file, folderId) => {
        if (folderId === EMAIL_FILES_FOLDER_ID) return
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('read failed'))
          reader.readAsDataURL(file)
        })
        const id = `vfile-${Date.now()}`
        const entry: VaultFile = {
          id,
          folderId,
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          dataUrl,
        }
        set((s) => ({
          vaultFiles: [...s.vaultFiles, entry],
          activeVaultFileId: id,
          activeNoteId: null,
          activeAttachmentId: null,
          view: 'vault',
          mobilePanel: 'detail',
        }))
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
      markEmailUnread: (emailId) =>
        set((s) => ({
          emails: s.emails.map((e) =>
            e.id === emailId ? { ...e, read: false } : e,
          ),
        })),

      setActiveEmailFolder: (activeEmailFolder) =>
        set({ activeEmailFolder, mobilePanel: 'list' }),

      deleteEmail: (emailId) => {
        const state = get()
        const email = state.emails.find((e) => e.id === emailId)
        if (!email) return
        const folder = email.folder ?? 'inbox'
        if (folder === 'trash') {
          set({
            emails: state.emails.filter((e) => e.id !== emailId),
            activeEmailId: state.activeEmailId === emailId ? null : state.activeEmailId,
          })
        } else {
          set({
            emails: state.emails.map((e) =>
              e.id === emailId ? { ...e, folder: 'trash' as EmailFolder } : e,
            ),
            activeEmailId: state.activeEmailId === emailId ? null : state.activeEmailId,
          })
        }
      },

      archiveEmail: (emailId) =>
        set((s) => ({
          emails: s.emails.map((e) =>
            e.id === emailId ? { ...e, folder: 'archive' as EmailFolder } : e,
          ),
        })),

      toggleEmailStar: (emailId) =>
        set((s) => ({
          emails: s.emails.map((e) =>
            e.id === emailId ? { ...e, starred: !e.starred } : e,
          ),
        })),

      composeDraft: null,

      openCompose: (initial) => {
        const state = get()
        const connected = state.accounts.filter((a) => a.connected)
        const defaultAccount =
          (state.activeAccountId && connected.find((a) => a.id === state.activeAccountId)?.id) ||
          connected[0]?.id ||
          state.accounts[0]?.id ||
          ''

        let to = initial?.to ?? ''
        let cc = initial?.cc ?? ''
        let bcc = initial?.bcc ?? ''
        let subject = initial?.subject ?? ''
        let body = initial?.body ?? ''

        if (initial?.replyTo) {
          const draft = buildReplyDraft(initial.replyTo)
          to = draft.to
          subject = draft.subject
          body = draft.body
        }

        if (initial?.replyAllTo) {
          const draft = buildReplyAllDraft(initial.replyAllTo, state.accounts)
          to = draft.to
          cc = draft.cc ?? ''
          subject = draft.subject
          body = draft.body
        }

        if (initial?.forwardEmail) {
          const draft = buildForwardDraft(initial.forwardEmail)
          subject = draft.subject
          body = draft.body
        }

        set({
          composeDraft: {
            id: initial?.id,
            to,
            cc: cc || undefined,
            bcc: bcc || undefined,
            subject,
            body,
            accountId: initial?.accountId ?? defaultAccount,
          },
          view: 'email',
          mobilePanel: 'list',
        })
      },

      closeCompose: () => set({ composeDraft: null }),

      sendComposedEmail: (draft) => {
        const state = get()
        const account = state.accounts.find((a) => a.id === draft.accountId)
        const now = new Date().toISOString()
        const preview = draft.body.trim().slice(0, 120) || '(no content)'

        if (draft.id) {
          set({
            emails: state.emails.map((e) =>
              e.id === draft.id
                ? {
                    ...e,
                    to: draft.to,
                    cc: draft.cc,
                    bcc: draft.bcc,
                    subject: draft.subject,
                    body: draft.body,
                    preview,
                    date: now,
                    folder: 'sent' as EmailFolder,
                    read: true,
                  }
                : e,
            ),
            activeEmailId: draft.id,
            activeEmailFolder: 'sent',
            composeDraft: null,
            mobilePanel: 'detail',
          })
          return
        }

        const id = `email-${Date.now()}`
        const email: Email = {
          id,
          accountId: draft.accountId,
          from: account?.email ?? 'you@example.com',
          fromName: 'Me',
          to: draft.to,
          cc: draft.cc,
          bcc: draft.bcc,
          subject: draft.subject || '(no subject)',
          body: draft.body,
          preview,
          date: now,
          read: true,
          starred: false,
          linkedNoteId: null,
          folder: 'sent',
        }
        set({
          emails: [...state.emails, email],
          activeEmailId: id,
          activeEmailFolder: 'sent',
          composeDraft: null,
          mobilePanel: 'detail',
        })
      },

      saveComposeDraft: (draft) => {
        const state = get()
        const account = state.accounts.find((a) => a.id === draft.accountId)
        const now = new Date().toISOString()
        const preview = draft.body.trim().slice(0, 120) || '(draft)'

        if (draft.id) {
          set({
            emails: state.emails.map((e) =>
              e.id === draft.id
                ? {
                    ...e,
                    to: draft.to,
                    cc: draft.cc,
                    bcc: draft.bcc,
                    subject: draft.subject,
                    body: draft.body,
                    preview,
                    date: now,
                    folder: 'drafts' as EmailFolder,
                  }
                : e,
            ),
            activeEmailId: draft.id,
            activeEmailFolder: 'drafts',
            composeDraft: null,
            mobilePanel: 'detail',
          })
          return
        }

        const id = `draft-${Date.now()}`
        const email: Email = {
          id,
          accountId: draft.accountId,
          from: account?.email ?? 'you@example.com',
          fromName: 'Me',
          to: draft.to,
          cc: draft.cc,
          bcc: draft.bcc,
          subject: draft.subject || '(no subject)',
          body: draft.body,
          preview,
          date: now,
          read: true,
          starred: false,
          linkedNoteId: null,
          folder: 'drafts',
        }
        set({
          emails: [...state.emails, email],
          activeEmailId: id,
          activeEmailFolder: 'drafts',
          composeDraft: null,
          mobilePanel: 'detail',
        })
      },

      editingEventId: null,
      setEditingEventId: (editingEventId) => set({ editingEventId }),

      updateCalendarEvent: (id, updates) =>
        set((s) => ({
          calendarEvents: s.calendarEvents.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
        })),

      forwardCalendarInvite: (eventId) => {
        const event = get().calendarEvents.find((e) => e.id === eventId)
        if (!event) return
        get().openCompose({
          subject: formatForwardInviteSubject(event),
          body: formatCalendarInviteBody(event),
        })
      },

      sendQuickAck: (emailId, ack) => {
        const state = get()
        const email = state.emails.find((e) => e.id === emailId)
        if (!email) return

        const account =
          state.accounts.find((a) => a.connected && a.id === email.accountId) ||
          state.accounts.find((a) => a.connected)
        if (!account) return

        const acknowledgement: EmailAcknowledgement = {
          id: `ack-${Date.now()}`,
          fromName: 'Me',
          status: ack.status,
          label: ack.emoji ?? ack.label,
          emoji: ack.emoji,
          timestamp: new Date().toISOString(),
        }

        const replyBody =
          ack.message ??
          (ack.emoji ? ack.emoji : ack.label)

        const now = new Date().toISOString()
        const sentId = `email-${Date.now()}`
        const sentEmail: Email = {
          id: sentId,
          accountId: account.id,
          from: account.email,
          fromName: 'Me',
          to: email.from,
          subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
          body: replyBody,
          preview: replyBody.slice(0, 120),
          date: now,
          read: true,
          starred: false,
          linkedNoteId: null,
          folder: 'sent',
        }

        set({
          emails: state.emails
            .map((e) =>
              e.id === emailId
                ? {
                    ...e,
                    acknowledgements: [...(e.acknowledgements ?? []), acknowledgement],
                    read: true,
                  }
                : e,
            )
            .concat(sentEmail),
        })
      },

      alertMeta: {},
      markAlertRead: (id) =>
        set((s) => ({
          alertMeta: { ...s.alertMeta, [id]: { ...s.alertMeta[id], read: true } },
        })),
      dismissAlert: (id) =>
        set((s) => ({
          alertMeta: { ...s.alertMeta, [id]: { ...s.alertMeta[id], dismissed: true, read: true } },
        })),
      snoozeAlert: (id, presetId) =>
        set((s) => ({
          alertMeta: {
            ...s.alertMeta,
            [id]: { ...s.alertMeta[id], snoozedUntil: snoozeUntilFromPreset(presetId), read: true },
          },
        })),
      markAllAlertsRead: () => {
        const state = get()
        const computed = computeAIAlerts(
          state.notes,
          state.emails,
          state.calendarEvents,
          state.accounts,
        )
        const next = { ...state.alertMeta }
        for (const alert of computed) {
          if (!next[alert.id]?.dismissed) {
            next[alert.id] = { ...next[alert.id], read: true }
          }
        }
        set({ alertMeta: next })
      },

      snoozeEmail: (emailId, presetId) =>
        set((s) => ({
          emails: s.emails.map((e) =>
            e.id === emailId
              ? { ...e, snoozedUntil: snoozeUntilFromPreset(presetId), read: true }
              : e,
          ),
        })),

      aiInboxEnabled: false,
      setAiInboxEnabled: (aiInboxEnabled) =>
        set({ aiInboxEnabled, aiOutboxEnabled: aiInboxEnabled ? false : get().aiOutboxEnabled }),

      aiOutboxEnabled: false,
      setAiOutboxEnabled: (aiOutboxEnabled) =>
        set({ aiOutboxEnabled, aiInboxEnabled: aiOutboxEnabled ? false : get().aiInboxEnabled }),

      deleteAllOutboxEmails: () => {
        const state = get()
        const outboxIds = new Set(
          getOutboxEmails(state.emails, state.inboxTraining, state.emailInboxOverrides).map(
            (e) => e.id,
          ),
        )
        if (outboxIds.size === 0) return
        set({
          emails: state.emails.map((e) =>
            outboxIds.has(e.id) ? { ...e, folder: 'trash' as EmailFolder } : e,
          ),
          activeEmailId:
            state.activeEmailId && outboxIds.has(state.activeEmailId)
              ? null
              : state.activeEmailId,
        })
      },

      inboxTraining: DEFAULT_INBOX_TRAINING,
      emailInboxOverrides: {},

      trainEmailImportant: (emailId) => {
        const state = get()
        const email = state.emails.find((e) => e.id === emailId)
        if (!email) return
        const domain = domainFromAddress(email.from)
        set({
          inboxTraining: {
            ...state.inboxTraining,
            importantSenders: uniquePush(state.inboxTraining.importantSenders, email.from),
            importantDomains: uniquePush(state.inboxTraining.importantDomains, domain),
            junkSenders: state.inboxTraining.junkSenders.filter(
              (s) => s.toLowerCase() !== email.from.toLowerCase(),
            ),
            junkDomains: state.inboxTraining.junkDomains.filter(
              (d) => d.toLowerCase() !== domain.toLowerCase(),
            ),
          },
          emailInboxOverrides: {
            ...state.emailInboxOverrides,
            [emailId]: { verdict: 'important', trainedAt: new Date().toISOString() },
          },
        })
      },

      trainEmailJunk: (emailId, category) => {
        const state = get()
        const email = state.emails.find((e) => e.id === emailId)
        if (!email) return
        const domain = domainFromAddress(email.from)
        set({
          inboxTraining: {
            ...state.inboxTraining,
            junkSenders: uniquePush(state.inboxTraining.junkSenders, email.from),
            junkDomains: uniquePush(state.inboxTraining.junkDomains, domain),
            importantSenders: state.inboxTraining.importantSenders.filter(
              (s) => s.toLowerCase() !== email.from.toLowerCase(),
            ),
            importantDomains: state.inboxTraining.importantDomains.filter(
              (d) => d.toLowerCase() !== domain.toLowerCase(),
            ),
          },
          emailInboxOverrides: {
            ...state.emailInboxOverrides,
            [emailId]: { verdict: 'junk', category, trainedAt: new Date().toISOString() },
          },
        })
      },

      clearInboxTraining: () =>
        set({ inboxTraining: DEFAULT_INBOX_TRAINING, emailInboxOverrides: {} }),

      selectedEmailIds: [],
      emailSelectionMode: false,
      followUpFilterEnabled: false,
      setEmailSelectionMode: (emailSelectionMode) =>
        set({ emailSelectionMode, selectedEmailIds: emailSelectionMode ? get().selectedEmailIds : [] }),
      setFollowUpFilterEnabled: (followUpFilterEnabled) => set({ followUpFilterEnabled }),
      toggleEmailSelection: (emailId) =>
        set((s) => ({
          selectedEmailIds: s.selectedEmailIds.includes(emailId)
            ? s.selectedEmailIds.filter((id) => id !== emailId)
            : [...s.selectedEmailIds, emailId],
        })),
      selectAllVisibleEmails: (emailIds) => set({ selectedEmailIds: emailIds }),
      clearEmailSelection: () => set({ selectedEmailIds: [], emailSelectionMode: false }),
      batchArchiveEmails: (emailIds) => {
        const ids = new Set(emailIds)
        set((s) => ({
          emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, folder: 'archive' as EmailFolder } : e)),
          selectedEmailIds: [],
          emailSelectionMode: false,
          activeEmailId:
            s.activeEmailId && ids.has(s.activeEmailId) ? null : s.activeEmailId,
        }))
      },
      batchDeleteEmails: (emailIds) => {
        const ids = new Set(emailIds)
        set((s) => ({
          emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, folder: 'trash' as EmailFolder } : e)),
          selectedEmailIds: [],
          emailSelectionMode: false,
          activeEmailId:
            s.activeEmailId && ids.has(s.activeEmailId) ? null : s.activeEmailId,
        }))
      },
      batchStarEmails: (emailIds, starred) => {
        const ids = new Set(emailIds)
        set((s) => ({
          emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, starred } : e)),
        }))
      },
      batchMarkEmailsRead: (emailIds, read) => {
        const ids = new Set(emailIds)
        set((s) => ({
          emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, read } : e)),
        }))
      },

      hiddenPanels: {},
      togglePanelHidden: (panelId) =>
        set((s) => ({
          hiddenPanels: {
            ...s.hiddenPanels,
            [panelId]: !s.hiddenPanels[panelId],
          },
        })),

      oauthSettings: {
        googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ?? '',
        microsoftClientId: '',
        yahooClientId: '',
      },
      setOAuthSettings: (settings) =>
        set((s) => ({ oauthSettings: { ...s.oauthSettings, ...settings } })),

      connectingAccountId: null,
      setConnectingAccountId: (connectingAccountId) => set({ connectingAccountId }),

      startConnectAccount: (accountId) => set({ connectingAccountId: accountId }),

      finishConnectAccount: (accountId, syncMode) => {
        const state = get()
        const demoEmails = getDemoEmailsForAccount(accountId)
        const existingIds = new Set(state.emails.map((e) => e.id))
        const newEmails = demoEmails.filter((e) => !existingIds.has(e.id))
        const allEmails = [...state.emails, ...newEmails]

        set({
          accounts: state.accounts.map((a) =>
            a.id === accountId
              ? { ...a, connected: true, connectedAt: new Date().toISOString(), syncMode }
              : a,
          ),
          emails: allEmails,
          calendarEvents: syncCalendarFromEmails(
            allEmails,
            state.emailAttachments,
            state.calendarEvents,
          ),
          connectingAccountId: null,
        })
      },

      completeOAuthConnect: (accountId) => {
        get().finishConnectAccount(accountId, 'oauth')
      },

      disconnectAccount: (accountId) => {
        const state = get()
        const remainingEmails = state.emails.filter((e) => e.accountId !== accountId)
        const connectedIds = new Set(
          state.accounts
            .filter((a) => a.connected && a.id !== accountId)
            .map((a) => a.id),
        )
        const connectedEmails = remainingEmails.filter((e) => connectedIds.has(e.accountId))

        set({
          accounts: state.accounts.map((a) =>
            a.id === accountId
              ? { ...a, connected: false, connectedAt: undefined, syncMode: undefined }
              : a,
          ),
          emails: remainingEmails,
          calendarEvents: syncCalendarFromEmails(
            connectedEmails,
            state.emailAttachments,
            SEED_CALENDAR,
          ),
          activeAccountId:
            state.activeAccountId === accountId ? null : state.activeAccountId,
        })
      },

      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      mobilePanel: 'list',
      setMobilePanel: (mobilePanel) => set({ mobilePanel }),
    }),
    {
      name: 'ethermail-v1',
      version: 5,
      migrate: (persisted, version) => {
        const s = persisted as Record<string, unknown>
        let next = { ...s }
        if (version < 3) {
          next = {
            ...next,
            assistantSettings: {
              userName: 'Billy',
              voiceURI: '',
              voiceRate: 1,
              voicePitch: 1,
              personality: 'friendly',
              proactiveEnabled: true,
              voiceChatEnabled: true,
              meetingReminderMinutes: 10,
              announceNewEmails: true,
            },
            completedTodos: [],
            announcedProactive: {},
          }
        }
        if (version < 4) {
          const existing = (next.emails as Email[]) ?? []
          const ids = new Set(existing.map((e) => e.id))
          const newJunk = SEED_EMAILS.filter(
            (e) => e.id.startsWith('email-junk-') && !ids.has(e.id),
          )
          next = {
            ...next,
            emails: [...existing, ...newJunk],
            aiInboxEnabled: false,
            inboxTraining: DEFAULT_INBOX_TRAINING,
            emailInboxOverrides: {},
          }
        }
        if (version < 5) {
          next = { ...next, vaultFiles: [] }
        }
        return next
      },
      partialize: (s) => ({
        notes: s.notes,
        folders: s.folders,
        emails: s.emails,
        vaultFiles: s.vaultFiles,
        accounts: s.accounts,
        calendarEvents: s.calendarEvents,
        oauthSettings: s.oauthSettings,
        theme: s.theme,
        aiSettings: {
          ...s.aiSettings,
          externalApiKey: '',
        },
        chatMessages: s.chatMessages.slice(-50),
        activeNoteId: s.activeNoteId,
        activeEmailId: s.activeEmailId,
        activeAccountId: s.activeAccountId,
        activeEmailFolder: s.activeEmailFolder,
        hiddenPanels: s.hiddenPanels,
        alertMeta: s.alertMeta,
        weatherSettings: s.weatherSettings,
        assistantSettings: s.assistantSettings,
        completedTodos: s.completedTodos,
        announcedProactive: s.announcedProactive,
        aiInboxEnabled: s.aiInboxEnabled,
        aiOutboxEnabled: s.aiOutboxEnabled,
        followUpFilterEnabled: s.followUpFilterEnabled,
        inboxTraining: s.inboxTraining,
        emailInboxOverrides: s.emailInboxOverrides,
        view: s.view,
      }),
    },
  ),
)

/** @deprecated use useEtherMailStore */
export const useNexusStore = useEtherMailStore

export function useGraph() {
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  return buildGraphFromData(notes, emails)
}

export function useStats() {
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const accounts = useEtherMailStore((s) => s.accounts)
  const unread = emails.filter((e) => !e.read).length
  const linked = emails.filter((e) => e.linkedNoteId).length
  const connected = accounts.filter((a) => a.connected).length
  return { notes: notes.length, unread, linked, connected }
}

export function useUpcomingMeetings(limit = 2) {
  const events = useEtherMailStore((s) => s.calendarEvents)
  const now = new Date()

  const upcoming = [...events]
    .filter((e) => new Date(e.start) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))

  if (upcoming.length > 0) return upcoming.slice(0, limit)

  // Fallback demo meetings relative to current time
  const addHours = (h: number) => {
    const d = new Date(now)
    d.setHours(d.getHours() + h)
    return d.toISOString()
  }
  return [
    { id: 'demo-1', title: 'Project Sync', start: addHours(2), end: addHours(3), attendees: ['Sarah J.'] },
    { id: 'demo-2', title: 'Budget Review', start: addHours(5), end: addHours(6), attendees: ['Finance team'] },
  ].slice(0, limit)
}

export function useAIAlerts() {
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const accounts = useEtherMailStore((s) => s.accounts)
  const alertMeta = useEtherMailStore((s) => s.alertMeta)

  const computed = computeAIAlerts(notes, emails, calendarEvents, accounts)
  const now = Date.now()
  return computed
    .filter((a) => {
      if (alertMeta[a.id]?.dismissed) return false
      const snoozed = alertMeta[a.id]?.snoozedUntil
      if (snoozed && new Date(snoozed).getTime() > now) return false
      return true
    })
    .map((a) => ({ ...a, read: alertMeta[a.id]?.read ?? false }))
}

export function useUnreadAlertCount() {
  return useAIAlerts().filter((a) => !a.read).length
}
