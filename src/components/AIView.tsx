import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, Globe, Shield, Trash2 } from 'lucide-react'
import { useNexusStore } from '../store/useStore'
import { generateVaultAIResponse, generateExternalAIResponse } from '../lib/rag'
import { MarkdownContent } from './MarkdownContent'

const SUGGESTIONS = [
  'Summarize Q3 Plan',
  'Draft reply to Sarah',
  'Find similar notes about budget',
  'Scan for reminders',
  'How do I link an email to a note?',
]

export function AIView() {
  const notes = useNexusStore((s) => s.notes)
  const emails = useNexusStore((s) => s.emails)
  const aiMode = useNexusStore((s) => s.aiMode)
  const setAiMode = useNexusStore((s) => s.setAiMode)
  const chatMessages = useNexusStore((s) => s.chatMessages)
  const addChatMessage = useNexusStore((s) => s.addChatMessage)
  const clearChat = useNexusStore((s) => s.clearChat)
  const aiSettings = useNexusStore((s) => s.aiSettings)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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
          ? await generateVaultAIResponse(last.content, notes, emails)
          : await generateExternalAIResponse(
              last.content,
              aiSettings.externalApiKey,
              aiSettings.externalProvider,
            )
      addChatMessage({ role: 'assistant', content, mode: last.mode })
      setLoading(false)
    }
    const t = setTimeout(respond, 600)
    return () => clearTimeout(t)
  }, [chatMessages, notes, emails, aiSettings, addChatMessage])

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    addChatMessage({ role: 'user', content: q, mode: aiMode })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-[var(--glass-border)] glass shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-theme">AI Assistant</h1>
            <p className="text-sm text-theme-muted mt-0.5">
              Private vault AI with optional external models
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAiMode('vault')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                aiMode === 'vault'
                  ? 'bg-[var(--accent)] text-white'
                  : 'glass text-theme-secondary hover-theme hover:text-theme'
              }`}
            >
              <Shield size={16} />
              Vault AI (RAG)
            </button>
            <button
              onClick={() => setAiMode('external')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                aiMode === 'external'
                  ? 'bg-purple-600 text-white'
                  : 'glass text-theme-secondary hover-theme hover:text-theme'
              }`}
            >
              <Globe size={16} />
              External AI
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          {aiMode === 'vault' ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles size={12} /> Has access to your vault, emails, and links
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Globe size={12} /> No vault access — general knowledge only
            </span>
          )}
          {aiSettings.bridgeEnabled && (
            <span className="text-accent">· Bridge enabled (Phase 3)</span>
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

      <div className="p-4 border-t border-[var(--glass-border)] glass shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={
              aiMode === 'vault'
                ? 'Ask about your vault...'
                : 'Ask a general question (no vault context)...'
            }
            className="flex-1 px-4 py-3 rounded-xl input-theme text-base"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-theme transition-colors"
          >
            <Send size={18} />
          </button>
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-3 rounded-xl glass hover-theme text-theme-secondary"
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
