import { ArrowLeft, Key, Shield, Globe, Link2, Palette, Mail, CloudSun } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import { providerLabel } from '../lib/utils'
import { canUseRealOAuth } from '../lib/oauth/connect'
import { clearWeatherCache } from '../lib/weather'
import type { Theme } from '../types'

const THEMES: { id: Theme; label: string; description: string }[] = [
  { id: 'glass', label: 'Clear Glass', description: 'Luminous frosted glass with sky and violet tones' },
  { id: 'dark', label: 'Dark Frost', description: 'Dark mode with deep frosted panels' },
  { id: 'blue', label: 'Blue Frost', description: 'Shades of blue with frosted glass layers' },
]

export function SettingsView() {
  const setView = useEtherMailStore((s) => s.setView)
  const theme = useEtherMailStore((s) => s.theme)
  const setTheme = useEtherMailStore((s) => s.setTheme)
  const aiSettings = useEtherMailStore((s) => s.aiSettings)
  const setAISettings = useEtherMailStore((s) => s.setAISettings)
  const accounts = useEtherMailStore((s) => s.accounts)
  const startConnectAccount = useEtherMailStore((s) => s.startConnectAccount)
  const disconnectAccount = useEtherMailStore((s) => s.disconnectAccount)
  const oauthSettings = useEtherMailStore((s) => s.oauthSettings)
  const setOAuthSettings = useEtherMailStore((s) => s.setOAuthSettings)
  const weatherSettings = useEtherMailStore((s) => s.weatherSettings)
  const setWeatherSettings = useEtherMailStore((s) => s.setWeatherSettings)

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 max-w-2xl">
      <button
        onClick={() => setView('dashboard')}
        className="flex items-center gap-2 text-sm text-theme-muted hover:text-theme mb-4 md:mb-6"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <h1 className="text-xl md:text-2xl font-bold text-theme mb-0.5">Settings</h1>
      <p className="text-xs md:text-sm text-theme-muted mb-6 md:mb-8">Configure appearance, AI providers, and accounts</p>

      {/* Theme */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">Appearance</h2>
        </div>
        <div className="grid gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                theme === t.id ? 'nav-active' : 'glass hover-theme'
              }`}
            >
              <p className="text-sm font-medium text-theme">{t.label}</p>
              <p className="text-xs text-theme-muted mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Weather */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CloudSun size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">Weather</h2>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          Shown in the bottom dock. Uses your location when allowed, otherwise your fallback city.
        </p>
        <label className="flex items-center gap-2 text-sm text-theme-secondary mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={weatherSettings.useGeolocation}
            onChange={(e) => {
              clearWeatherCache()
              setWeatherSettings({ useGeolocation: e.target.checked })
            }}
            className="rounded border-[var(--glass-border)]"
          />
          Use device location
        </label>
        <label className="block text-sm text-theme-muted mb-2">Fallback city</label>
        <input
          value={weatherSettings.fallbackCity}
          onChange={(e) => {
            clearWeatherCache()
            setWeatherSettings({ fallbackCity: e.target.value })
          }}
          placeholder="e.g. San Francisco"
          className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
        />
      </section>

      {/* AI Settings */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">External AI API Keys</h2>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          External AI has <strong className="text-theme-secondary">no access</strong> to your vault or inbox.
          Keys are stored locally in your browser and never sent to our servers.
        </p>

        <label className="block text-sm text-theme-muted mb-2">Provider</label>
        <select
          value={aiSettings.externalProvider}
          onChange={(e) =>
            setAISettings({
              externalProvider: e.target.value as 'openai' | 'anthropic' | 'google',
            })
          }
          className="w-full mb-4 px-3 py-2 rounded-lg input-theme text-sm outline-none"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google AI</option>
        </select>

        <label className="block text-sm text-theme-muted mb-2">API Key</label>
        <input
          type="password"
          value={aiSettings.externalApiKey}
          onChange={(e) => setAISettings({ externalApiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
        />
        <p className="text-xs text-theme-muted mt-2 opacity-70">
          Demo mode: responses are simulated on GitHub Pages. Production will call your provider directly.
        </p>
      </section>

      {/* Bridge mode */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">AI Bridge Mode</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">Phase 3</span>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          Allow Vault AI and External AI to exchange curated context packets — only when you enable it.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiSettings.bridgeEnabled}
            onChange={(e) => setAISettings({ bridgeEnabled: e.target.checked })}
            className="w-4 h-4 rounded accent-[var(--accent)]"
          />
          <span className="text-sm text-theme-secondary">Enable Bridge mode</span>
        </label>
      </section>

      {/* AI modes explainer */}
      <section className="glass rounded-xl p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-theme">AI Modes Explained</h2>
        <div className="flex gap-3">
          <Shield size={20} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-theme">Vault AI (RAG)</p>
            <p className="text-xs text-theme-muted mt-1">
              Retrieves context from your notes, emails, tags, and graph. All processing stays oriented around your private data.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Globe size={20} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-theme">External AI</p>
            <p className="text-xs text-theme-muted mt-1">
              Uses your API key to call third-party models. Sees only what you type — never your vault.
            </p>
          </div>
        </div>
      </section>

      {/* OAuth client IDs */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">OAuth Client IDs</h2>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          Optional — add client IDs to enable real OAuth on GitHub Pages (PKCE, no backend).
          Leave blank to use demo connect with simulated data.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-theme-muted mb-1">Google (Gmail)</label>
            <input
              value={oauthSettings.googleClientId}
              onChange={(e) => setOAuthSettings({ googleClientId: e.target.value })}
              placeholder="xxxx.apps.googleusercontent.com"
              className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-theme-muted mb-1">Microsoft (Outlook)</label>
            <input
              value={oauthSettings.microsoftClientId}
              onChange={(e) => setOAuthSettings({ microsoftClientId: e.target.value })}
              placeholder="Application (client) ID"
              className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-theme-muted mb-1">Yahoo</label>
            <input
              value={oauthSettings.yahooClientId}
              onChange={(e) => setOAuthSettings({ yahooClientId: e.target.value })}
              placeholder="Client ID"
              className="w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
            />
          </div>
        </div>
      </section>

      {/* Email accounts */}
      <section className="glass rounded-xl p-5">
        <h2 className="font-semibold text-theme mb-4">Email Accounts</h2>
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between p-3 rounded-xl glass"
            >
              <div>
                <p className="text-sm text-theme">{acc.email}</p>
                <p className="text-xs text-theme-muted">
                  {providerLabel(acc.provider)}
                  {acc.syncMode === 'oauth' && ' · Live OAuth'}
                  {acc.syncMode === 'demo' && acc.connected && ' · Demo sync'}
                </p>
              </div>
              {acc.connected ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Connected
                  </span>
                  <button
                    onClick={() => disconnectAccount(acc.id)}
                    className="text-xs px-2 py-1 rounded-lg glass text-theme-muted hover:text-red-400"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startConnectAccount(acc.id)}
                  className="text-xs px-3 py-1.5 rounded-lg btn-accent"
                >
                  {canUseRealOAuth(acc.provider, oauthSettings) ? 'Connect' : 'Connect (demo)'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
