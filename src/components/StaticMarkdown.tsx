import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { preprocessWikiLinks } from '../lib/markdownWiki'
import { isSafeImageUrl, isSafeLinkUrl } from '../lib/urlSafety'

interface Props {
  content: string
}

/** Hook-free markdown for print/export (no store dependencies) */
export function StaticMarkdown({ content }: Props) {
  const processed = preprocessWikiLinks(content)

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) =>
            isSafeImageUrl(src) ? (
              <img src={src} alt={alt ?? ''} className="note-inline-image" />
            ) : null,
          a: ({ href, children }) => {
            if (href?.startsWith('wiki:')) {
              const title = decodeURIComponent(href.slice(5))
              return (
                <span className="wiki-link" title={`Wiki link: ${title}`}>
                  {children}
                </span>
              )
            }
            if (!isSafeLinkUrl(href)) {
              return <span title="Blocked link: unsafe URL">{children}</span>
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
