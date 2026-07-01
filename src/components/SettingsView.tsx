import { ArrowLeft, Key, Shield, Globe, Link2, Palette, Mail, CloudSun, Mic, Volume2, Bot, Trash2, RefreshCw, Sparkles, Vibrate } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useEtherMailStore } from '../store/useStore'
import { providerLabel } from '../lib/utils'
import { canUseRealOAuth } from '../lib/oauth/connect'
import { canConnectMailbox, PLAN_LABELS, planLimits } from '../lib/plan'
import { clearWeatherCache } from '../lib/weather'
import { getAvailableVoices, speakText, isListeningSupported, isSpeechSupported } from '../lib/voice'
import { buttonClickFeedback } from '../lib/uiFeedback'
import { useFeatureGate } from '../hooks/useFeatureGate'
import type { AssistantPersonality, Theme } from '../types'

const THEMES: { id: Theme; label: string; description: string }[] = [
  { id: 'glass', label: 'Clear Glass', description: 'Luminous frosted glass with sky and violet tones' },
  { id: 'dark', label: 'Dark Frost', description: 'Dark mode with deep frosted panels' },
  { id: 'blue', label: 'Blue Frost', description: 'Shades of blue with frosted glass layers' },
]

const PERSONALITIES: { id: AssistantPersonality; label: string }[] = [
  { id: 'friendly', label: 'Friendly — warm and conversational' },
  { id: 'professional', label: 'Professional — clear and businesslike' },
  { id: 'concise', label: 'Concise — brief and to the point' },
  { id: 'warm', label: 'Warm — supportive and encouraging' },
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
  const syncGmailInbox = useEtherMailStore((s) => s.syncGmailInbox)
  const connectGmailDemo = useEtherMailStore((s) => s.connectGmailDemo)
  const gmailSyncingAccountId = useEtherMailStore((s) => s.gmailSyncingAccountId)
  const planTier = useEtherMailStore((s) => s.planTier)
  const oauthSettings = useEtherMailStore((s) => s.oauthSettings)
  const setOAuthSettings = useEtherMailStore((s) => s.setOAuthSettings)
  const weatherSettings = useEtherMailStore((s) => s.weatherSettings)
  const setWeatherSettings = useEtherMailStore((s) => s.setWeatherSettings)
  const assistantSettings = useEtherMailStore((s) => s.assistantSettings)
  const setAssistantSettings = useEtherMailStore((s) => s.setAssistantSettings)
  const inboxTraining = useEtherMailStore((s) => s.inboxTraining)
  const clearInboxTraining = useEtherMailStore((s) => s.clearInboxTraining)
  const aiInboxEnabled = useEtherMailStore((s) => s.aiInboxEnabled)
  const setAiInboxEnabled = useEtherMailStore((s) => s.setAiInboxEnabled)
  const feedbackSettings = useEtherMailStore((s) => s.feedbackSettings)
  const setFeedbackSettings = useEtherMailStore((s) => s.setFeedbackSettings)
  const userRole = useEtherMailStore((s) => s.userRole)
  const canAccessAdmin = userRole === 'admin' || userRole === 'owner'
  const canExternalAi = useFeatureGate('external_ai')
  const canBridge = useFeatureGate('ai_bridge')
  const canOAuthByo = useFeatureGate('oauth_byo_client')

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const load = () => setVoices(getAvailableVoices())
    load()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const testVoice = () => {
    const name = assistantSettings.userName || 'there'
    speakText(
      `Hey ${name}, I'm your EtherMail assistant. I'll let you know about new emails and upcoming meetings.`,
      assistantSettings,
    ).catch(() => {})
  }

  const connectedMailboxCount = accounts.filter((a) => a.connected).length
  const limits = planLimits(planTier)
  const mailboxLimitReached = !canConnectMailbox(connectedMailboxCount, planTier)

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

      {/* Plan */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">Plan</h2>
        </div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-theme">{PLAN_LABELS[planTier]} plan</p>
            <p className="text-xs text-theme-muted mt-0.5">
              {connectedMailboxCount} of {limits.maxMailboxes === Number.POSITIVE_INFINITY ? '∞' : limits.maxMailboxes}{' '}
              mailboxes · {limits.aiQueriesPerMonth === Number.POSITIVE_INFINITY ? 'Unlimited' : limits.aiQueriesPerMonth}{' '}
              AI queries/mo
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-accent/15 text-accent font-medium">
            {PLAN_LABELS[planTier]}
          </span>
        </div>
        {mailboxLimitReached && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Mailbox limit reached on the Free plan. Upgrade to Pro to connect more accounts.
          </p>
        )}
      </section>

      {canAccessAdmin && (
        <section className="glass rounded-xl p-5 mb-6 border border-[var(--accent-border)]/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={18} className="text-accent" />
                <h2 className="font-semibold text-theme">Organization admin</h2>
              </div>
              <p className="text-xs text-theme-muted">
                Manage feature allow/deny policy for all members.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('admin')}
              className="shrink-0 px-4 py-2 rounded-xl btn-accent text-sm font-medium"
            >
              Open admin
            </button>
          </div>
        </section>
      )}

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

      {/* Touch feedback */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Vibrate size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">Touch feedback</h2>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          Controls vibration and click sounds when scrolling the calendar, sidebar menu, and header buttons.
          On iPhone, vibration is not available in the browser — use haptic sound instead.
        </p>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={feedbackSettings.hapticEnabled}
              onChange={(e) => setFeedbackSettings({ hapticEnabled: e.target.checked })}
              className="rounded border-[var(--glass-border)]"
            />
            Haptic vibration
          </label>
          <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={feedbackSettings.hapticSoundEnabled}
              onChange={(e) => setFeedbackSettings({ hapticSoundEnabled: e.target.checked })}
              className="rounded border-[var(--glass-border)]"
            />
            Haptic sound
          </label>
        </div>
        <button
          type="button"
          onClick={() => buttonClickFeedback()}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm text-theme-secondary hover-theme"
        >
          <Vibrate size={16} />
          Test feedback
        </button>
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

      {/* AI Assistant voice & personality */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Mic size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">AI Assistant</h2>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          Configure how your assistant speaks — proactive email alerts, meeting reminders, and voice chat.
        </p>

        {!isSpeechSupported() && (
          <p className="text-xs text-amber-400 mb-3">Voice output is not supported in this browser.</p>
        )}
        {!isListeningSupported() && (
          <p className="text-xs text-amber-400 mb-3">Voice input requires Chrome or Edge.</p>
        )}

        <label className="block text-sm text-theme-muted mb-2">Your name (for greetings)</label>
        <input
          value={assistantSettings.userName}
          onChange={(e) => setAssistantSettings({ userName: e.target.value })}
          placeholder="Billy"
          className="w-full mb-4 px-3 py-2 rounded-lg input-theme text-sm outline-none"
        />

        <label className="block text-sm text-theme-muted mb-2">Personality</label>
        <select
          value={assistantSettings.personality}
          onChange={(e) => setAssistantSettings({ personality: e.target.value as AssistantPersonality })}
          className="w-full mb-4 px-3 py-2 rounded-lg input-theme text-sm outline-none"
        >
          {PERSONALITIES.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <label className="block text-sm text-theme-muted mb-2">Voice</label>
        <select
          value={assistantSettings.voiceURI}
          onChange={(e) => setAssistantSettings({ voiceURI: e.target.value })}
          className="w-full mb-4 px-3 py-2 rounded-lg input-theme text-sm outline-none"
        >
          <option value="">System default</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-theme-muted mb-1">Speed ({assistantSettings.voiceRate.toFixed(1)}×)</label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={assistantSettings.voiceRate}
              onChange={(e) => setAssistantSettings({ voiceRate: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs text-theme-muted mb-1">Pitch ({assistantSettings.voicePitch.toFixed(1)})</label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={assistantSettings.voicePitch}
              onChange={(e) => setAssistantSettings({ voicePitch: parseFloat(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </div>
        </div>

        <label className="block text-sm text-theme-muted mb-2">Meeting reminder (minutes before)</label>
        <input
          type="number"
          min={1}
          max={60}
          value={assistantSettings.meetingReminderMinutes}
          onChange={(e) =>
            setAssistantSettings({ meetingReminderMinutes: Math.max(1, parseInt(e.target.value, 10) || 10) })
          }
          className="w-full mb-4 px-3 py-2 rounded-lg input-theme text-sm outline-none"
        />

        <div className="space-y-3 mb-4">
          <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={assistantSettings.proactiveEnabled}
              onChange={(e) => setAssistantSettings({ proactiveEnabled: e.target.checked })}
              className="rounded border-[var(--glass-border)]"
            />
            Proactive voice announcements
          </label>
          <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={assistantSettings.announceNewEmails}
              onChange={(e) => setAssistantSettings({ announceNewEmails: e.target.checked })}
              className="rounded border-[var(--glass-border)]"
            />
            Announce new emails
          </label>
          <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={assistantSettings.voiceChatEnabled}
              onChange={(e) => setAssistantSettings({ voiceChatEnabled: e.target.checked })}
              className="rounded border-[var(--glass-border)]"
            />
            Voice chat in AI Assistant
          </label>
        </div>

        <button
          type="button"
          onClick={testVoice}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-accent text-sm"
        >
          <Volume2 size={16} />
          Test voice
        </button>
      </section>

      {/* AI Inbox */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">AI Inbox</h2>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          Filters spam, marketing, newsletters, and suspicious mail so you only see what matters.
          Train the AI from any email with <strong className="text-theme-secondary">Always important</strong> or <strong className="text-theme-secondary">Not important</strong>.
        </p>
        <label className="flex items-center gap-2 text-sm text-theme-secondary mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={aiInboxEnabled}
            onChange={(e) => setAiInboxEnabled(e.target.checked)}
            className="rounded border-[var(--glass-border)]"
          />
          Enable AI Inbox by default when opening Email
        </label>
        <div className="grid sm:grid-cols-2 gap-4 text-xs mb-4">
          <div>
            <p className="text-theme-muted mb-1 font-medium">Trusted senders ({inboxTraining.importantSenders.length})</p>
            <ul className="space-y-0.5 text-theme-secondary max-h-24 overflow-y-auto">
              {inboxTraining.importantSenders.length === 0 ? (
                <li className="text-theme-muted">None yet</li>
              ) : (
                inboxTraining.importantSenders.map((s) => <li key={s} className="truncate">{s}</li>)
              )}
            </ul>
          </div>
          <div>
            <p className="text-theme-muted mb-1 font-medium">Blocked senders ({inboxTraining.junkSenders.length})</p>
            <ul className="space-y-0.5 text-theme-secondary max-h-24 overflow-y-auto">
              {inboxTraining.junkSenders.length === 0 ? (
                <li className="text-theme-muted">None yet — train from inbox</li>
              ) : (
                inboxTraining.junkSenders.map((s) => <li key={s} className="truncate">{s}</li>)
              )}
            </ul>
          </div>
        </div>
        <button
          type="button"
          onClick={clearInboxTraining}
          className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-theme-muted hover:text-red-400"
        >
          <Trash2 size={14} />
          Reset AI Inbox training
        </button>
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

        {!canExternalAi ? (
          <p className="text-xs text-amber-500">External AI is disabled by your organization admin.</p>
        ) : (
        <>
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
        </>
        )}
      </section>

      {/* Bridge mode */}
      <section className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={18} className="text-accent" />
          <h2 className="font-semibold text-theme">AI Bridge Mode</h2>
        </div>
        <p className="text-sm text-theme-muted mb-4">
          When enabled, External AI receives curated vault excerpts (notes, emails, calendar) as a context packet — never your full vault.
        </p>
        {!canBridge ? (
          <p className="text-xs text-amber-500">Bridge mode is disabled by your organization admin.</p>
        ) : (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiSettings.bridgeEnabled}
            onChange={(e) => setAISettings({ bridgeEnabled: e.target.checked })}
            className="w-4 h-4 rounded accent-[var(--accent)]"
          />
          <span className="text-sm text-theme-secondary">Enable Bridge mode</span>
        </label>
        )}
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
              Uses your API key to call third-party models. With Bridge mode, receives curated vault excerpts only.
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
          Leave blank to use demo connect with simulated data. Gmail sync requires a Google client ID
          with Gmail API enabled.
        </p>
        {!canOAuthByo ? (
          <p className="text-xs text-amber-500">Custom OAuth clients are disabled by your organization admin.</p>
        ) : (
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
        )}
      </section>

      {/* Email accounts */}
      <section className="glass rounded-xl p-5">
        <h2 className="font-semibold text-theme mb-4">Email Accounts</h2>
        <div className="space-y-3">
          {accounts.map((acc) => {
            const isGmailOAuth = acc.provider === 'gmail' && acc.syncMode === 'oauth'
            const isGmailDemo = acc.provider === 'gmail' && acc.syncMode === 'demo' && acc.connected
            const isSyncing = gmailSyncingAccountId === acc.id
            return (
            <div
              key={acc.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl glass"
            >
              <div className="min-w-0">
                <p className="text-sm text-theme truncate">{acc.email}</p>
                <p className="text-xs text-theme-muted">
                  {providerLabel(acc.provider)}
                  {acc.syncMode === 'oauth' && ' · Live Gmail sync'}
                  {acc.syncMode === 'demo' && acc.connected && acc.provider === 'gmail' && ' · Gmail demo inbox'}
                  {acc.syncMode === 'demo' && acc.connected && acc.provider !== 'gmail' && ' · Demo sync'}
                </p>
                {acc.lastSyncedAt && (
                  <p className="text-[10px] text-theme-muted mt-0.5">
                    Last synced {new Date(acc.lastSyncedAt).toLocaleString()}
                  </p>
                )}
                {acc.syncError && (
                  <p className="text-[10px] text-red-400 mt-0.5">{acc.syncError}</p>
                )}
              </div>
              {acc.connected ? (
                <div className="flex items-center gap-2 shrink-0">
                  {(isGmailOAuth || isGmailDemo) && (
                    <button
                      type="button"
                      onClick={() =>
                        void (isGmailDemo ? connectGmailDemo(acc.id) : syncGmailInbox(acc.id))
                      }
                      disabled={isSyncing}
                      className="text-xs px-2 py-1 rounded-lg glass text-theme-secondary hover-theme inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                      {isSyncing ? 'Syncing' : 'Sync'}
                    </button>
                  )}
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
                  disabled={mailboxLimitReached}
                  className="text-xs px-3 py-1.5 rounded-lg btn-accent shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={mailboxLimitReached ? 'Upgrade to Pro to connect more mailboxes' : undefined}
                >
                  {canUseRealOAuth(acc.provider, oauthSettings) ? 'Connect' : 'Connect (demo)'}
                </button>
              )}
            </div>
          )})}
        </div>
      </section>
    </div>
  )
}
