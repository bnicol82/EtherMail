import { describe, expect, it } from 'vitest'
import { isSafeImageUrl, isSafeLinkUrl } from './urlSafety'

describe('isSafeLinkUrl', () => {
  it('allows http, https, mailto, and tel links', () => {
    expect(isSafeLinkUrl('https://example.com')).toBe(true)
    expect(isSafeLinkUrl('http://example.com')).toBe(true)
    expect(isSafeLinkUrl('mailto:a@b.com')).toBe(true)
    expect(isSafeLinkUrl('tel:+15551234567')).toBe(true)
  })

  it('allows relative and fragment links', () => {
    expect(isSafeLinkUrl('/notes/foo')).toBe(true)
    expect(isSafeLinkUrl('./relative')).toBe(true)
    expect(isSafeLinkUrl('#heading')).toBe(true)
  })

  it('blocks javascript:, vbscript:, and data: schemes', () => {
    expect(isSafeLinkUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeLinkUrl('  javascript:alert(1)')).toBe(false)
    expect(isSafeLinkUrl('vbscript:msgbox(1)')).toBe(false)
    expect(isSafeLinkUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('blocks empty/nullish input', () => {
    expect(isSafeLinkUrl(null)).toBe(false)
    expect(isSafeLinkUrl(undefined)).toBe(false)
    expect(isSafeLinkUrl('')).toBe(false)
  })
})

describe('isSafeImageUrl', () => {
  it('allows http, https, and data: (pasted note images)', () => {
    expect(isSafeImageUrl('https://example.com/pic.png')).toBe(true)
    expect(isSafeImageUrl('http://example.com/pic.png')).toBe(true)
    expect(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
  })

  it('blocks javascript: and other unsafe schemes', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false)
  })

  it('blocks empty/nullish input', () => {
    expect(isSafeImageUrl(null)).toBe(false)
    expect(isSafeImageUrl(undefined)).toBe(false)
    expect(isSafeImageUrl('')).toBe(false)
  })
})
