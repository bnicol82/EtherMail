import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNexusStore } from '../store/useStore'

interface Props {
  content: string
  onWikiLinkClick?: (title: string) => void
}

export function MarkdownContent({ content, onWikiLinkClick }: Props) {
  const notes = useNexusStore((s) => s.notes)
  const selectNote = useNexusStore((s) => s.selectNote)

  const handleLink = (title: string) => {
    if (onWikiLinkClick) {
      onWikiLinkClick(title)
      return
    }
    const note = notes.find((n) => n.title === title)
    if (note) selectNote(note.id)
  }

  // Pre-process wiki links [[Title]] or [[Title|alias]]
  const processed = content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, rawTitle: string, alias?: string) => {
      const title = rawTitle.trim()
      const label = (alias ?? title).trim()
      return `[${label}](wiki:${encodeURIComponent(title)})`
    },
  )

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt ?? ''}
              className="note-inline-image"
              loading="lazy"
            />
          ),
          a: ({ href, children }) => {
            if (href?.startsWith('wiki:')) {
              const title = decodeURIComponent(href.slice(5))
              return (
                <span
                  className="wiki-link"
                  onClick={() => handleLink(title)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleLink(title)}
                >
                  {children}
                </span>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
