import type { ComposeDraft } from '../types'

/** Whether a compose session has enough content to auto-save as a draft */
export function isDraftWorthy(
  draft: Pick<ComposeDraft, 'to' | 'cc' | 'bcc' | 'subject' | 'body' | 'attachments'>,
): boolean {
  return !!(
    draft.to.trim() ||
    draft.cc?.trim() ||
    draft.bcc?.trim() ||
    draft.subject.trim() ||
    draft.body.trim() ||
    (draft.attachments && draft.attachments.length > 0)
  )
}

export function insertAtCursor(
  value: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number,
): { next: string; cursor: number } {
  const before = value.slice(0, selectionStart)
  const after = value.slice(selectionEnd)
  const next = `${before}${insertion}${after}`
  const cursor = selectionStart + insertion.length
  return { next, cursor }
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
