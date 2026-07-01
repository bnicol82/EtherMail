import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ReactNode } from 'react'
import { useNexusStore } from '../store/useStore'
import { preprocessWikiLinks } from '../lib/markdownWiki'
import {
  preprocessNoteMarkdown,
  slugifyHeading,
  stripFrontmatter,
} from '../lib/noteFeatures'

interface Props {
  content: string
  onWikiLinkClick?: (title: string) => void
}

function headingId(children: ReactNode): string {
  const text = typeof children === 'string' ? children : String(children ?? '')
  return slugifyHeading(text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1'))
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

  let processed = preprocessNoteMarkdown(content)
  processed = preprocessWikiLinks(processed)

  const renderEmbed = (title: string) => {
    const note = notes.find((n) => n.title === title)
    if (!note) {
      return (
        <div className="note-embed note-embed-missing">
          <p className="text-xs text-theme-muted">Missing note: {title}</p>
        </div>
      )
    }
    const body = stripFrontmatter(note.content)
    const excerpt = body
      .replace(/^#+\s+/gm, '')
      .replace(/\[\[[^\]]+\]\]/g, '')
      .trim()
      .slice(0, 220)
    return (
      <button
        type="button"
        onClick={() => selectNote(note.id)}
        className="note-embed w-full text-left"
      >
        <p className="text-xs font-semibold text-accent">{note.title}</p>
        <p className="text-[11px] text-theme-muted mt-1 line-clamp-4">
          {excerpt}
          {body.length > 220 ? '…' : ''}
        </p>
      </button>
    )
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 id={headingId(children)}>{children}</h1>,
          h2: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(children)}>{children}</h3>,
          h4: ({ children }) => <h4 id={headingId(children)}>{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="note-callout">{children}</blockquote>
          ),
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
            if (href?.startsWith('embed:')) {
              const title = decodeURIComponent(href.slice(6))
              return renderEmbed(title)
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
