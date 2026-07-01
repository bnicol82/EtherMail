import { useEffect } from 'react'
import { useEtherMailStore } from './store/useStore'
import { Sidebar } from './components/Sidebar'
import { BottomBar } from './components/BottomBar'
import { Dashboard } from './components/Dashboard'
import { VaultView } from './components/VaultView'
import { EmailView } from './components/EmailView'
import { GraphView } from './components/GraphView'
import { AIView } from './components/AIView'
import { NotesView } from './components/NotesView'
import { CalendarView } from './components/CalendarView'
import { SettingsView } from './components/SettingsView'
import { AdminView } from './components/AdminView'
import { ConnectAccountModal } from './components/ConnectAccountModal'
import { ComposeEmailModal } from './components/ComposeEmailModal'
import { EventEditModal } from './components/EventEditModal'
import { CommandPalette } from './components/CommandPalette'
import { ProactiveAssistant } from './components/ProactiveAssistant'
import { PolicyToast } from './components/PolicyToast'
import { useScheduledSend } from './hooks/useScheduledSend'
import { handleOAuthCallback } from './lib/oauth/connect'
import { unlockTouchAudio } from './lib/touchFeedback'
import { buttonClickFeedback } from './lib/uiFeedback'
import { Menu, SquarePen } from 'lucide-react'

function MainContent() {
  const view = useEtherMailStore((s) => s.view)

  switch (view) {
    case 'dashboard':
      return <Dashboard />
    case 'vault':
      return <VaultView />
    case 'email':
      return <EmailView />
    case 'graph':
      return <GraphView />
    case 'calendar':
      return <CalendarView />
    case 'notes':
      return <NotesView />
    case 'ai':
      return <AIView />
    case 'settings':
      return <SettingsView />
    case 'admin':
      return <AdminView />
    default:
      return <Dashboard />
  }
}

export default function App() {
  const theme = useEtherMailStore((s) => s.theme)
  const view = useEtherMailStore((s) => s.view)
  const sidebarOpen = useEtherMailStore((s) => s.sidebarOpen)
  const setSidebarOpen = useEtherMailStore((s) => s.setSidebarOpen)
  const oauthSettings = useEtherMailStore((s) => s.oauthSettings)
  const completeOAuthConnect = useEtherMailStore((s) => s.completeOAuthConnect)
  const openCompose = useEtherMailStore((s) => s.openCompose)
  const composeDraft = useEtherMailStore((s) => s.composeDraft)

  useScheduledSend()

  const showDock = view !== 'ai' && !composeDraft

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) return

    handleOAuthCallback(code, state, oauthSettings).then((result) => {
      if (result) {
        void completeOAuthConnect(result.accountId, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        })
      }
    })
  }, [oauthSettings, completeOAuthConnect])

  useEffect(() => {
    const unlock = () => unlockTouchAudio()
    document.addEventListener('pointerdown', unlock, { passive: true })
    document.addEventListener('touchstart', unlock, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  return (
    <div className="ethermail-bg h-full min-h-dvh overflow-hidden">
      {/* App shell — sidebar + main only (fixed bars live outside this flex tree) */}
      <div className="app-shell relative z-10 flex h-full min-h-0 flex-col md:flex-row">
        <header className="md:hidden flex items-center gap-2 px-3 py-1.5 glass border-b border-[var(--glass-border)] shrink-0">
          <button
            onClick={() => {
              buttonClickFeedback()
              setSidebarOpen(!sidebarOpen)
            }}
            className="p-1.5 rounded-lg hover-theme"
            aria-label="Toggle menu"
          >
            <Menu size={18} className="text-theme" />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md shrink-0">
              E
            </div>
            <span className="font-semibold text-theme text-sm truncate">EtherMail</span>
          </div>
          <button
            onClick={() => openCompose()}
            className="p-1.5 rounded-lg btn-accent shrink-0"
            aria-label="Compose email"
          >
            <SquarePen size={16} />
          </button>
        </header>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
            fixed md:static inset-y-0 left-0 z-50 md:z-auto
            h-full shrink-0
            transition-transform duration-200 ease-out
          `}
        >
          <Sidebar />
        </div>

        <main
          className={`flex-1 w-full min-w-0 min-h-0 flex flex-col overflow-hidden pt-0 ${
            showDock ? 'pb-[6.5rem] sm:pb-[5.5rem]' : 'pb-0'
          }`}
        >
          <MainContent />
        </main>
      </div>

      {/* Fixed UI layers — hidden on full AI chat to avoid stacked inputs */}
      {showDock && <BottomBar />}
      <CommandPalette />
      <ProactiveAssistant />
      <PolicyToast />
      <ConnectAccountModal />
      <ComposeEmailModal />
      <EventEditModal />
    </div>
  )
}
