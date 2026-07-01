import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Send,
  X,
  Sparkles,
  Loader2,
  Paperclip,
  FileText,
  Bold,
  Italic,
  List,
  Wand2,
  Save,
  Clock,
  ChevronDown,
  Check,
  Link2,
} from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { ComposeAttachment, ComposeDraft, Email } from '../types'
import { providerColor, providerLabel, formatFileSize, fileIcon } from '../lib/utils'
import { getEmailTemplates, generateTemplateWithAI } from '../lib/emailTemplates'
import {
  filesToComposeAttachments,
  MAX_COMPOSE_ATTACHMENT_BYTES,
  MAX_COMPOSE_ATTACHMENTS,
} from '../lib/composeAttachments'
import { countWords, insertAtCursor, isDraftWorthy } from '../lib/composeUtils'
import { assistComposeBody, type ComposeAssistAction } from '../lib/composeAssist'
import {
  SCHEDULE_PRESETS,
  formatScheduledAt,
  fromDatetimeLocalValue,
  scheduledAtFromPreset,
  toDatetimeLocalValue,
} from '../lib/scheduledSend'
import { getVaultReplyChips } from '../lib/vaultReplyChips'

type ComposePanel = 'none' | 'templates' | 'ai'

export function ComposeEmailModal() {
  const composeDraft = useEtherMailStore((s) => s.composeDraft)
  const accounts = useEtherMailStore((s) => s.accounts)
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const closeCompose = useEtherMailStore((s) => s.closeCompose)
  const sendComposedEmail = useEtherMailStore((s) => s.sendComposedEmail)
  const saveComposeDraft = useEtherMailStore((s) => s.saveComposeDraft)
  const scheduleComposedEmail = useEtherMailStore((s) => s.scheduleComposedEmail)

  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [accountId, setAccountId] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [panel, setPanel] = useState<ComposePanel>('none')
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [replyToEmail, setReplyToEmail] = useState<Email | undefined>()
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const [scheduleLater, setScheduleLater] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(() => scheduledAtFromPreset('tomorrow9'))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const templates = getEmailTemplates(notes)

  useEffect(() => {
    if (!composeDraft) return
    const focusTimer = window.setTimeout(() => {
      bodyRef.current?.focus()
    }, 350)
    return () => window.clearTimeout(focusTimer)
  }, [composeDraft])

  useEffect(() => {
    if (!composeDraft) return
    setTo(composeDraft.to)
    setCc(composeDraft.cc ?? '')
    setBcc(composeDraft.bcc ?? '')
    setSubject(composeDraft.subject)
    setBody(composeDraft.body)
    setAccountId(composeDraft.accountId)
    setShowCcBcc(!!(composeDraft.cc || composeDraft.bcc))
    setAttachments(composeDraft.attachments ?? [])
    setAttachError(null)
    setSavedHint(null)
    setPanel('none')
    setReplyToEmail(undefined)
    setScheduleLater(!!composeDraft.scheduledAt)
    setScheduledAt(composeDraft.scheduledAt ?? scheduledAtFromPreset('tomorrow9'))
  }, [composeDraft])

  const buildDraft = useCallback((): ComposeDraft => {
    if (!composeDraft) {
      return { to: '', subject: '', body: '', accountId: '' }
    }
    return {
      id: composeDraft.id,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      body,
      accountId: accountId || composeDraft.accountId,
      attachments: attachments.length > 0 ? attachments : undefined,
    }
  }, [composeDraft, to, cc, bcc, subject, body, accountId, attachments])

  const dismiss = useCallback(
    (autoSave: boolean) => {
      const draft = buildDraft()
      if (autoSave && isDraftWorthy(draft)) {
        saveComposeDraft(draft)
      } else {
        closeCompose()
      }
    },
    [buildDraft, saveComposeDraft, closeCompose],
  )

  const handleSaveAndPreview = () => {
    const draft = buildDraft()
    if (isDraftWorthy(draft)) {
      saveComposeDraft(draft)
    } else {
      closeCompose()
    }
  }

  if (!composeDraft) return null

  const connectedAccounts = accounts.filter((a) => a.connected)
  const activeAccount =
    connectedAccounts.find((a) => a.id === (accountId || composeDraft.accountId)) ??
    connectedAccounts[0]
  const draft = buildDraft()
  const wordCount = countWords(body)

  const vaultChips = useMemo(
    () =>
      getVaultReplyChips(notes, emails, {
        subject,
        body,
        contextEmailId: composeDraft.contextEmailId,
        limit: 3,
      }),
    [notes, emails, subject, body, composeDraft.contextEmailId],
  )

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setAttachError(null)
    try {
      const added = await filesToComposeAttachments(files)
      setAttachments((prev) => [...prev, ...added].slice(0, MAX_COMPOSE_ATTACHMENTS))
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Could not attach file')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    setSubject(tpl.subject)
    setBody(tpl.body)
    setPanel('none')
  }

  const runAiTemplate = async (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    setAiLoading(true)
    try {
      const instruction =
        aiInstruction.trim() ||
        `personalize this for ${to || 'the recipient'} using context from my vault`
      const result = await generateTemplateWithAI(tpl, instruction, notes, emails, {
        to,
        replyTo: replyToEmail,
      })
      setSubject(result.subject)
      setBody(result.body)
      setPanel('none')
      setAiInstruction('')
    } finally {
      setAiLoading(false)
    }
  }

  const runAssist = async (action: ComposeAssistAction) => {
    setAiLoading(true)
    try {
      const next = await assistComposeBody(action, body, notes, emails, { to, subject })
      setBody(next)
      setPanel('none')
    } finally {
      setAiLoading(false)
    }
  }

  const wrapSelection = (wrapper: string) => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = body.slice(start, end) || 'text'
    const wrapped = `${wrapper}${selected}${wrapper}`
    const { next } = insertAtCursor(body, wrapped, start, end)
    setBody(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + wrapper.length, start + wrapper.length + selected.length)
    })
  }

  const insertNoteLink = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (!note) return
    const el = bodyRef.current
    const insertion = `[[${note.title}]]`
    if (!el) {
      setBody((b) => `${b}${b.endsWith('\n') || !b ? '' : '\n'}${insertion}`)
      return
    }
    const { next, cursor } = insertAtCursor(body, insertion, el.selectionStart, el.selectionEnd)
    setBody(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  const handleSend = () => {
    if (scheduleLater) {
      const at = scheduledAt
      if (!at || new Date(at).getTime() <= Date.now()) {
        setSavedHint('Pick a future send time')
        return
      }
      scheduleComposedEmail({ ...draft, scheduledAt: at }, at)
      setSavedHint(`Scheduled for ${formatScheduledAt(at)}`)
      return
    }
    sendComposedEmail(draft)
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-6 bg-black/50 backdrop-blur-md"
      onClick={() => dismiss(true)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-title"
    >
      <div
        className="glass-frost w-full max-w-2xl h-full sm:h-auto sm:max-h-[min(92vh,44rem)] shadow-2xl border-0 sm:border border-[var(--glass-border)] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--glass-border)] bg-gradient-to-r from-[var(--accent)]/15 via-transparent to-purple-500/10">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Send size={18} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="compose-title" className="text-base font-semibold text-theme truncate">
                {composeDraft.id ? 'Edit draft' : 'New message'}
              </h2>
              {activeAccount && (
                <p className="text-[11px] text-theme-muted flex items-center gap-1.5 truncate">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: providerColor(activeAccount.provider) }}
                  />
                  {activeAccount.email}
                </p>
              )}
            </div>
            {savedHint && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0">
                <Check size={12} />
                {savedHint}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAndPreview}
              className="p-2 rounded-xl hover-theme text-theme-muted shrink-0"
              aria-label="Save draft"
              title="Save draft"
            >
              <Save size={18} />
            </button>
            <button
              type="button"
              onClick={() => dismiss(true)}
              className="p-2 rounded-xl hover-theme text-theme-muted shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {connectedAccounts.length > 1 && (
            <div className="px-4 pb-3">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl input-theme text-sm outline-none"
              >
                {connectedAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    Send as {acc.email} ({providerLabel(acc.provider)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Address fields — Gmail-style rows */}
        <div className="shrink-0 border-b border-[var(--glass-border)] divide-y divide-[var(--glass-border)]">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-xs text-theme-muted w-8 shrink-0">To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipients"
              className="flex-1 bg-transparent text-sm text-theme outline-none placeholder:text-theme-muted/60"
            />
            {!showCcBcc && (
              <button
                type="button"
                onClick={() => setShowCcBcc(true)}
                className="text-[10px] text-accent hover:underline shrink-0"
              >
                Cc/Bcc
              </button>
            )}
          </div>
          {showCcBcc && (
            <>
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-xs text-theme-muted w-8 shrink-0">Cc</span>
                <input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Carbon copy"
                  className="flex-1 bg-transparent text-sm text-theme outline-none"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-xs text-theme-muted w-8 shrink-0">Bcc</span>
                <input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Blind copy"
                  className="flex-1 bg-transparent text-sm text-theme outline-none"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-theme-muted w-8 shrink-0">Subj</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 bg-transparent text-sm font-medium text-theme outline-none placeholder:font-normal placeholder:text-theme-muted/60"
            />
          </div>
        </div>

        {/* Formatting toolbar */}
        <div className="shrink-0 flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]/50 overflow-x-auto">
          <button type="button" onClick={() => wrapSelection('**')} className="compose-tool" title="Bold">
            <Bold size={14} />
          </button>
          <button type="button" onClick={() => wrapSelection('_')} className="compose-tool" title="Italic">
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              const el = bodyRef.current
              const line = '\n- '
              if (!el) {
                setBody((b) => `${b}${line}`)
                return
              }
              const { next, cursor } = insertAtCursor(body, line, el.selectionStart, el.selectionEnd)
              setBody(next)
              requestAnimationFrame(() => {
                el.focus()
                el.setSelectionRange(cursor, cursor)
              })
            }}
            className="compose-tool"
            title="Bullet list"
          >
            <List size={14} />
          </button>
          <span className="w-px h-4 bg-[var(--glass-border)] mx-1" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= MAX_COMPOSE_ATTACHMENTS}
            className="compose-tool"
            title="Attach file"
          >
            <Paperclip size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => setPanel(panel === 'templates' ? 'none' : 'templates')}
            className={`compose-tool ${panel === 'templates' ? 'compose-tool-active' : ''}`}
            title="Templates"
          >
            <FileText size={14} />
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === 'ai' ? 'none' : 'ai')}
            className={`compose-tool ${panel === 'ai' ? 'compose-tool-active' : ''}`}
            title="AI assist"
          >
            <Sparkles size={14} />
          </button>
          {notes.length > 0 && (
            <select
              className="ml-1 text-[10px] px-2 py-1 rounded-lg glass text-theme-muted outline-none max-w-[7rem]"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) insertNoteLink(e.target.value)
                e.target.value = ''
              }}
            >
              <option value="">Link note…</option>
              {notes.slice(0, 8).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title.slice(0, 24)}
                </option>
              ))}
            </select>
          )}
        </div>

        {vaultChips.length > 0 && (
          <div className="shrink-0 px-3 py-2 border-b border-[var(--glass-border)] bg-accent-soft/20">
            <p className="text-[10px] text-theme-muted mb-1.5 flex items-center gap-1">
              <Link2 size={10} className="text-accent" />
              From your vault
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {vaultChips.map((chip) => (
                <button
                  key={chip.noteId}
                  type="button"
                  onClick={() => insertNoteLink(chip.noteId)}
                  className="shrink-0 text-xs px-2.5 py-1 rounded-full glass hover-theme text-theme-secondary border border-[var(--accent-border)]/40"
                  title={chip.reason}
                >
                  [[{chip.title}]]
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Side panel: templates or AI */}
        {panel !== 'none' && (
          <div className="shrink-0 border-b border-[var(--glass-border)] bg-accent-soft/30 max-h-32 sm:max-h-40 overflow-y-auto p-3">
            {panel === 'templates' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-theme flex items-center gap-1.5">
                  <FileText size={12} className="text-accent" />
                  Email templates
                </p>
                <div className="space-y-2">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="flex flex-wrap gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => applyTemplate(tpl.id)}
                        className="text-xs px-2.5 py-1 rounded-full glass hover-theme text-theme-secondary"
                      >
                        {tpl.title}
                      </button>
                      <button
                        type="button"
                        disabled={aiLoading}
                        onClick={() => runAiTemplate(tpl.id)}
                        className="text-xs px-2 py-1 rounded-full btn-accent flex items-center gap-1 disabled:opacity-50"
                      >
                        {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                        AI
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="AI instruction for template fill…"
                  className="w-full px-2.5 py-1.5 rounded-lg input-theme text-xs outline-none"
                />
              </div>
            )}
            {panel === 'ai' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-theme flex items-center gap-1.5">
                  <Sparkles size={12} className="text-accent" />
                  AI writing assist
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['polish', 'Polish'],
                      ['shorten', 'Shorten'],
                      ['expand', 'Expand'],
                      ['friendly', 'Friendlier'],
                    ] as [ComposeAssistAction, string][]
                  ).map(([action, label]) => (
                    <button
                      key={action}
                      type="button"
                      disabled={aiLoading || !body.trim()}
                      onClick={() => runAssist(action)}
                      className="text-xs px-2.5 py-1 rounded-full glass hover-theme text-theme-secondary disabled:opacity-40"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            autoComplete="off"
            autoCorrect="on"
            spellCheck
            onTouchStart={(e) => e.currentTarget.focus()}
            className="flex-1 w-full px-4 py-3 bg-transparent text-base text-theme-secondary leading-relaxed outline-none resize-none min-h-0 sm:min-h-[10rem] touch-manipulation"
            style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
          />

          {/* Attachments strip */}
          {(attachments.length > 0 || attachError) && (
            <div className="shrink-0 px-4 pb-2 border-t border-[var(--glass-border)] pt-2">
              {attachError && <p className="text-[10px] text-red-400 mb-1">{attachError}</p>}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((att) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg glass text-[10px] text-theme-secondary"
                    >
                      {fileIcon(att.mimeType)}
                      <span className="truncate max-w-[8rem]">{att.filename}</span>
                      <span className="text-theme-muted">{formatFileSize(att.sizeBytes)}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                        className="text-theme-muted hover:text-theme"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[9px] text-theme-muted mt-1">
                Up to {MAX_COMPOSE_ATTACHMENTS} files · {MAX_COMPOSE_ATTACHMENT_BYTES / 1024 / 1024}MB each
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]/60">
          {scheduleLater && (
            <div className="px-4 pt-3 pb-2 border-b border-[var(--glass-border)]/60 space-y-2">
              <p className="text-[10px] text-theme-muted flex items-center gap-1">
                <Clock size={12} />
                Send later — {formatScheduledAt(scheduledAt)}
              </p>
              <div className="flex flex-wrap gap-1">
                {SCHEDULE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setScheduledAt(scheduledAtFromPreset(preset.id))}
                    className="px-2 py-1 rounded-lg glass text-[10px] text-theme-secondary hover-theme"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(scheduledAt)}
                onChange={(e) => setScheduledAt(fromDatetimeLocalValue(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg input-theme text-xs outline-none"
              />
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-3">
          <label className="flex items-center gap-1.5 text-[10px] text-theme-muted cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={scheduleLater}
              onChange={(e) => setScheduleLater(e.target.checked)}
              className="rounded accent-[var(--accent)]"
            />
            <Clock size={12} />
            Schedule
          </label>
          <span className="text-[10px] text-theme-muted hidden sm:inline">
            {wordCount} words
          </span>
          <span className="text-[10px] text-theme-muted/70 hidden sm:inline ml-1">
            · click outside to save draft
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => dismiss(false)}
            className="px-3 py-2 rounded-xl glass text-xs text-theme-muted hover-theme"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => {
              saveComposeDraft(draft)
              setSavedHint('Saved to drafts')
            }}
            className="px-3 py-2 rounded-xl glass text-xs text-theme-secondary hover-theme hidden sm:inline-flex"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!to.trim() && !scheduleLater}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl btn-accent text-sm font-semibold disabled:opacity-40 shadow-lg shadow-[var(--accent)]/20"
          >
            <Send size={16} />
            {scheduleLater ? 'Schedule' : 'Send'}
            <ChevronDown size={14} className="opacity-60 hidden sm:block" />
          </button>
          </div>
        </div>
      </div>

      <style>{`
        .compose-tool {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 0.5rem;
          color: var(--theme-muted, #888);
          transition: background 0.15s, color 0.15s;
        }
        .compose-tool:hover {
          background: var(--glass-bg);
          color: var(--theme-secondary);
        }
        .compose-tool-active {
          background: var(--accent-soft);
          color: var(--accent);
        }
      `}</style>
    </div>
  )
}
