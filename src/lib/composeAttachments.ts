import type { ComposeAttachment, EmailAttachment } from '../types'

export const MAX_COMPOSE_ATTACHMENT_BYTES = 2 * 1024 * 1024
export const MAX_COMPOSE_ATTACHMENTS = 5

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

/** Read user-selected files into compose attachments (size-capped for demo persistence) */
export async function filesToComposeAttachments(files: FileList | File[]): Promise<ComposeAttachment[]> {
  const list = Array.from(files)
  const results: ComposeAttachment[] = []

  for (const file of list) {
    if (results.length >= MAX_COMPOSE_ATTACHMENTS) break
    if (file.size > MAX_COMPOSE_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} exceeds ${MAX_COMPOSE_ATTACHMENT_BYTES / 1024 / 1024}MB limit`)
    }
    const dataUrl = await readFileAsDataUrl(file)
    results.push({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      dataUrl,
    })
  }

  return results
}

export function materializeEmailAttachments(
  attachments: ComposeAttachment[] | undefined,
  emailId: string,
  accountId: string,
): { records: EmailAttachment[]; ids: string[] } {
  if (!attachments?.length) return { records: [], ids: [] }
  const now = new Date().toISOString()
  const records = attachments.map((a) => ({
    id: a.id,
    emailId,
    accountId,
    filename: a.filename,
    sizeBytes: a.sizeBytes,
    mimeType: a.mimeType,
    date: now,
    dataUrl: a.dataUrl,
  }))
  return { records, ids: records.map((r) => r.id) }
}
