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
} from 'lucide-react'
import { useNexusStore } from '../store/useStore'
import { providerColor, providerLabel } from '../lib/utils'
import type { View } from '../types'

const NAV: { id: View; label: string; icon: typeof Mail }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'graph', label: 'Knowledge Graph', icon: Network },
  { id: 'vault', label: 'Vaults', icon: FolderOpen },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'ai', label: 'AI Assistant', icon: Bot },
]

export function Sidebar() {
  const view = useNexusStore((s) => s.view)
  const setView = useNexusStore((s) => s.setView)
  const accounts = useNexusStore((s) => s.accounts)
  const createNote = useNexusStore((s) => s.createNote)
  const setSidebarOpen = useNexusStore((s) => s.setSidebarOpen)
  const emails = useNexusStore((s) => s.emails)
  const unread = emails.filter((e) => !e.read).length

  const navigate = (v: View) => {
    setView(v)
    setSidebarOpen(false)
  }

  return (
    <aside className="w-64 h-full glass-strong flex flex-col border-r border-white/10 shrink-0">
      <div className="p-4 border-b border-white/10">
        <div className="hidden md:flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/30">
            N
          </div>
          <span className="font-semibold text-white text-lg">Nexus Core</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createNote()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Note
          </button>
          <button
            onClick={() => navigate('settings')}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-slate-400"
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              view === id
                ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {id === 'email' && unread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs">
                {unread}
              </span>
            )}
          </button>
        ))}

        <div className="pt-4 pb-2">
          <div className="flex items-center gap-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <Calendar size={12} />
            Calendar
            <span className="ml-auto text-indigo-400 text-[10px] normal-case">Phase 2</span>
          </div>
        </div>

        <div className="pt-2">
          <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Email Accounts
          </p>
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => navigate('email')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: providerColor(acc.provider) }}
              />
              <span className="truncate text-left flex-1">{acc.email}</span>
              {!acc.connected && (
                <span className="text-[10px] text-amber-400">Setup</span>
              )}
            </button>
          ))}
          <p className="px-3 mt-2 text-[10px] text-slate-600">
            {providerLabel('gmail')}, Outlook, Yahoo — OAuth in Phase 2
          </p>
        </div>
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="glass rounded-lg p-3 text-xs text-slate-500">
          <span className="text-indigo-400 font-medium">Phase 1 MVP</span>
          <p className="mt-1">Vault · Email · RAG AI · Graph</p>
        </div>
      </div>
    </aside>
  )
}
