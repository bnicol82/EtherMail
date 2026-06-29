import { useEffect } from 'react'
import { useEtherMailStore } from './store/useStore'
import { Sidebar } from './components/Sidebar'
import { BottomBar } from './components/BottomBar'
import { AIContextStrip } from './components/AIContextStrip'
import { Dashboard } from './components/Dashboard'
import { VaultView } from './components/VaultView'
import { EmailView } from './components/EmailView'
import { GraphView } from './components/GraphView'
import { AIView } from './components/AIView'
import { SettingsView } from './components/SettingsView'
import { Menu } from 'lucide-react'

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
    case 'ai':
      return <AIView />
    case 'settings':
      return <SettingsView />
    default:
      return <Dashboard />
  }
}

export default function App() {
  const theme = useEtherMailStore((s) => s.theme)
  const sidebarOpen = useEtherMailStore((s) => s.sidebarOpen)
  const setSidebarOpen = useEtherMailStore((s) => s.setSidebarOpen)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="ethermail-bg h-full flex flex-col md:flex-row overflow-hidden">
      <header className="md:hidden flex items-center gap-3 px-4 py-3 glass border-b border-[var(--glass-border)] shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover-theme"
          aria-label="Toggle menu"
        >
          <Menu size={20} className="text-theme" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
            E
          </div>
          <span className="font-semibold text-theme">EtherMail</span>
        </div>
      </header>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:relative z-50 md:z-auto
          h-full md:h-auto shrink-0
          transition-transform duration-200
        `}
      >
        <Sidebar />
      </div>

      <main className="flex-1 w-full min-w-0 flex flex-col min-h-0 overflow-hidden pb-[108px] sm:pb-[100px]">
        <MainContent />
      </main>

      <AIContextStrip />
      <BottomBar />
    </div>
  )
}
