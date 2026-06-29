import {
  LayoutDashboard,
  Network,
  FolderOpen,
  Calendar,
  Bot,
  Mail,
  Plus,
  Settings,
  X,
  Inbox,
  FileText,
  SquarePen,
} from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { providerColor } from '../lib/utils'
import type { View } from '../types'

const NAV: { id: View; label: string; icon: typeof Mail }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'vault', label: 'Vault', icon: FolderOpen },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'graph', label: 'Graph', icon: Network },
]

export function Sidebar() {
  const view = useEtherMailStore((s) => s.view)
  const setView = useEtherMailStore((s) => s.setView)
  const accounts = useEtherMailStore((s) => s.accounts)
  const createNote = useEtherMailStore((s) => s.createNote)
  const setSidebarOpen = useEtherMailStore((s) => s.setSidebarOpen)
  const emails = useEtherMailStore((s) => s.emails)
  const activeAccountId = useEtherMailStore((s) => s.activeAccountId)
  const selectAccount = useEtherMailStore((s) => s.selectAccount)
  const startConnectAccount = useEtherMailStore((s) => s.startConnectAccount)
  const setSearchQuery = useEtherMailStore((s) => s.setSearchQuery)
  const openCompose = useEtherMailStore((s) => s.openCompose)
  const unread = emails.filter((e) => {
    const acc = accounts.find((a) => a.id === e.accountId)
    return acc?.connected && !e.read
  }).length

  const navigate = (v: View) => {
    if (v === 'email') selectAccount(null)
    if (v === 'notes') setSearchQuery('')
    setView(v)
    setSidebarOpen(false)
  }

  const accountUnread = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId)
    if (!acc?.connected) return 0
    return emails.filter((e) => e.accountId === accountId && !e.read).length
  }

  return (
    <aside className="w-64 h-full glass-strong flex flex-col border-r border-[var(--glass-border)] shrink-0">
      <div className="p-3 md:p-4 border-b border-[var(--glass-border)]">
        <div className="hidden md:flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
            E
          </div>
          <span className="font-semibold text-theme text-lg tracking-tight">EtherMail</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createNote()}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs md:text-sm font-medium transition-colors shadow-md"
          >
            <Plus size={15} />
            New Note
          </button>
          <button
            onClick={() => {
              openCompose()
              setSidebarOpen(false)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl glass hover-theme text-theme text-xs md:text-sm font-medium transition-colors border border-[var(--glass-border)]"
          >
            <SquarePen size={15} />
            Compose
          </button>
          <button
            onClick={() => navigate('settings')}
            className="p-1.5 md:p-2 rounded-xl hover-theme text-theme-muted shrink-0"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-xl hover-theme text-theme-muted shrink-0"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              view === id && (id !== 'email' || !activeAccountId)
                ? 'nav-active'
                : 'text-theme-muted hover-theme hover:text-theme'
            }`}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {id === 'email' && unread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white text-xs">
                {unread}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => navigate('ai')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mt-2 ${
            view === 'ai'
              ? 'nav-active'
              : 'text-theme-muted hover-theme hover:text-theme'
          }`}
        >
          <Bot size={18} />
          <span className="flex-1 text-left">AI Assistant</span>
        </button>

        <div className="pt-2">
          <p className="px-3 text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">
            Email Accounts
          </p>

          <button
            onClick={() => {
              selectAccount(null)
              setSidebarOpen(false)
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors mb-1 ${
              view === 'email' && !activeAccountId
                ? 'nav-active'
                : 'text-theme-muted hover-theme hover:text-theme'
            }`}
          >
            <Inbox size={16} className="shrink-0" />
            <span className="truncate text-left flex-1">All Inboxes</span>
            {unread > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-accent">
                {unread}
              </span>
            )}
          </button>

          {accounts.map((acc) => {
            const unreadCount = accountUnread(acc.id)
            const isActive = view === 'email' && activeAccountId === acc.id
            return (
              <button
                key={acc.id}
                onClick={() => {
                  if (acc.connected) {
                    selectAccount(acc.id)
                    setSidebarOpen(false)
                  } else {
                    startConnectAccount(acc.id)
                    setSidebarOpen(false)
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'nav-active'
                    : 'text-theme-muted hover-theme hover:text-theme'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: providerColor(acc.provider) }}
                />
                <span className="truncate text-left flex-1">{acc.email}</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-accent">
                    {unreadCount}
                  </span>
                )}
                {!acc.connected && (
                  <span className="text-[10px] text-amber-500">Connect</span>
                )}
              </button>
            )
          })}
          <p className="px-3 mt-2 text-[10px] text-theme-muted opacity-70">
            Tap an account to filter inbox · tap disconnected to connect
          </p>
        </div>
      </nav>

      <div className="p-3 border-t border-[var(--glass-border)]">
        <div className="glass rounded-xl p-3 text-xs text-theme-muted">
          <span className="text-accent font-medium">EtherMail</span>
          <p className="mt-1">Vault · Email · RAG AI · Graph</p>
        </div>
      </div>
    </aside>
  )
}
