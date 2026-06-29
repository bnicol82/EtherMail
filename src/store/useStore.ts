import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SEED_ACCOUNTS,
  SEED_CALENDAR,
  SEED_EMAILS,
  SEED_FOLDERS,
  SEED_NOTES,
  buildGraphFromData,
} from '../data/seed'
import type {
  AISettings,
  ChatMessage,
  Email,
  Note,
  Theme,
  View,
} from '../types'
import { generateVaultAIResponse } from '../lib/rag'

interface EtherMailState {
  view: View
  setView: (view: View) => void

  theme: Theme
  setTheme: (theme: Theme) => void

  notes: Note[]
  folders: typeof SEED_FOLDERS
  emails: Email[]
  accounts: typeof SEED_ACCOUNTS
  calendarEvents: typeof SEED_CALENDAR

  activeNoteId: string | null
  activeEmailId: string | null
  activeFolderId: string
  activeAccountId: string | null

  editorMode: 'edit' | 'preview' | 'split'
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void

  searchQuery: string
  setSearchQuery: (q: string) => void

  aiAssistantOpen: boolean
  setAiAssistantOpen: (open: boolean) => void

  aiLoading: boolean
  aiContextResponse: string | null
  submitAiQuery: (query: string, contextPrefix?: string) => Promise<void>
  clearAiContextResponse: () => void

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
  selectAccount: (accountId: string | null) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  createNote: (folderId?: string) => string
  linkEmailToNote: (emailId: string, noteId: string | null) => void
  markEmailRead: (emailId: string) => void

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
      accounts: SEED_ACCOUNTS,
      calendarEvents: SEED_CALENDAR,

      activeNoteId: 'note-research',
      activeEmailId: 'email-1',
      activeFolderId: 'athena',
      activeAccountId: null,

      editorMode: 'split',
      setEditorMode: (editorMode) => set({ editorMode }),

      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      aiAssistantOpen: false,
      setAiAssistantOpen: (aiAssistantOpen) => set({ aiAssistantOpen }),

      aiLoading: false,
      aiContextResponse: null,
      submitAiQuery: async (query, contextPrefix = '') => {
        const state = get()
        set({ aiLoading: true })
        state.addChatMessage({ role: 'user', content: query, mode: 'vault' })
        const fullQuery = contextPrefix ? `${contextPrefix}${query}` : query
        const reply = await generateVaultAIResponse(fullQuery, state.notes, state.emails)
        state.addChatMessage({ role: 'assistant', content: reply, mode: 'vault' })
        set({ aiLoading: false, aiContextResponse: reply, aiAssistantOpen: true })
      },
      clearAiContextResponse: () => set({ aiContextResponse: null, aiAssistantOpen: false }),

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

      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      mobilePanel: 'list',
      setMobilePanel: (mobilePanel) => set({ mobilePanel }),
    }),
    {
      name: 'ethermail-v1',
      partialize: (s) => ({
        notes: s.notes,
        emails: s.emails,
        theme: s.theme,
        aiSettings: {
          ...s.aiSettings,
          externalApiKey: '',
        },
        chatMessages: s.chatMessages.slice(-50),
        activeNoteId: s.activeNoteId,
        activeEmailId: s.activeEmailId,
        activeAccountId: s.activeAccountId,
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
