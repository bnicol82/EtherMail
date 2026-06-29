import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, Globe, Shield, Trash2, Mic, Loader2 } from 'lucide-react'
import { useEtherMailStore, useUnreadAlertCount } from '../store/useStore'
import { generateVaultAIResponse, generateExternalAIResponse } from '../lib/rag'
import { MarkdownContent } from './MarkdownContent'
import { AIAlertsPanel } from './AIAlertsPanel'
import { listenOnce, speakText, isListeningSupported, stopSpeaking } from '../lib/voice'
import { formatAssistantReplyForSpeech } from '../lib/proactiveAssistant'

const SUGGESTIONS = [
  'Prep for my next meeting',
  'Show emails needing follow-up',
  'Propose meeting times',
  'Summarize Q3 Plan',
  'Draft reply to Sarah',
  'Scan for reminders',
]

export function AIView() {
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const calendarEvents = useEtherMailStore((s) => s.calendarEvents)
  const aiMode = useEtherMailStore((s) => s.aiMode)
  const setAiMode = useEtherMailStore((s) => s.setAiMode)
  const chatMessages = useEtherMailStore((s) => s.chatMessages)
  const addChatMessage = useEtherMailStore((s) => s.addChatMessage)
  const clearChat = useEtherMailStore((s) => s.clearChat)
  const aiSettings = useEtherMailStore((s) => s.aiSettings)
  const assistantSettings = useEtherMailStore((s) => s.assistantSettings)
  const unreadAlertCount = useUnreadAlertCount()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const speakNextResponse = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chatMessages, loading])

  // Auto-respond to pending user messages
  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1]
    if (!last || last.role !== 'user') return

    const hasResponse = chatMessages.some(
      (m, i) => i > chatMessages.indexOf(last) && m.role === 'assistant',
    )
    if (hasResponse) return

    setLoading(true)
    const respond = async () => {
      const content =
        last.mode === 'vault'
          ? await generateVaultAIResponse(last.content, notes, emails, { calendarEvents })
          : await generateExternalAIResponse(
              last.content,
              aiSettings.externalApiKey,
              aiSettings.externalProvider,
              aiSettings.bridgeEnabled,
              aiSettings.bridgeEnabled ? notes : [],
              aiSettings.bridgeEnabled ? emails : [],
              aiSettings.bridgeEnabled ? calendarEvents : [],
            )
      addChatMessage({ role: 'assistant', content, mode: last.mode })

      if (speakNextResponse.current && assistantSettings.voiceChatEnabled) {
        speakNextResponse.current = false
        const spoken = formatAssistantReplyForSpeech(content)
        speakText(spoken, assistantSettings).catch(() => {})
      }

      setLoading(false)
    }
    const t = setTimeout(respond, 600)
    return () => clearTimeout(t)
  }, [chatMessages, notes, emails, calendarEvents, aiSettings, assistantSettings, addChatMessage])

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    addChatMessage({ role: 'user', content: q, mode: aiMode })
  }

  const startVoice = async () => {
    if (!assistantSettings.voiceChatEnabled || loading || listening) return
    if (!isListeningSupported()) {
      setVoiceError('Voice input not supported in this browser')
      return
    }
    setVoiceError(null)
    stopSpeaking()
    setListening(true)
    try {
      const transcript = await listenOnce()
      speakNextResponse.current = true
      addChatMessage({ role: 'user', content: transcript, mode: aiMode })
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Could not hear you')
    } finally {
      setListening(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-3 py-2 sm:p-4 md:p-6 border-b border-[var(--glass-border)] glass shrink-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-theme flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">AI Assistant</span>
              {unreadAlertCount > 0 && (
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium shrink-0">
                  {unreadAlertCount}
                </span>
              )}
            </h1>
            <p className="hidden sm:block text-sm text-theme-muted mt-0.5">
              Private vault AI with voice chat
            </p>
          </div>
          <div className="flex gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setAiMode('vault')}
              title="Vault AI (RAG)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                aiMode === 'vault'
                  ? 'bg-[var(--accent)] text-white'
                  : 'glass text-theme-secondary hover-theme hover:text-theme'
              }`}
            >
              <Shield size={15} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Vault AI (RAG)</span>
            </button>
            <button
              onClick={() => setAiMode('external')}
              title="External AI"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                aiMode === 'external'
                  ? 'bg-purple-600 text-white'
                  : 'glass text-theme-secondary hover-theme hover:text-theme'
              }`}
            >
              <Globe size={15} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">External AI</span>
            </button>
          </div>
        </div>

        <div className="hidden sm:flex mt-2 sm:mt-3 items-center gap-2 text-xs">
          {aiMode === 'vault' ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles size={12} /> Has access to your vault, emails, and links
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Globe size={12} />
              {aiSettings.bridgeEnabled
                ? 'Bridge on — curated vault excerpts may be attached'
                : 'No vault access — general knowledge only'}
            </span>
          )}
          {assistantSettings.voiceChatEnabled && (
            <span className="text-accent flex items-center gap-1">
              <Mic size={12} /> Voice chat on
            </span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-4 min-h-0">
        {chatMessages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles size={40} className="mx-auto text-accent mb-4 opacity-60" />
            <p className="text-theme-secondary mb-6">
              {aiMode === 'vault'
                ? 'Ask anything about your notes, emails, and projects.'
                : 'Ask general questions. Your vault data stays private.'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setAiMode('vault')
                    addChatMessage({ role: 'user', content: s, mode: 'vault' })
                  }}
                  className="px-3 py-1.5 rounded-full glass text-xs text-theme-secondary hover-theme hover:text-theme"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-accent-soft border border-accent'
                  : 'glass border border-[var(--glass-border)]'
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider mb-1 text-theme-muted">
                {m.role === 'user' ? 'You' : m.mode === 'vault' ? 'Vault AI' : 'External AI'}
              </p>
              {m.role === 'assistant' ? (
                <div className="text-sm text-theme-secondary prose-sm">
                  <MarkdownContent content={m.content} />
                </div>
              ) : (
                <p className="text-sm text-theme">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="glass rounded-xl px-4 py-3 text-sm text-theme-secondary animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <AIAlertsPanel variant="dock" />

      <div className="p-3 sm:p-4 border-t border-[var(--glass-border)] glass shrink-0">
        {voiceError && (
          <p className="text-xs text-red-400 mb-2 text-center">{voiceError}</p>
        )}
        <div className="flex gap-2 max-w-3xl mx-auto">
          {assistantSettings.voiceChatEnabled && (
            <button
              onClick={startVoice}
              disabled={loading || listening}
              className={`px-3 sm:px-4 py-3 rounded-xl transition-colors shrink-0 ${
                listening
                  ? 'bg-red-500/20 text-red-400 animate-pulse'
                  : 'glass hover-theme text-theme-secondary'
              }`}
              title={listening ? 'Listening…' : 'Voice input'}
              aria-label="Voice input"
            >
              {listening ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={
              listening
                ? 'Listening…'
                : aiMode === 'vault'
                  ? 'Ask about your vault...'
                  : 'Ask a general question...'
            }
            disabled={listening}
            className="flex-1 px-4 py-3 rounded-xl input-theme text-base min-w-0"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim() || listening}
            className="px-4 py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-theme transition-colors shrink-0"
          >
            <Send size={18} />
          </button>
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-3 rounded-xl glass hover-theme text-theme-secondary shrink-0"
              title="Clear chat"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
