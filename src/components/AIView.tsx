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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-20">
      <div className="p-4 md:p-6 border-b border-white/10 glass shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Private vault AI with optional external models
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAiMode('vault')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                aiMode === 'vault'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white'
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
                  : 'bg-white/5 text-slate-400 hover:text-white'
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
            <span className="text-indigo-400">· Bridge enabled (Phase 3)</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {chatMessages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles size={40} className="mx-auto text-indigo-400 mb-4 opacity-60" />
            <p className="text-slate-400 mb-6">
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
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-white hover:bg-white/10"
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
                  ? 'bg-indigo-600/40 border border-indigo-500/30'
                  : 'glass border border-white/10'
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider mb-1 text-slate-500">
                {m.role === 'user' ? 'You' : m.mode === 'vault' ? 'Vault AI' : 'External AI'}
              </p>
              {m.role === 'assistant' ? (
                <div className="text-sm text-slate-300 prose-sm">
                  <MarkdownContent content={m.content} />
                </div>
              ) : (
                <p className="text-sm text-white">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="glass rounded-xl px-4 py-3 text-sm text-slate-400 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-white/10 glass shrink-0">
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
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 text-sm"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send size={18} />
          </button>
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400"
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
