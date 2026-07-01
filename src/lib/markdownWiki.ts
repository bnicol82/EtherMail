/** Shared wiki-link preprocessing for markdown renderers */
export function preprocessWikiLinks(content: string): string {
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, rawTitle: string, alias?: string) => {
      const title = rawTitle.trim()
      const label = (alias ?? title).trim()
      return `[${label}](wiki:${encodeURIComponent(title)})`
    },
  )
}

export function noteAsMarkdown(note: { title: string; content: string }): string {
  const body = note.content.trim()
  if (body.startsWith('#')) return body
  return `# ${note.title}\n\n${body}`
}
