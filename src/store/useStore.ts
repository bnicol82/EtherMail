import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SEED_ACCOUNTS,
  SEED_ATTACHMENTS,
  SEED_CALENDAR,
  SEED_CHAT_MESSAGES,
  SEED_EMAILS,
  SEED_FOLDERS,
  SEED_EMAIL_LABELS,
  SEED_NOTES,
  SEED_VAULTS,
  SEED_ORG_MEMBERS,
  VAULT_PERSONAL_ID,
  VAULT_WORK_ID,
  ROOT_WORK_ID,
  EMAIL_FILES_WORK_FOLDER_ID,
  getDemoEmailsForAccount,
} from '../data/seed'
import { buildContactGraph } from '../lib/contactGraph'
import { getClientIdForProvider, simulateOAuthDelay } from '../lib/oauth/connect'
import { GmailSyncError, syncGmailAccount } from '../lib/sync/gmail'
import { syncGmailDemoInbox } from '../lib/sync/gmailDemo'
import { canConnectMailbox, type PlanTier } from '../lib/plan'
import {
  DEFAULT_ORG_POLICY,
  applyStrictEnterpriseDefaults,
  buildFeaturePolicy,
  mergeOrgPolicy,
  setOrgFeatureAllowed,
} from '../lib/orgPolicy'
import { canUseFeatureFromStore, getFeatureDenialReason } from '../lib/featureGates'
import type { FeatureId, OrgPolicy, OrgRole } from '../types/admin'
import { appendAudit, auditAiQuery } from '../lib/storePolicy'
import { withFullGate } from '../lib/serverGate'
import { canAccessVault, vaultAccessFromStore } from '../lib/vaultAccess'
import { trimAuditLog } from '../lib/auditLog'
import type { AuditEvent } from '../types/audit'
import type { OrgMember, OrgSession, SsoConfig, VaultShare, VaultSharePermission } from '../types/orgApi'
import { fetchOrgPolicy, hasOrgApi, pushOrgPolicy, fetchAuditLog, pushAuditEvents, apiInviteMember, apiUpdateMember, apiRemoveMember, apiUpdateVaultShares, apiUpdateSsoConfig, exchangeSsoCode, setOrgSessionToken, setSupabaseAuth, logoutOrgSessionApi, fetchOrgSession, getOrgSessionToken } from '../lib/orgApi'
import {
  DEFAULT_EMAIL_FOLDER_SORT,
  normalizeEmailFolderSort,
  type EmailSortKey,
} from '../lib/emailListSort'
import type {
  AISettings,
  AckStatus,
  AlertMeta,
  AssistantSettings,
  CalendarEvent,
  ChatMessage,
  ComposeDraft,
  ComposeAttachment,
  Email,
  EmailAcknowledgement,
  EmailAttachment,
  EmailFolder,
  EmailInboxOverride,
  EmailInboxTraining,
  EmailJunkCategory,
  EmailLabel,
  Note,
  OAuthSettings,
  OAuthConnectTokens,
  Theme,
  VaultFile,
  View,
  Vault,
  WeatherSettings,
  FeedbackSettings,
  Folder,
} from '../types'
import { EMAIL_FILES_FOLDER_ID } from '../types'
import { formatCalendarInviteBody, formatForwardInviteSubject } from '../lib/calendarInvite'
import { mergeImportedEvents } from '../lib/ics'
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
import { generateMeetingBrief, getNextMeeting } from '../lib/meetingPrep'
import {
  dailyNoteId,
  dailyNoteTemplate,
  findDailyNote,
  noteToComposeBody,
  syncTagsToFrontmatter,
} from '../lib/noteFeatures'
import { DAILY_FOLDER_ID } from '../data/seed'
import { findFreeSlots, formatProposalEmail } from '../lib/smartPropose'
import { materializeEmailAttachments } from '../lib/composeAttachments'

function mergeAuditLogs(local: AuditEvent[], remote: AuditEvent[]): AuditEvent[] {
  const byId = new Map<string, AuditEvent>()
  for (const event of [...local, ...remote]) byId.set(event.id, event)
  return trimAuditLog(
    [...byId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  )
}

async function pushVaultSharesToApi(state: {
  vaults: Vault[]
  vaultShares: VaultShare[]
}) {
  const vaultShared = Object.fromEntries(
    state.vaults.filter((v) => v.shared).map((v) => [v.id, true]),
  )
  await apiUpdateVaultShares({ vaultShares: state.vaultShares, vaultShared })
}

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
  vaults: Vault[]
  activeVaultId: string | null
  setActiveVault: (vaultId: string | null) => void
  graphPersonFilter: string | null
  setGraphPersonFilter: (personId: string | null) => void
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
  emailFolderSort: Record<EmailFolder, EmailSortKey>
  setEmailFolderSort: (folder: EmailFolder, sort: EmailSortKey) => void

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

  feedbackSettings: FeedbackSettings
  setFeedbackSettings: (settings: Partial<FeedbackSettings>) => void

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
  updateNoteTags: (id: string, tags: string[]) => void
  createNote: (folderId?: string) => string
  openDailyNote: (folderId?: string) => void
  createNoteFromTemplate: (templateId: string, targetFolderId?: string) => void
  openComposeFromNote: (noteId: string) => void
  createMeetingPrepNote: () => void
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
  openComposeFromEmail: (emailId: string) => void
  closeCompose: () => void
  sendComposedEmail: (draft: ComposeDraft) => void
  saveComposeDraft: (draft: ComposeDraft) => void
  scheduleComposedEmail: (draft: ComposeDraft, scheduledAt: string) => void
  processScheduledEmails: () => void
  cancelScheduledEmail: (emailId: string) => void
  sendScheduledEmailNow: (emailId: string) => void

  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void
  importCalendarEvents: (events: CalendarEvent[]) => Promise<number>
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

  threadViewEnabled: boolean
  setThreadViewEnabled: (enabled: boolean) => void

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

  emailLabels: EmailLabel[]
  activeLabelFilter: string | null
  setActiveLabelFilter: (labelId: string | null) => void
  createEmailLabel: (name: string, color?: string) => Promise<string>
  deleteEmailLabel: (labelId: string) => void
  toggleEmailLabelOnEmail: (emailId: string, labelId: string) => void
  batchApplyEmailLabel: (emailIds: string[], labelId: string) => void

  hiddenPanels: Record<string, boolean>
  togglePanelHidden: (panelId: string) => void

  oauthSettings: OAuthSettings
  setOAuthSettings: (settings: Partial<OAuthSettings>) => void
  connectingAccountId: string | null
  setConnectingAccountId: (id: string | null) => void
  startConnectAccount: (accountId: string) => void
  finishConnectAccount: (accountId: string, syncMode: 'demo' | 'oauth') => void
  disconnectAccount: (accountId: string) => void
  completeOAuthConnect: (accountId: string, tokens: OAuthConnectTokens) => Promise<void>
  syncGmailInbox: (accountId: string) => Promise<void>
  connectGmailDemo: (accountId: string) => Promise<{ imported: number; inbox: number; sent: number }>
  gmailSyncingAccountId: string | null
  planTier: PlanTier
  setPlanTier: (tier: PlanTier) => void

  orgPolicy: OrgPolicy
  userRole: OrgRole
  setOrgPolicy: (policy: Partial<OrgPolicy>) => void
  setOrgFeature: (featureId: FeatureId, allowed: boolean) => void
  setUserRole: (role: OrgRole) => void
  applyStrictEnterprisePolicy: () => void
  resetOrgPolicy: () => void
  allowAllFeatures: () => void
  denyAllFeatures: () => void

  policyToast: string | null
  clearPolicyToast: () => void
  auditLog: AuditEvent[]
  clearAuditLog: () => void
  ssoConfig: SsoConfig
  setSsoConfig: (config: Partial<SsoConfig>) => void
  policySyncStatus: string | null
  syncOrgFromApi: () => Promise<void>
  orgMembers: OrgMember[]
  inviteOrgMember: (member: { email: string; name: string; role: OrgRole }) => Promise<void>
  updateOrgMemberRole: (memberId: string, role: OrgRole) => Promise<void>
  removeOrgMember: (memberId: string) => Promise<void>
  vaultShares: VaultShare[]
  setVaultShared: (vaultId: string, shared: boolean) => void
  setVaultSharePermission: (vaultId: string, permission: VaultSharePermission) => void
  toggleVaultShareMember: (vaultId: string, memberId: string) => void

  orgSession: OrgSession | null
  completeSsoLogin: (code: string, email?: string) => Promise<void>
  clearOrgSession: () => void
  logoutOrgSession: () => Promise<void>
  bootstrapOrgSession: () => Promise<void>
  auditSyncCursor: string | null
  flushAuditToApi: () => Promise<void>
  syncAuditFromApi: () => Promise<void>

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  mobilePanel: 'nav' | 'list' | 'detail'
  setMobilePanel: (panel: 'nav' | 'list' | 'detail') => void
}

