import { ArrowLeft, Key, Shield, Globe, Link2 } from 'lucide-react'
import { useNexusStore } from '../store/useStore'
import { providerLabel } from '../lib/utils'

export function SettingsView() {
  const setView = useNexusStore((s) => s.setView)
  const aiSettings = useNexusStore((s) => s.aiSettings)
  const setAISettings = useNexusStore((s) => s.setAISettings)
  const accounts = useNexusStore((s) => s.accounts)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 max-w-2xl">
      <button
        onClick={() => setView('dashboard')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-8">Configure AI providers and account connections</p>

      {/* AI Settings */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-indigo-400" />
          <h2 className="font-semibold text-white">External AI API Keys</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          External AI has <strong className="text-slate-400">no access</strong> to your vault or inbox.
          Keys are stored locally in your browser and never sent to our servers.
        </p>

        <label className="block text-sm text-slate-400 mb-2">Provider</label>
        <select
          value={aiSettings.externalProvider}
          onChange={(e) =>
            setAISettings({
              externalProvider: e.target.value as 'openai' | 'anthropic' | 'google',
            })
          }
          className="w-full mb-4 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google AI</option>
        </select>

        <label className="block text-sm text-slate-400 mb-2">API Key</label>
        <input
          type="password"
          value={aiSettings.externalApiKey}
          onChange={(e) => setAISettings({ externalApiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50"
        />
        <p className="text-xs text-slate-600 mt-2">
          Demo mode: responses are simulated on GitHub Pages. Production will call your provider directly.
        </p>
      </section>

      {/* Bridge mode */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">AI Bridge Mode</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Phase 3</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Allow Vault AI and External AI to exchange curated context packets — only when you enable it.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiSettings.bridgeEnabled}
            onChange={(e) => setAISettings({ bridgeEnabled: e.target.checked })}
            className="w-4 h-4 rounded accent-indigo-500"
          />
          <span className="text-sm text-slate-300">Enable Bridge mode</span>
        </label>
        {aiSettings.bridgeEnabled && (
          <p className="text-xs text-amber-400 mt-3">
            Bridge UI and audit log coming in Phase 3. Toggle is saved for preview.
          </p>
        )}
      </section>

      {/* AI modes explainer */}
      <section className="glass rounded-xl p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-white">AI Modes Explained</h2>
        <div className="flex gap-3">
          <Shield size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">Vault AI (RAG)</p>
            <p className="text-xs text-slate-500 mt-1">
              Retrieves context from your notes, emails, tags, and graph. Runs hybrid keyword + semantic search.
              All processing stays oriented around your private data.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Globe size={20} className="text-purple-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">External AI</p>
            <p className="text-xs text-slate-500 mt-1">
              Uses your API key to call third-party models. Sees only what you type — never your vault.
            </p>
          </div>
        </div>
      </section>

      {/* Email accounts */}
      <section className="glass rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Email Accounts</h2>
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5"
            >
              <div>
                <p className="text-sm text-white">{acc.email}</p>
                <p className="text-xs text-slate-500">{providerLabel(acc.provider)}</p>
              </div>
              {acc.connected ? (
                <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                  Demo connected
                </span>
              ) : (
                <button className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/40">
                  Connect (Phase 2)
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-4">
          Real OAuth for Gmail, Outlook, Yahoo, and Enterprise M365 ships in Phase 2.
        </p>
      </section>
    </div>
  )
}
