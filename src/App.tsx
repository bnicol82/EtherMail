import { useEffect } from 'react'
import { useNexusStore } from './store/useStore'
import { Sidebar } from './components/Sidebar'
import { CommandBar } from './components/CommandBar'
import { Dashboard } from './components/Dashboard'
import { VaultView } from './components/VaultView'
import { EmailView } from './components/EmailView'
import { GraphView } from './components/GraphView'
import { AIView } from './components/AIView'
import { SettingsView } from './components/SettingsView'
import { Menu } from 'lucide-react'

function MainContent() {
  const view = useNexusStore((s) => s.view)

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
  const setCommandOpen = useNexusStore((s) => s.setCommandOpen)
  const sidebarOpen = useNexusStore((s) => s.sidebarOpen)
  const setSidebarOpen = useNexusStore((s) => s.setSidebarOpen)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandOpen])

  return (
    <div className="nexus-bg h-full flex flex-col md:flex-row overflow-hidden">
      {/* Mobile header */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 glass border-b border-white/10 shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
            N
          </div>
          <span className="font-semibold text-white">Nexus Core</span>
        </div>
      </header>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:relative z-50 md:z-auto
          h-full md:h-auto
          transition-transform duration-200
        `}
      >
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <MainContent />
      </main>

      <CommandBar />
    </div>
  )
}
