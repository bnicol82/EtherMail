export const MAX_NOTE_IMAGE_BYTES = 400_000

export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (PNG, JPG, GIF, WebP)')
  }
  if (file.size > MAX_NOTE_IMAGE_BYTES) {
    throw new Error(`Image too large — max ${Math.round(MAX_NOTE_IMAGE_BYTES / 1024)}KB`)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

export function buildImageMarkdown(dataUrl: string, alt = 'Image'): string {
  const safeAlt = alt.replace(/[\[\]()]/g, '').trim() || 'Image'
  return `\n\n![${safeAlt}](${dataUrl})\n\n`
}

export function insertAtCursor(
  content: string,
  snippet: string,
  selectionStart: number,
  selectionEnd: number,
): { content: string; cursor: number } {
  const next = content.slice(0, selectionStart) + snippet + content.slice(selectionEnd)
  return { content: next, cursor: selectionStart + snippet.length }
}

export async function imageFileToMarkdown(file: File, alt?: string): Promise<string> {
  const dataUrl = await imageFileToDataUrl(file)
  const label = alt || file.name.replace(/\.[^.]+$/, '') || 'Image'
  return buildImageMarkdown(dataUrl, label)
}
