/** Scheme allow-lists for rendering untrusted markdown (notes, shared vaults, future imports). */
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'data:'])

function protocolOf(url: string): string | null {
  try {
    return new URL(url.trim(), 'https://sanitize.invalid/').protocol
  } catch {
    return null
  }
}

/** Blocks javascript:, data:, vbscript:, etc. in links — only allows http(s)/mailto/tel. */
export function isSafeLinkUrl(href: string | null | undefined): boolean {
  if (!href) return false
  const protocol = protocolOf(href)
  return protocol !== null && SAFE_LINK_PROTOCOLS.has(protocol)
}

/** Allows data: (pasted images use data URLs) plus http(s); blocks javascript: and everything else. */
export function isSafeImageUrl(src: string | null | undefined): boolean {
  if (!src) return false
  const protocol = protocolOf(src)
  return protocol !== null && SAFE_IMAGE_PROTOCOLS.has(protocol)
}