export const useEtherMailStore = create<EtherMailState>()(
  persist(
    (set, get) => ({
      view: 'dashboard',
      setView: (view) => {
        void (async () => {
          if (view === 'graph') {
            if (!(await withFullGate(get, set, 'graph_view', 'Open graph view'))) return
          }
          set({ view, mobilePanel: 'list' })
        })()
      },

      theme: 'glass',
      setTheme: (theme) => {
        if (!canUseFeatureFromStore('theme_customization', get())) return
        set({ theme })
      },

      setActiveVault: (activeVaultId) => {
        if (!activeVaultId) {
          set({ activeVaultId: null, graphPersonFilter: null })
          return
        }
        const state = get()
        const vault = state.vaults.find((v) => v.id === activeVaultId)
        if (
          vault &&
          !canAccessVault(vault, vaultAccessFromStore(state))
        ) {
          set({
            policyToast: 'You do not have access to this shared vault.',
            auditLog: appendAudit(state, 'vault', 'vault_access_denied', {
              detail: vault.name,
            }),
          })
          return
        }
        const root = state.folders.find((f) => f.parentId === null && f.vaultId === activeVaultId)
        set({
          activeVaultId,
          activeFolderId: root?.id ?? state.activeFolderId,
          graphPersonFilter: null,
        })
      },

      setGraphPersonFilter: (graphPersonFilter) => set({ graphPersonFilter }),

      notes: SEED_NOTES,
      folders: SEED_FOLDERS,
      vaults: SEED_VAULTS,
      activeVaultId: null,
      graphPersonFilter: null,
      emails: SEED_EMAILS,
      emailAttachments: SEED_ATTACHMENTS,
      emailLabels: SEED_EMAIL_LABELS,
      activeLabelFilter: null,
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
      emailFolderSort: { ...DEFAULT_EMAIL_FOLDER_SORT },

      editorMode: 'split',
      setEditorMode: (editorMode) => set({ editorMode }),

      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (commandPaletteOpen) => {
        void (async () => {
          if (commandPaletteOpen) {
            if (!(await withFullGate(get, set, 'command_palette', 'Open command palette'))) return
          }
          set({ commandPaletteOpen })
        })()
      },

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
        set((s) => {
          const filtered = { ...settings }
          if (!canUseFeatureFromStore('voice_chat', s)) {
            delete filtered.voiceChatEnabled
          }
          if (!canUseFeatureFromStore('proactive_assistant', s)) {
            delete filtered.proactiveEnabled
          }
          if (!canUseFeatureFromStore('announce_emails', s)) {
            delete filtered.announceNewEmails
          }
          return { assistantSettings: { ...s.assistantSettings, ...filtered } }
        }),
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
        const aiFeature = mode === 'vault' ? 'vault_ai' : 'external_ai'
        const ok = await withFullGate(get, set, aiFeature, 'AI query')
        if (!ok) {
          const denial = get().policyToast ?? 'Action not allowed'
          state.addChatMessage({ role: 'assistant', content: denial, mode })
          set({ aiContextResponse: denial, aiAssistantOpen: true })
          return
        }
        const bridgeOk = canUseFeatureFromStore('ai_bridge', state)
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
                bridgeOk && state.aiSettings.bridgeEnabled,
                bridgeOk && state.aiSettings.bridgeEnabled ? state.notes : [],
                bridgeOk && state.aiSettings.bridgeEnabled ? state.emails : [],
                bridgeOk && state.aiSettings.bridgeEnabled ? state.calendarEvents : [],
              )

        state.addChatMessage({ role: 'assistant', content: reply, mode })
        set({
          aiLoading: false,
          aiContextResponse: reply,
          aiAssistantOpen: true,
          auditLog: auditAiQuery(state, mode, query),
        })
      },
      clearAiContextResponse: () => set({ aiContextResponse: null, aiAssistantOpen: false }),

      openMeetingPrepBrief: async (eventId) => {
        if (!(await withFullGate(get, set, 'meeting_prep_ai', 'Meeting prep brief'))) return
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
        set((s) => {
          const filtered = { ...settings }
          if (!canUseFeatureFromStore('ai_bridge', s)) delete filtered.bridgeEnabled
          if (!canUseFeatureFromStore('external_ai', s)) {
            delete filtered.externalApiKey
            delete filtered.externalProvider
          }
          return { aiSettings: { ...s.aiSettings, ...filtered } }
        }),

      weatherSettings: {
        fallbackCity: 'San Francisco',
        useGeolocation: true,
      },
      setWeatherSettings: (settings) => {
        if (!canUseFeatureFromStore('weather_widget', get())) return
        set((s) => ({ weatherSettings: { ...s.weatherSettings, ...settings } }))
      },

      feedbackSettings: {
        hapticEnabled: true,
        hapticSoundEnabled: true,
      },
      setFeedbackSettings: (settings) => {
        if (!canUseFeatureFromStore('touch_feedback', get())) return
        set((s) => ({ feedbackSettings: { ...s.feedbackSettings, ...settings } }))
      },

      chatMessages: SEED_CHAT_MESSAGES,
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
      setAiMode: (aiMode) => {
        void (async () => {
          if (aiMode === 'external') {
            if (!(await withFullGate(get, set, 'external_ai', 'Switch to external AI'))) return
          }
          set({ aiMode })
        })()
      },

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
      selectEmail: (id) => {
        if (!id) {
          set({ activeEmailId: null })
          return
        }
        const email = get().emails.find((e) => e.id === id)
        const folder = email?.folder ?? 'inbox'
        if (email && (folder === 'drafts' || folder === 'scheduled')) {
          get().openComposeFromEmail(id)
          return
        }
        set({ activeEmailId: id, view: 'email', mobilePanel: 'detail' })
      },
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
        const isEmailFilesFolder =
          activeFolderId === EMAIL_FILES_FOLDER_ID || activeFolderId === EMAIL_FILES_WORK_FOLDER_ID
        if (isEmailFilesFolder) {
          const scopedAttachments = state.activeVaultId
            ? state.emailAttachments.filter((a) => {
                const acc = state.accounts.find((x) => x.id === a.accountId)
                return (acc?.defaultVaultId ?? VAULT_PERSONAL_ID) === state.activeVaultId
              })
            : state.emailAttachments
          const first = scopedAttachments[0]
          set({
            activeFolderId,
            activeNoteId: null,
            activeVaultFileId: null,
            activeAttachmentId: state.activeAttachmentId ?? first?.id ?? null,
            view: 'vault',
          })
        } else {
          const folder = state.folders.find((f) => f.id === activeFolderId)
          set({
            activeFolderId,
            activeAttachmentId: null,
            activeVaultFileId: null,
            activeVaultId: folder?.vaultId ?? state.activeVaultId,
          })
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
      updateNoteTags: (id, tags) => {
        const note = get().notes.find((n) => n.id === id)
        if (!note) return
        get().updateNote(id, {
          tags,
          content: syncTagsToFrontmatter(note.content, tags),
        })
      },
      createNote: (folderId) => {
        const id = `note-${Date.now()}`
        let folder = folderId ?? get().activeFolderId
        if (folder === EMAIL_FILES_FOLDER_ID) folder = 'athena'
        const folderMeta = get().folders.find((f) => f.id === folder)
        const note: Note = {
          id,
          title: 'Untitled Note',
          content: '# Untitled Note\n\nStart writing...',
          folderId: folder,
          vaultId: folderMeta?.vaultId ?? get().activeVaultId ?? VAULT_PERSONAL_ID,
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

      openDailyNote: (folderId) => {
        const state = get()
        const vaultId = state.activeVaultId ?? VAULT_PERSONAL_ID
        const targetFolder = folderId ?? DAILY_FOLDER_ID
        const existing = findDailyNote(state.notes, new Date(), vaultId)
        if (existing) {
          get().selectNote(existing.id)
          return
        }
        const tpl = dailyNoteTemplate()
        const id = dailyNoteId()
        const note: Note = {
          id,
          title: tpl.title,
          content: tpl.content,
          folderId: targetFolder,
          vaultId,
          tags: tpl.tags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          notes: [...s.notes, note],
          activeNoteId: id,
          activeFolderId: targetFolder,
          activeVaultFileId: null,
          view: s.view === 'notes' ? 'notes' : 'vault',
          mobilePanel: 'detail',
        }))
      },

      createNoteFromTemplate: (templateId, targetFolderId) => {
        const state = get()
        const template = state.notes.find((n) => n.id === templateId)
        if (!template) return
        const folder =
          targetFolderId ??
          (state.activeFolderId === EMAIL_FILES_FOLDER_ID ? 'personal' : state.activeFolderId)
        const folderMeta = state.folders.find((f) => f.id === folder)
        const id = `note-${Date.now()}`
        const note: Note = {
          id,
          title: template.title.replace(/\(template\)/i, '').trim() || 'Untitled Note',
          content: template.content,
          folderId: folder,
          vaultId: folderMeta?.vaultId ?? state.activeVaultId ?? VAULT_PERSONAL_ID,
          tags: [...template.tags],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          notes: [...s.notes, note],
          activeNoteId: id,
          activeVaultFileId: null,
          view: s.view === 'notes' ? 'notes' : 'vault',
          mobilePanel: 'detail',
        }))
      },

      openComposeFromNote: (noteId) => {
        const note = get().notes.find((n) => n.id === noteId)
        if (!note) return
        const { subject, body } = noteToComposeBody(note)
        get().openCompose({ subject, body })
      },

      createMeetingPrepNote: () => {
        const state = get()
        const event = getNextMeeting(state.calendarEvents)
        if (!event) return
        const brief = generateMeetingBrief(event, state.notes, state.emails)
        const folder = state.activeFolderId === EMAIL_FILES_FOLDER_ID ? 'athena' : state.activeFolderId
        const folderMeta = state.folders.find((f) => f.id === folder)
        const id = `note-${Date.now()}`
        const note: Note = {
          id,
          title: `Prep: ${event.title}`,
          content: brief.markdown,
          folderId: folder,
          vaultId: folderMeta?.vaultId ?? state.activeVaultId ?? VAULT_PERSONAL_ID,
          tags: ['meeting', 'prep'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          notes: [...s.notes, note],
          activeNoteId: id,
          activeVaultFileId: null,
          view: 'vault',
          mobilePanel: 'detail',
        }))
      },

      createFolder: (name, parentId) => {
        const parent = parentId ?? get().activeFolderId
        if (parent === EMAIL_FILES_FOLDER_ID) return ''
        const trimmed = name.trim()
        if (!trimmed) return ''
        const parentFolder = get().folders.find((f) => f.id === parent)
        const id = `folder-${Date.now()}`
        set((s) => ({
          folders: [
            ...s.folders,
            {
              id,
              name: trimmed,
              parentId: parent,
              vaultId: parentFolder?.vaultId ?? s.activeVaultId ?? VAULT_PERSONAL_ID,
            },
          ],
          activeFolderId: id,
        }))
        return id
      },

      uploadVaultFile: async (file, folderId) => {
        if (!(await withFullGate(get, set, 'vault_file_upload', 'Upload vault file'))) return
        if (folderId === EMAIL_FILES_FOLDER_ID) return
        const folderMeta = get().folders.find((f) => f.id === folderId)
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
          vaultId: folderMeta?.vaultId ?? get().activeVaultId ?? VAULT_PERSONAL_ID,
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

      setEmailFolderSort: (folder, sort) =>
        set((s) => ({
          emailFolderSort: { ...s.emailFolderSort, [folder]: sort },
        })),

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
        void (async () => {
          if (!(await withFullGate(get, set, 'compose_email', 'Compose email'))) return
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
        let contextEmailId = initial?.contextEmailId

        if (initial?.replyTo) {
          const draft = buildReplyDraft(initial.replyTo)
          to = draft.to
          subject = draft.subject
          body = draft.body
          contextEmailId = initial.replyTo.id
        }

        if (initial?.replyAllTo) {
          const draft = buildReplyAllDraft(initial.replyAllTo, state.accounts)
          to = draft.to
          cc = draft.cc ?? ''
          subject = draft.subject
          body = draft.body
          contextEmailId = initial.replyAllTo.id
        }

        if (initial?.forwardEmail) {
          const draft = buildForwardDraft(initial.forwardEmail)
          subject = draft.subject
          body = draft.body
          contextEmailId = initial.forwardEmail.id
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
            attachments: initial?.attachments,
            scheduledAt: initial?.scheduledAt,
            contextEmailId,
          },
          view: 'email',
          mobilePanel: 'list',
        })
        })()
      },

      openComposeFromEmail: (emailId) => {
        const state = get()
        const email = state.emails.find((e) => e.id === emailId)
        if (!email) return
        const folder = email.folder ?? 'inbox'
        if (folder !== 'drafts' && folder !== 'scheduled') return

        const draftAttachments: ComposeAttachment[] = (email.attachmentIds ?? [])
          .map((attId) => state.emailAttachments.find((a) => a.id === attId))
          .filter((a): a is NonNullable<typeof a> => !!a && !!a.dataUrl)
          .map((a) => ({
            id: a.id,
            filename: a.filename,
            sizeBytes: a.sizeBytes,
            mimeType: a.mimeType,
            dataUrl: a.dataUrl!,
          }))

        get().openCompose({
          id: email.id,
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          subject: email.subject,
          body: email.body,
          accountId: email.accountId,
          scheduledAt: email.scheduledAt,
          attachments: draftAttachments.length > 0 ? draftAttachments : undefined,
        })
      },

      closeCompose: () => set({ composeDraft: null }),

      sendComposedEmail: (draft) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'compose_email', 'Send email'))) return
          const current = get()
          const account = current.accounts.find((a) => a.id === draft.accountId)
          const now = new Date().toISOString()
          const preview = draft.body.trim().slice(0, 120) || '(no content)'

          if (draft.id) {
            const { records, ids } = materializeEmailAttachments(
              draft.attachments,
              draft.id,
              draft.accountId,
            )
            const attachmentIds = draft.attachments?.length
              ? ids
              : current.emails.find((e) => e.id === draft.id)?.attachmentIds

            set({
              emails: current.emails.map((e) =>
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
                      scheduledAt: undefined,
                      attachmentIds,
                    }
                  : e,
              ),
              emailAttachments: draft.attachments?.length
                ? [
                    ...current.emailAttachments.filter((a) => a.emailId !== draft.id),
                    ...records,
                  ]
                : current.emailAttachments,
              activeEmailId: draft.id,
              activeEmailFolder: 'sent',
              composeDraft: null,
              mobilePanel: 'detail',
            })
            return
          }

          const id = `email-${Date.now()}`
          const { records, ids } = materializeEmailAttachments(draft.attachments, id, draft.accountId)
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
            attachmentIds: ids.length > 0 ? ids : undefined,
            folder: 'sent',
            scheduledAt: undefined,
          }
          set({
            emails: [...current.emails, email],
            emailAttachments: [...current.emailAttachments, ...records],
            activeEmailId: id,
            activeEmailFolder: 'sent',
            composeDraft: null,
            mobilePanel: 'detail',
          })
        })()
      },

      saveComposeDraft: (draft) => {
        const state = get()
        const account = state.accounts.find((a) => a.id === draft.accountId)
        const now = new Date().toISOString()
        const preview = draft.body.trim().slice(0, 120) || '(draft)'

        if (draft.id) {
          const { records, ids } = materializeEmailAttachments(
            draft.attachments,
            draft.id,
            draft.accountId,
          )
          const attachmentIds = draft.attachments?.length
            ? ids
            : state.emails.find((e) => e.id === draft.id)?.attachmentIds

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
                    scheduledAt: undefined,
                    attachmentIds,
                  }
                : e,
            ),
            emailAttachments: draft.attachments?.length
              ? [
                  ...state.emailAttachments.filter((a) => a.emailId !== draft.id),
                  ...records,
                ]
              : state.emailAttachments,
            activeEmailId: draft.id,
            activeEmailFolder: 'drafts',
            composeDraft: null,
            mobilePanel: 'detail',
          })
          return
        }

        const id = `draft-${Date.now()}`
        const { records, ids } = materializeEmailAttachments(draft.attachments, id, draft.accountId)
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
          attachmentIds: ids.length > 0 ? ids : undefined,
          folder: 'drafts',
        }
        set({
          emails: [...state.emails, email],
          emailAttachments: [...state.emailAttachments, ...records],
          activeEmailId: id,
          activeEmailFolder: 'drafts',
          composeDraft: null,
          mobilePanel: 'detail',
        })
      },

      scheduleComposedEmail: (draft, scheduledAt) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'scheduled_send', 'Schedule email'))) return
          const state = get()
        const account = state.accounts.find((a) => a.id === draft.accountId)
        const now = new Date().toISOString()
        const preview = draft.body.trim().slice(0, 120) || '(scheduled)'

        const upsertScheduled = (id: string, attachmentIds?: string[]) => {
          const existing = state.emails.find((e) => e.id === id)
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
            starred: existing?.starred ?? false,
            linkedNoteId: existing?.linkedNoteId ?? null,
            attachmentIds,
            labelIds: existing?.labelIds,
            folder: 'scheduled',
            scheduledAt,
          }
          return email
        }

        if (draft.id) {
          const { records, ids } = materializeEmailAttachments(
            draft.attachments,
            draft.id,
            draft.accountId,
          )
          const attachmentIds = draft.attachments?.length
            ? ids
            : state.emails.find((e) => e.id === draft.id)?.attachmentIds

          set({
            emails: state.emails.map((e) =>
              e.id === draft.id ? upsertScheduled(draft.id!, attachmentIds) : e,
            ),
            emailAttachments: draft.attachments?.length
              ? [
                  ...state.emailAttachments.filter((a) => a.emailId !== draft.id),
                  ...records,
                ]
              : state.emailAttachments,
            activeEmailId: draft.id,
            activeEmailFolder: 'scheduled',
            composeDraft: null,
            mobilePanel: 'detail',
          })
          return
        }

        const id = `scheduled-${Date.now()}`
        const { records, ids } = materializeEmailAttachments(draft.attachments, id, draft.accountId)
        set({
          emails: [...state.emails, upsertScheduled(id, ids.length > 0 ? ids : undefined)],
          emailAttachments: [...state.emailAttachments, ...records],
          activeEmailId: id,
          activeEmailFolder: 'scheduled',
          composeDraft: null,
          mobilePanel: 'detail',
        })
        })()
      },

      processScheduledEmails: () => {
        const state = get()
        const now = Date.now()
        const due = state.emails.filter(
          (e) => e.folder === 'scheduled' && e.scheduledAt && new Date(e.scheduledAt).getTime() <= now,
        )
        if (due.length === 0) return

        const dueIds = new Set(due.map((e) => e.id))
        const sentAt = new Date().toISOString()
        set({
          emails: state.emails.map((e) =>
            dueIds.has(e.id)
              ? {
                  ...e,
                  folder: 'sent' as EmailFolder,
                  date: sentAt,
                  scheduledAt: undefined,
                  preview: e.body.trim().slice(0, 120) || e.preview,
                }
              : e,
          ),
        })
      },

      cancelScheduledEmail: (emailId) => {
        set((s) => ({
          emails: s.emails.map((e) =>
            e.id === emailId
              ? { ...e, folder: 'drafts' as EmailFolder, scheduledAt: undefined }
              : e,
          ),
          activeEmailFolder:
            s.activeEmailId === emailId ? ('drafts' as EmailFolder) : s.activeEmailFolder,
        }))
      },

      sendScheduledEmailNow: (emailId) => {
        const state = get()
        const email = state.emails.find((e) => e.id === emailId)
        if (!email || email.folder !== 'scheduled') return
        const sentAt = new Date().toISOString()
        set({
          emails: state.emails.map((e) =>
            e.id === emailId
              ? {
                  ...e,
                  folder: 'sent' as EmailFolder,
                  date: sentAt,
                  scheduledAt: undefined,
                  preview: e.body.trim().slice(0, 120) || e.preview,
                }
              : e,
          ),
          activeEmailFolder: 'sent',
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

      importCalendarEvents: async (events) => {
        if (events.length === 0) return 0
        if (!(await withFullGate(get, set, 'calendar_import_export', 'Import calendar'))) return 0
        const state = get()
        const before = state.calendarEvents.length
        const merged = mergeImportedEvents(state.calendarEvents, events)
        set({
          calendarEvents: merged,
          auditLog: appendAudit(state, 'admin', 'calendar_imported', {
            detail: `${events.length} events`,
          }),
        })
        return merged.length - before
      },

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

      threadViewEnabled: false,
      setThreadViewEnabled: (threadViewEnabled) => {
        void (async () => {
          if (threadViewEnabled) {
            if (!(await withFullGate(get, set, 'thread_view', 'Thread view'))) return
          }
          set({ threadViewEnabled })
        })()
      },

      aiInboxEnabled: false,
      setAiInboxEnabled: (aiInboxEnabled) => {
        void (async () => {
          if (aiInboxEnabled) {
            if (!(await withFullGate(get, set, 'ai_inbox', 'AI Inbox'))) return
          }
          set({ aiInboxEnabled, aiOutboxEnabled: aiInboxEnabled ? false : get().aiOutboxEnabled })
        })()
      },

      aiOutboxEnabled: false,
      setAiOutboxEnabled: (aiOutboxEnabled) => {
        void (async () => {
          if (aiOutboxEnabled) {
            if (!(await withFullGate(get, set, 'ai_outbox', 'AI Outbox'))) return
          }
          set({ aiOutboxEnabled, aiInboxEnabled: aiOutboxEnabled ? false : get().aiInboxEnabled })
        })()
      },

      deleteAllOutboxEmails: () => {
        void (async () => {
          if (!(await withFullGate(get, set, 'ai_outbox', 'Delete outbox emails'))) return
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
        })()
      },

      inboxTraining: DEFAULT_INBOX_TRAINING,
      emailInboxOverrides: {},

      trainEmailImportant: (emailId) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'inbox_training', 'Train inbox'))) return
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
        })()
      },

      trainEmailJunk: (emailId, category) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'inbox_training', 'Train inbox'))) return
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
        })()
      },

      clearInboxTraining: () => {
        void (async () => {
          if (!(await withFullGate(get, set, 'inbox_training', 'Reset inbox training'))) return
          set({ inboxTraining: DEFAULT_INBOX_TRAINING, emailInboxOverrides: {} })
        })()
      },

      selectedEmailIds: [],
      emailSelectionMode: false,
      followUpFilterEnabled: false,
      setEmailSelectionMode: (emailSelectionMode) => {
        void (async () => {
          if (emailSelectionMode) {
            if (!(await withFullGate(get, set, 'batch_email_actions', 'Select emails'))) return
          }
          set({
            emailSelectionMode,
            selectedEmailIds: emailSelectionMode ? get().selectedEmailIds : [],
          })
        })()
      },
      setFollowUpFilterEnabled: (followUpFilterEnabled) => {
        void (async () => {
          if (followUpFilterEnabled) {
            if (!(await withFullGate(get, set, 'follow_up_filter', 'Follow-up filter'))) return
          }
          set({ followUpFilterEnabled })
        })()
      },
      toggleEmailSelection: (emailId) =>
        set((s) => ({
          selectedEmailIds: s.selectedEmailIds.includes(emailId)
            ? s.selectedEmailIds.filter((id) => id !== emailId)
            : [...s.selectedEmailIds, emailId],
        })),
      selectAllVisibleEmails: (emailIds) => set({ selectedEmailIds: emailIds }),
      clearEmailSelection: () => set({ selectedEmailIds: [], emailSelectionMode: false }),
      batchArchiveEmails: (emailIds) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'batch_email_actions', 'Batch archive'))) return
          const ids = new Set(emailIds)
          set((s) => ({
            emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, folder: 'archive' as EmailFolder } : e)),
            selectedEmailIds: [],
            emailSelectionMode: false,
            activeEmailId:
              s.activeEmailId && ids.has(s.activeEmailId) ? null : s.activeEmailId,
          }))
        })()
      },
      batchDeleteEmails: (emailIds) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'batch_email_actions', 'Batch delete'))) return
          const ids = new Set(emailIds)
          set((s) => ({
            emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, folder: 'trash' as EmailFolder } : e)),
            selectedEmailIds: [],
            emailSelectionMode: false,
            activeEmailId:
              s.activeEmailId && ids.has(s.activeEmailId) ? null : s.activeEmailId,
          }))
        })()
      },
      batchStarEmails: (emailIds, starred) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'batch_email_actions', 'Batch star'))) return
          const ids = new Set(emailIds)
          set((s) => ({
            emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, starred } : e)),
          }))
        })()
      },
      batchMarkEmailsRead: (emailIds, read) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'batch_email_actions', 'Batch mark read'))) return
          const ids = new Set(emailIds)
          set((s) => ({
            emails: s.emails.map((e) => (ids.has(e.id) ? { ...e, read } : e)),
          }))
        })()
      },

      setActiveLabelFilter: (activeLabelFilter) => set({ activeLabelFilter }),

      createEmailLabel: async (name, color) => {
        if (!(await withFullGate(get, set, 'email_labels', 'Create email label'))) return ''
        const trimmed = name.trim()
        if (!trimmed) return ''
        const id = `label-${Date.now()}`
        const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
        const label: EmailLabel = {
          id,
          name: trimmed,
          color: color ?? palette[get().emailLabels.length % palette.length],
        }
        set((s) => ({ emailLabels: [...s.emailLabels, label] }))
        return id
      },

      deleteEmailLabel: (labelId) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'email_labels', 'Delete email label'))) return
          set((s) => ({
            emailLabels: s.emailLabels.filter((l) => l.id !== labelId),
            emails: s.emails.map((e) => ({
              ...e,
              labelIds: e.labelIds?.filter((id) => id !== labelId),
            })),
            activeLabelFilter: s.activeLabelFilter === labelId ? null : s.activeLabelFilter,
          }))
        })()
      },

      toggleEmailLabelOnEmail: (emailId, labelId) =>
        set((s) => ({
          emails: s.emails.map((e) => {
            if (e.id !== emailId) return e
            const current = e.labelIds ?? []
            const has = current.includes(labelId)
            return {
              ...e,
              labelIds: has
                ? current.filter((id) => id !== labelId)
                : [...current, labelId],
            }
          }),
        })),

      batchApplyEmailLabel: (emailIds, labelId) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'email_labels', 'Apply email label'))) return
          const ids = new Set(emailIds)
          set((s) => ({
            emails: s.emails.map((e) => {
              if (!ids.has(e.id)) return e
              const current = e.labelIds ?? []
              if (current.includes(labelId)) return e
              return { ...e, labelIds: [...current, labelId] }
            }),
            selectedEmailIds: [],
            emailSelectionMode: false,
          }))
        })()
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
      setOAuthSettings: (settings) => {
        if (!canUseFeatureFromStore('oauth_byo_client', get())) return
        set((s) => ({ oauthSettings: { ...s.oauthSettings, ...settings } }))
      },

      connectingAccountId: null,
      setConnectingAccountId: (connectingAccountId) => set({ connectingAccountId }),

      startConnectAccount: (accountId) => {
        void (async () => {
          const state = get()
          const account = state.accounts.find((a) => a.id === accountId)
          if (!account || account.connected) return
          const connectedCount = state.accounts.filter((a) => a.connected).length
          if (
            !(await withFullGate(get, set, 'connect_mailbox', 'Connect mailbox', {
              connectedMailboxes: connectedCount,
            }))
          ) {
            return
          }
          const providerFeature: FeatureId =
            account.provider === 'gmail'
              ? 'provider_gmail'
              : account.provider === 'outlook'
                ? 'provider_outlook'
                : account.provider === 'yahoo'
                  ? 'provider_yahoo'
                  : 'provider_enterprise'
          if (!canUseFeatureFromStore(providerFeature, state)) {
            set({
              policyToast: getFeatureDenialReason(providerFeature),
              auditLog: appendAudit(state, 'policy', 'feature_denied', {
                featureId: providerFeature,
                detail: 'Connect mailbox',
              }),
            })
            return
          }
          if (!canConnectMailbox(connectedCount, state.planTier)) return
          set({ connectingAccountId: accountId })
        })()
      },

      connectGmailDemo: async (accountId) => {
        const state = get()
        set({ gmailSyncingAccountId: accountId })
        await simulateOAuthDelay(900)

        const result = syncGmailDemoInbox(accountId)
        const otherEmails = state.emails.filter((e) => e.accountId !== accountId)
        const allEmails = [...otherEmails, ...result.emails]

        set({
          accounts: get().accounts.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  connected: true,
                  connectedAt: new Date().toISOString(),
                  syncMode: 'demo',
                  lastSyncedAt: new Date().toISOString(),
                  syncError: null,
                }
              : a,
          ),
          emails: allEmails,
          calendarEvents: syncCalendarFromEmails(
            allEmails,
            state.emailAttachments,
            state.calendarEvents,
          ),
          connectingAccountId: null,
          gmailSyncingAccountId: null,
        })

        return { imported: result.imported, inbox: result.inbox, sent: result.sent }
      },

      finishConnectAccount: (accountId, syncMode) => {
        const state = get()
        const account = state.accounts.find((a) => a.id === accountId)
        if (account?.provider === 'gmail' && syncMode === 'demo') {
          void get().connectGmailDemo(accountId)
          return
        }

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

      completeOAuthConnect: async (accountId, tokens) => {
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  connected: true,
                  syncMode: 'oauth',
                  connectedAt: new Date().toISOString(),
                  oauthAccessToken: tokens.accessToken,
                  oauthRefreshToken: tokens.refreshToken ?? a.oauthRefreshToken,
                  oauthExpiresAt: expiresAt,
                  syncError: null,
                }
              : a,
          ),
          connectingAccountId: null,
        }))
        await get().syncGmailInbox(accountId)
      },

      syncGmailInbox: async (accountId) => {
        if (!(await withFullGate(get, set, 'gmail_live_sync', 'Gmail sync'))) return
        const state = get()
        const account = state.accounts.find((a) => a.id === accountId)
        if (!account || account.provider !== 'gmail' || !account.oauthAccessToken) return

        set({ gmailSyncingAccountId: accountId })
        try {
          const clientId = getClientIdForProvider('gmail', state.oauthSettings)
          const result = await syncGmailAccount(account, clientId)
          const otherEmails = state.emails.filter((e) => e.accountId !== accountId)

          set({
            accounts: get().accounts.map((a) =>
              a.id === accountId
                ? {
                    ...a,
                    email: result.accountEmail,
                    connected: true,
                    syncMode: 'oauth',
                    oauthAccessToken: result.accessToken,
                    oauthRefreshToken: result.refreshToken ?? a.oauthRefreshToken,
                    oauthExpiresAt: result.expiresAt ?? a.oauthExpiresAt,
                    lastSyncedAt: new Date().toISOString(),
                    syncError: null,
                  }
                : a,
            ),
            emails: [...otherEmails, ...result.emails],
            calendarEvents: syncCalendarFromEmails(
              [...otherEmails, ...result.emails],
              state.emailAttachments,
              state.calendarEvents,
            ),
            gmailSyncingAccountId: null,
          })
        } catch (err) {
          const message =
            err instanceof GmailSyncError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Gmail sync failed'
          set({
            accounts: get().accounts.map((a) =>
              a.id === accountId ? { ...a, syncError: message } : a,
            ),
            gmailSyncingAccountId: null,
          })
        }
      },

      gmailSyncingAccountId: null,
      planTier: 'team',
      setPlanTier: (planTier) => set({ planTier }),

      orgPolicy: DEFAULT_ORG_POLICY,
      userRole: 'owner',
      setOrgPolicy: (patch) =>
        set((s) => ({
          orgPolicy: mergeOrgPolicy(s.orgPolicy, patch),
          auditLog: appendAudit(s, 'admin', 'org_policy_updated'),
        })),
      setOrgFeature: (featureId, allowed) => {
        set((s) => {
          const orgPolicy = setOrgFeatureAllowed(s.orgPolicy, featureId, allowed)
          if (hasOrgApi()) void pushOrgPolicy(orgPolicy)
          return {
            orgPolicy,
            auditLog: appendAudit(s, 'admin', allowed ? 'feature_allowed' : 'feature_denied', {
              featureId,
            }),
          }
        })
      },
      setUserRole: (userRole) => set({ userRole }),
      applyStrictEnterprisePolicy: () =>
        set((s) => ({
          orgPolicy: applyStrictEnterpriseDefaults(s.orgPolicy),
          auditLog: appendAudit(s, 'admin', 'strict_policy_applied'),
        })),
      resetOrgPolicy: () =>
        set((s) => ({
          orgPolicy: DEFAULT_ORG_POLICY,
          auditLog: appendAudit(s, 'admin', 'policy_reset'),
        })),
      allowAllFeatures: () =>
        set((s) => {
          const orgPolicy = { ...s.orgPolicy, features: buildFeaturePolicy(true) }
          if (hasOrgApi()) void pushOrgPolicy(orgPolicy)
          return {
            orgPolicy,
            auditLog: appendAudit(s, 'admin', 'all_features_allowed'),
          }
        }),
      denyAllFeatures: () =>
        set((s) => {
          const orgPolicy = { ...s.orgPolicy, features: buildFeaturePolicy(false) }
          if (hasOrgApi()) void pushOrgPolicy(orgPolicy)
          return {
            orgPolicy,
            auditLog: appendAudit(s, 'admin', 'all_features_denied'),
          }
        }),

      policyToast: null,
      clearPolicyToast: () => set({ policyToast: null }),
      auditLog: [],
      clearAuditLog: () => set({ auditLog: [] }),
      ssoConfig: {
        enabled: false,
        provider: 'none' as const,
        tenantId: '',
        clientId: '',
        domain: '',
        enforceSso: false,
      },
      setSsoConfig: (config) => {
        set((s) => ({
          ssoConfig: { ...s.ssoConfig, ...config },
          auditLog: appendAudit(s, 'admin', 'sso_config_updated', {
            detail: config.provider ?? s.ssoConfig.provider,
          }),
        }))
        if (hasOrgApi()) {
          const next = { ...get().ssoConfig, ...config }
          void apiUpdateSsoConfig(next).catch(() => {})
        }
      },
      policySyncStatus: null,
      syncOrgFromApi: async () => {
        const state = get()
        set({ policySyncStatus: 'Syncing…' })
        try {
          await get().flushAuditToApi()
          const res = await fetchOrgPolicy(state.orgPolicy)
          const vaultShared = res.vaultShared ?? {}
          set({
            orgPolicy: res.policy,
            orgMembers: res.members.length > 0 ? res.members : state.orgMembers,
            vaultShares: res.vaultShares.length > 0 ? res.vaultShares : state.vaultShares,
            ssoConfig: res.sso,
            planTier: (res.planTier as PlanTier) ?? state.planTier,
            vaults: state.vaults.map((v) => ({
              ...v,
              shared: vaultShared[v.id] ?? v.shared,
            })),
            policySyncStatus: `Synced at ${new Date(res.syncedAt).toLocaleTimeString()}`,
            auditLog: appendAudit(state, 'admin', 'policy_synced', {
              detail: res.organizationId,
            }),
          })
          await get().syncAuditFromApi()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sync failed'
          set({
            policySyncStatus: message,
            auditLog: appendAudit(get(), 'admin', 'policy_sync_failed', { detail: message }),
          })
        }
      },
      orgSession: null,
      completeSsoLogin: async (code, email) => {
        const state = get()
        try {
          const res = await exchangeSsoCode(code, {
            email,
            redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
          })
          setOrgSessionToken(res.sessionToken)
          if (res.supabaseAuth) {
            setSupabaseAuth({
              accessToken: res.supabaseAuth.accessToken,
              refreshToken: res.supabaseAuth.refreshToken,
              expiresAt: Date.now() + res.supabaseAuth.expiresIn * 1000,
              authUserId: res.supabaseAuth.authUserId,
            })
          }
          const session: OrgSession = {
            sessionToken: res.sessionToken,
            memberId: res.member.id,
            email: res.member.email,
            role: res.role,
            authUserId: res.supabaseAuth?.authUserId,
          }
          set({
            orgSession: session,
            userRole: res.role,
            auditLog: appendAudit(state, 'auth', 'sso_login', {
              detail: res.member.email,
              actorEmail: res.member.email,
            }),
          })
          await get().flushAuditToApi()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'SSO login failed'
          set({
            policyToast: message,
            auditLog: appendAudit(state, 'auth', 'sso_login_failed', { detail: message }),
          })
        }
      },
      clearOrgSession: () => {
        setOrgSessionToken(null)
        setSupabaseAuth(null)
        set({ orgSession: null })
      },
      logoutOrgSession: async () => {
        await logoutOrgSessionApi()
        get().clearOrgSession()
      },
      bootstrapOrgSession: async () => {
        if (!hasOrgApi()) return
        const remote = await fetchOrgSession()
        if (!remote) {
          if (get().orgSession || getOrgSessionToken()) get().clearOrgSession()
          return
        }
        const token = getOrgSessionToken() ?? `remote-${remote.member.id}`
        if (!getOrgSessionToken()) setOrgSessionToken(token)
        set({
          orgSession: {
            sessionToken: token,
            memberId: remote.member.id,
            email: remote.member.email,
            role: remote.role,
          },
          userRole: remote.role,
        })
      },
      auditSyncCursor: null,
      flushAuditToApi: async () => {
        if (!hasOrgApi()) return
        const state = get()
        const pending = state.auditSyncCursor
          ? state.auditLog.filter((e) => e.timestamp > state.auditSyncCursor!)
          : state.auditLog
        if (pending.length === 0) return
        await pushAuditEvents(pending)
        set({ auditSyncCursor: pending.at(-1)?.timestamp ?? state.auditSyncCursor })
      },
      syncAuditFromApi: async () => {
        if (!hasOrgApi()) return
        const state = get()
        const res = await fetchAuditLog(state.auditSyncCursor)
        if (res.events.length === 0) return
        set({
          auditLog: mergeAuditLogs(state.auditLog, res.events),
          auditSyncCursor: res.cursor ?? res.events.at(-1)?.timestamp ?? state.auditSyncCursor,
        })
      },
      orgMembers: SEED_ORG_MEMBERS,
      inviteOrgMember: async ({ email, name, role }) => {
        const state = get()
        const trimmed = email.trim().toLowerCase()
        if (!trimmed) return
        if (state.orgMembers.some((m) => m.email.toLowerCase() === trimmed)) return

        if (hasOrgApi()) {
          try {
            const member = await apiInviteMember({
              email: trimmed,
              name: name.trim() || trimmed.split('@')[0],
              role,
            })
            set({
              orgMembers: [...state.orgMembers, member],
              auditLog: appendAudit(state, 'admin', 'member_invited', {
                detail: `${member.name} <${trimmed}>`,
              }),
            })
            void get().flushAuditToApi()
            return
          } catch (err) {
            set({
              policyToast: err instanceof Error ? err.message : 'Invite failed',
            })
            return
          }
        }

        const member: OrgMember = {
          id: `member-${Date.now()}`,
          email: trimmed,
          name: name.trim() || trimmed.split('@')[0],
          role,
          status: 'invited',
          invitedAt: new Date().toISOString(),
        }
        set({
          orgMembers: [...state.orgMembers, member],
          auditLog: appendAudit(state, 'admin', 'member_invited', {
            detail: `${member.name} <${trimmed}>`,
          }),
        })
      },
      updateOrgMemberRole: async (memberId, role) => {
        const state = get()
        if (hasOrgApi()) {
          try {
            const updated = await apiUpdateMember(memberId, { role })
            set({
              orgMembers: state.orgMembers.map((m) => (m.id === memberId ? updated : m)),
              auditLog: appendAudit(state, 'admin', 'member_role_updated', {
                detail: `${updated.email} → ${role}`,
              }),
            })
            void get().flushAuditToApi()
            return
          } catch (err) {
            set({ policyToast: err instanceof Error ? err.message : 'Update failed' })
            return
          }
        }
        set((s) => {
          const member = s.orgMembers.find((m) => m.id === memberId)
          return {
            orgMembers: s.orgMembers.map((m) => (m.id === memberId ? { ...m, role } : m)),
            auditLog: appendAudit(s, 'admin', 'member_role_updated', {
              detail: member ? `${member.email} → ${role}` : memberId,
            }),
          }
        })
      },
      removeOrgMember: async (memberId) => {
        if (hasOrgApi()) {
          try {
            await apiRemoveMember(memberId)
          } catch (err) {
            set({ policyToast: err instanceof Error ? err.message : 'Remove failed' })
            return
          }
        }
        set((s) => {
          const member = s.orgMembers.find((m) => m.id === memberId)
          return {
            orgMembers: s.orgMembers.filter((m) => m.id !== memberId),
            vaultShares: s.vaultShares.map((vs) => ({
              ...vs,
              memberIds: vs.memberIds.filter((id) => id !== memberId),
            })),
            auditLog: appendAudit(s, 'admin', 'member_removed', {
              detail: member?.email ?? memberId,
            }),
          }
        })
        if (hasOrgApi()) void get().flushAuditToApi()
      },
      vaultShares: [
        {
          vaultId: VAULT_WORK_ID,
          memberIds: SEED_ORG_MEMBERS.filter((m) => m.status === 'active').map((m) => m.id),
          permission: 'write' as VaultSharePermission,
        },
      ],
      setVaultShared: (vaultId, shared) => {
        void (async () => {
          if (!(await withFullGate(get, set, 'shared_vaults', shared ? 'Share vault' : 'Unshare vault'))) return
          set((s) => ({
          vaults: s.vaults.map((v) => (v.id === vaultId ? { ...v, shared } : v)),
          vaultShares: shared
            ? s.vaultShares.some((vs) => vs.vaultId === vaultId)
              ? s.vaultShares
              : [
                  ...s.vaultShares,
                  {
                    vaultId,
                    memberIds: s.orgMembers
                      .filter((m) => m.status === 'active')
                      .map((m) => m.id),
                    permission: 'read' as VaultSharePermission,
                  },
                ]
            : s.vaultShares.filter((vs) => vs.vaultId !== vaultId),
          auditLog: appendAudit(s, 'vault', shared ? 'vault_shared' : 'vault_unshared', {
            detail: vaultId,
          }),
        }))
        if (hasOrgApi()) {
          void pushVaultSharesToApi(get()).catch(() => {})
          void get().flushAuditToApi()
        }
        })()
      },
      setVaultSharePermission: (vaultId, permission) => {
        set((s) => ({
          vaultShares: s.vaultShares.map((vs) =>
            vs.vaultId === vaultId ? { ...vs, permission } : vs,
          ),
          auditLog: appendAudit(s, 'vault', 'vault_permission_updated', {
            detail: `${vaultId}: ${permission}`,
          }),
        }))
        if (hasOrgApi()) {
          void pushVaultSharesToApi(get()).catch(() => {})
          void get().flushAuditToApi()
        }
      },
      toggleVaultShareMember: (vaultId, memberId) => {
        set((s) => ({
          vaultShares: s.vaultShares.map((vs) => {
            if (vs.vaultId !== vaultId) return vs
            const has = vs.memberIds.includes(memberId)
            return {
              ...vs,
              memberIds: has
                ? vs.memberIds.filter((id) => id !== memberId)
                : [...vs.memberIds, memberId],
            }
          }),
          auditLog: appendAudit(s, 'vault', 'vault_member_toggled', { detail: vaultId }),
        }))
        if (hasOrgApi()) {
          void pushVaultSharesToApi(get()).catch(() => {})
          void get().flushAuditToApi()
        }
      },

      disconnectAccount: (accountId) => {
        const state = get()
        const account = state.accounts.find((a) => a.id === accountId)
        let emails = state.emails
        if (account?.syncMode === 'oauth') {
          emails = state.emails.filter((e) => e.accountId !== accountId)
        } else if (account?.provider === 'gmail' && account.syncMode === 'demo') {
          const otherEmails = state.emails.filter((e) => e.accountId !== accountId)
          const seedGmail = SEED_EMAILS.filter((e) => e.accountId === accountId)
          emails = [...otherEmails, ...seedGmail]
        }
        const connectedEmails = emails.filter((e) => {
          const acc = state.accounts.find((a) => a.id === e.accountId)
          return acc?.connected && e.accountId !== accountId
        })

        set({
          accounts: state.accounts.map((a) =>
            a.id === accountId
              ? {
                  ...a,
                  connected: false,
                  connectedAt: undefined,
                  syncMode: undefined,
                  oauthAccessToken: undefined,
                  oauthRefreshToken: undefined,
                  oauthExpiresAt: undefined,
                  lastSyncedAt: undefined,
                  syncError: undefined,
                }
              : a,
          ),
          emails,
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
      version: 17,
      migrate: (persisted, version) => {
        const s = persisted as Record<string, unknown>
        let next = { ...s }
        if (version < 2) {
          next = {
            ...next,
            chatMessages: SEED_CHAT_MESSAGES,
            emails: SEED_EMAILS,
          }
        }
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
          const newEmails = SEED_EMAILS.filter(
            (e) =>
              (e.id.startsWith('email-junk-') || e.id === 'email-6' || e.id === 'email-7') &&
              !ids.has(e.id),
          )
          next = {
            ...next,
            emails: [...existing, ...newEmails],
            aiInboxEnabled: false,
            inboxTraining: DEFAULT_INBOX_TRAINING,
            emailInboxOverrides: {},
          }
        }
        if (version < 5) {
          next = { ...next, vaultFiles: [] }
        }
        if (version < 6) {
          next = {
            ...next,
            emailLabels: SEED_EMAIL_LABELS,
            activeLabelFilter: null,
            emails: ((next.emails as Email[]) ?? []).map((e) => ({
              ...e,
              labelIds: e.labelIds ?? [],
            })),
          }
        }
        if (version < 7) {
          next = { ...next, threadViewEnabled: false }
          const existing = (next.emails as Email[]) ?? []
          const ids = new Set(existing.map((e) => e.id))
          const threadReply = SEED_EMAILS.find((e) => e.id === 'email-1-reply')
          const sentFix = SEED_EMAILS.find((e) => e.id === 'email-sent-1')
          next = {
            ...next,
            emails: [
              ...existing.map((e) =>
                e.id === 'email-sent-1' && sentFix
                  ? { ...e, accountId: sentFix.accountId, from: sentFix.from, fromName: sentFix.fromName }
                  : e,
              ),
              ...(threadReply && !ids.has(threadReply.id) ? [threadReply] : []),
            ],
          }
        }
        if (version < 8) {
          next = {
            ...next,
            emails: ((next.emails as Email[]) ?? []).map((e) => ({
              ...e,
              scheduledAt: e.scheduledAt,
            })),
            calendarEvents: ((next.calendarEvents as CalendarEvent[]) ?? []).map((e) => ({
              ...e,
              uid: e.uid ?? `${e.id}@ethermail`,
            })),
          }
        }
        if (version < 9) {
          const workFolderIds = new Set(['projects', 'athena', ROOT_WORK_ID, 'email-files-work'])
          let folders = ((next.folders as Folder[]) ?? SEED_FOLDERS).map((f) => {
            const vaultId =
              f.vaultId ??
              (workFolderIds.has(f.id) || f.parentId === 'projects' || f.parentId === ROOT_WORK_ID
                ? VAULT_WORK_ID
                : VAULT_PERSONAL_ID)
            let parentId = f.parentId
            if ((f.id === 'projects' || f.id === 'athena') && parentId === 'root') {
              parentId = ROOT_WORK_ID
            }
            return {
              ...f,
              vaultId,
              parentId,
              name: f.id === 'root' ? 'Personal' : f.name,
            }
          })
          const folderIds = new Set(folders.map((f) => f.id))
          for (const seedFolder of SEED_FOLDERS) {
            if (!folderIds.has(seedFolder.id)) folders.push(seedFolder)
          }

          let notes = ((next.notes as Note[]) ?? []).map((n) => ({
            ...n,
            vaultId:
              n.vaultId ??
              (workFolderIds.has(n.folderId) || n.folderId === 'athena' ? VAULT_WORK_ID : VAULT_PERSONAL_ID),
          }))
          const weekend = SEED_NOTES.find((n) => n.id === 'note-weekend')
          if (weekend && !notes.some((n) => n.id === weekend.id)) {
            notes = [...notes, weekend]
          }

          const accounts = ((next.accounts as typeof SEED_ACCOUNTS) ?? []).map((a) => ({
            ...a,
            defaultVaultId:
              a.defaultVaultId ?? (a.id === 'acc-outlook' ? VAULT_WORK_ID : VAULT_PERSONAL_ID),
          }))

          const vaultFiles = ((next.vaultFiles as VaultFile[]) ?? []).map((vf) => ({
            ...vf,
            vaultId: vf.vaultId ?? VAULT_PERSONAL_ID,
          }))

          next = {
            ...next,
            vaults: SEED_VAULTS,
            activeVaultId: null,
            graphPersonFilter: null,
            folders,
            notes,
            accounts,
            vaultFiles,
            calendarEvents: SEED_CALENDAR,
          }
        }
        if (version < 10) {
          const workFolderIds = new Set(['projects', 'athena', ROOT_WORK_ID, 'email-files-work'])
          let folders = ((next.folders as Folder[]) ?? SEED_FOLDERS).map((f) => {
            const vaultId =
              f.vaultId ??
              (workFolderIds.has(f.id) || f.parentId === 'projects' || f.parentId === ROOT_WORK_ID
                ? VAULT_WORK_ID
                : VAULT_PERSONAL_ID)
            let parentId = f.parentId
            if ((f.id === 'projects' || f.id === 'athena') && parentId === 'root') {
              parentId = ROOT_WORK_ID
            }
            return {
              ...f,
              vaultId,
              parentId,
              name: f.id === 'root' ? 'Personal' : f.name,
            }
          })
          const folderIds = new Set(folders.map((f) => f.id))
          for (const seedFolder of SEED_FOLDERS) {
            if (!folderIds.has(seedFolder.id)) folders.push(seedFolder)
          }

          next = {
            ...next,
            vaults: SEED_VAULTS,
            activeVaultId: null,
            folders,
          }
        }
        if (version < 11) {
          next = { ...next, gmailSyncingAccountId: null }
        }
        if (version < 12) {
          next = { ...next, planTier: 'free' as PlanTier }
        }
        if (version < 13) {
          next = {
            ...next,
            emailFolderSort: normalizeEmailFolderSort(next.emailFolderSort),
          }
        }
        if (version < 14) {
          next = {
            ...next,
            feedbackSettings: {
              hapticEnabled: true,
              hapticSoundEnabled: true,
            },
          }
        }
        if (version < 15) {
          next = {
            ...next,
            orgPolicy: DEFAULT_ORG_POLICY,
            userRole: 'owner',
          }
        }
        if (version < 16) {
          next = {
            ...next,
            policyToast: null,
            auditLog: [],
            ssoConfig: {
              enabled: false,
              provider: 'none',
              tenantId: '',
              clientId: '',
              domain: '',
              enforceSso: false,
            },
            policySyncStatus: null,
            orgMembers: SEED_ORG_MEMBERS,
            vaultShares: [
              {
                vaultId: VAULT_WORK_ID,
                memberIds: SEED_ORG_MEMBERS.filter((m) => m.status === 'active').map((m) => m.id),
                permission: 'write',
              },
            ],
            vaults: ((next.vaults as Vault[]) ?? SEED_VAULTS).map((v) =>
              v.id === VAULT_WORK_ID ? { ...v, shared: true } : v,
            ),
          }
        }
        if (version < 17) {
          next = {
            ...next,
            orgSession: null,
            auditSyncCursor: null,
          }
        }
        return next
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.chatMessages.length === 0) {
          useEtherMailStore.setState({
            chatMessages: SEED_CHAT_MESSAGES,
          })
        }

        const workFolderIds = new Set(['projects', 'athena', ROOT_WORK_ID, 'email-files-work'])
        const repairs: Record<string, unknown> = {}
        if (!state.vaults?.length) repairs.vaults = SEED_VAULTS

        let foldersChanged = false
        const repairedFolders = state.folders.map((f) => {
          if (f.vaultId) return f
          foldersChanged = true
          let parentId = f.parentId
          if ((f.id === 'projects' || f.id === 'athena') && parentId === 'root') {
            parentId = ROOT_WORK_ID
          }
          return {
            ...f,
            parentId,
            vaultId:
              workFolderIds.has(f.id) || f.parentId === 'projects' || f.parentId === ROOT_WORK_ID
                ? VAULT_WORK_ID
                : VAULT_PERSONAL_ID,
          }
        })
        const folderIds = new Set(repairedFolders.map((f) => f.id))
        for (const seedFolder of SEED_FOLDERS) {
          if (!folderIds.has(seedFolder.id)) {
            repairedFolders.push(seedFolder)
            foldersChanged = true
          }
        }
        if (foldersChanged) repairs.folders = repairedFolders

        if (Object.keys(repairs).length > 0) {
          useEtherMailStore.setState(repairs)
        }
      },
      partialize: (s) => ({
        notes: s.notes,
        folders: s.folders,
        vaults: s.vaults,
        activeVaultId: s.activeVaultId,
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
        emailFolderSort: s.emailFolderSort,
        hiddenPanels: s.hiddenPanels,
        alertMeta: s.alertMeta,
        weatherSettings: s.weatherSettings,
        feedbackSettings: s.feedbackSettings,
        assistantSettings: s.assistantSettings,
        completedTodos: s.completedTodos,
        announcedProactive: s.announcedProactive,
        threadViewEnabled: s.threadViewEnabled,
        aiInboxEnabled: s.aiInboxEnabled,
        aiOutboxEnabled: s.aiOutboxEnabled,
        followUpFilterEnabled: s.followUpFilterEnabled,
        emailLabels: s.emailLabels,
        activeLabelFilter: s.activeLabelFilter,
        inboxTraining: s.inboxTraining,
        emailInboxOverrides: s.emailInboxOverrides,
        view: s.view,
        planTier: s.planTier,
        orgPolicy: s.orgPolicy,
        userRole: s.userRole,
        auditLog: s.auditLog,
        ssoConfig: s.ssoConfig,
        orgMembers: s.orgMembers,
        vaultShares: s.vaultShares,
        orgSession: s.orgSession,
        auditSyncCursor: s.auditSyncCursor,
      }),
    },
  ),
)

/** @deprecated use useEtherMailStore */
export const useNexusStore = useEtherMailStore

export function useGraph() {
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const accounts = useEtherMailStore((s) => s.accounts)
  const activeVaultId = useEtherMailStore((s) => s.activeVaultId)
  return useMemo(
    () => buildContactGraph(notes, emails, calendarEvents, accounts, activeVaultId),
    [notes, emails, calendarEvents, accounts, activeVaultId],
  )
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
