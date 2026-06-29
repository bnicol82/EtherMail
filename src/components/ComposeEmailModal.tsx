import { useEffect, useRef, useState } from 'react'
import { Send, FileEdit, X, FileText, Sparkles, Loader2, Paperclip } from 'lucide-react'
import { useEtherMailStore } from '../store/useStore'
import type { ComposeAttachment, ComposeDraft, Email } from '../types'
import { providerColor, providerLabel, formatFileSize, fileIcon } from '../lib/utils'
import { getEmailTemplates, generateTemplateWithAI } from '../lib/emailTemplates'
import {
  filesToComposeAttachments,
  MAX_COMPOSE_ATTACHMENT_BYTES,
  MAX_COMPOSE_ATTACHMENTS,
} from '../lib/composeAttachments'

export function ComposeEmailModal() {
  const composeDraft = useEtherMailStore((s) => s.composeDraft)
  const accounts = useEtherMailStore((s) => s.accounts)
  const notes = useEtherMailStore((s) => s.notes)
  const emails = useEtherMailStore((s) => s.emails)
  const closeCompose = useEtherMailStore((s) => s.closeCompose)
  const sendComposedEmail = useEtherMailStore((s) => s.sendComposedEmail)
  const saveComposeDraft = useEtherMailStore((s) => s.saveComposeDraft)

  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [accountId, setAccountId] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [replyToEmail, setReplyToEmail] = useState<Email | undefined>()
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const templates = getEmailTemplates(notes)

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
    setReplyToEmail(undefined)
  }, [composeDraft])

  if (!composeDraft) return null

  const connectedAccounts = accounts.filter((a) => a.connected)
  const draft: ComposeDraft = {
    id: composeDraft.id,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject,
    body,
    accountId: accountId || composeDraft.accountId,
    attachments: attachments.length > 0 ? attachments : undefined,
  }

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
    setShowTemplates(false)
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
      setShowTemplates(false)
      setAiInstruction('')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-24 sm:pb-4 bg-black/40 backdrop-blur-sm"
      onClick={closeCompose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-title"
    >
      <div
        className="glass-frost rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[min(90vh,40rem)] shadow-2xl border border-[var(--glass-border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--glass-border)] shrink-0">
          <h2 id="compose-title" className="text-base font-semibold text-theme">
            {composeDraft.id ? 'Edit draft' : 'New message'}
          </h2>
          <button
            type="button"
            onClick={closeCompose}
            className="p-1.5 rounded-lg hover-theme text-theme-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {/* Templates */}
          {templates.length > 0 && (
            <div className="rounded-xl glass p-3 space-y-2">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full flex items-center justify-between text-sm font-medium text-theme"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-accent" />
                  Email templates
                </span>
                <span className="text-xs text-theme-muted">{showTemplates ? 'Hide' : 'Show'}</span>
              </button>
              {showTemplates && (
                <div className="space-y-2 pt-1">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => applyTemplate(tpl.id)}
                        className="text-xs px-2.5 py-1 rounded-full glass hover-theme text-theme-secondary"
                      >
                        {tpl.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => runAiTemplate(tpl.id)}
                        disabled={aiLoading}
                        className="text-xs px-2.5 py-1 rounded-full btn-accent flex items-center gap-1 disabled:opacity-50"
                      >
                        {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        AI fill
                      </button>
                    </div>
                  ))}
                  <input
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    placeholder="AI instruction (optional) — e.g. mention Project Athena deadline"
                    className="w-full px-3 py-1.5 rounded-lg input-theme text-xs outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {connectedAccounts.length > 1 && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
                From
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
              >
                {connectedAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.email} ({providerLabel(acc.provider)})
                  </option>
                ))}
              </select>
            </div>
          )}
          {connectedAccounts.length === 1 && (
            <p className="text-xs text-theme-muted flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: providerColor(connectedAccounts[0].provider) }}
              />
              From {connectedAccounts[0].email}
            </p>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="compose-to" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
                To
              </label>
              {!showCcBcc && (
                <button
                  type="button"
                  onClick={() => setShowCcBcc(true)}
                  className="text-[10px] text-accent hover:underline"
                >
                  Cc/Bcc
                </button>
              )}
            </div>
            <input
              id="compose-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
            />
          </div>

          {showCcBcc && (
            <>
              <div>
                <label htmlFor="compose-cc" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
                  Cc
                </label>
                <input
                  id="compose-cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
                />
              </div>
              <div>
                <label htmlFor="compose-bcc" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
                  Bcc
                </label>
                <input
                  id="compose-bcc"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="compose-subject" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
              Subject
            </label>
            <input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none"
            />
          </div>

          <div className="flex-1 min-h-[120px]">
            <label htmlFor="compose-body" className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
              Message
            </label>
            <textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={8}
              className="mt-1 w-full px-3 py-2 rounded-lg input-theme text-sm outline-none resize-y min-h-[120px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-theme-muted font-medium">
                Attachments
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_COMPOSE_ATTACHMENTS}
                className="flex items-center gap-1 text-[10px] text-accent hover:underline disabled:opacity-40"
              >
                <Paperclip size={12} />
                Attach file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
            {attachError && (
              <p className="text-[10px] text-red-400 mb-1">{attachError}</p>
            )}
            <p className="text-[10px] text-theme-muted mb-1.5">
              Max {MAX_COMPOSE_ATTACHMENTS} files, {MAX_COMPOSE_ATTACHMENT_BYTES / 1024 / 1024}MB each — synced to Vault → Email Files
            </p>
            {attachments.length > 0 ? (
              <ul className="space-y-1">
                {attachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg glass text-xs"
                  >
                    <span>{fileIcon(att.mimeType)}</span>
                    <span className="flex-1 truncate text-theme-secondary">{att.filename}</span>
                    <span className="text-theme-muted shrink-0">{formatFileSize(att.sizeBytes)}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="p-0.5 rounded hover-theme text-theme-muted"
                      aria-label={`Remove ${att.filename}`}
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-theme-muted">No attachments</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-3 border-t border-[var(--glass-border)] shrink-0">
          <button
            type="button"
            onClick={() => saveComposeDraft(draft)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl glass text-sm text-theme-secondary hover-theme"
          >
            <FileEdit size={14} />
            Save draft
          </button>
          <button
            type="button"
            onClick={closeCompose}
            className="px-3 py-2 rounded-xl glass text-sm text-theme-muted hover-theme"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => sendComposedEmail(draft)}
            disabled={!to.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl btn-accent text-sm font-medium disabled:opacity-40"
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
