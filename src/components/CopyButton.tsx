import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '../lib/clipboard'

interface Props {
  text: string
  label?: string
  className?: string
  size?: number
}

export function CopyButton({ text, label = 'Copy', className = '', size = 14 }: Props) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    const ok = await copyText(text)
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!text.trim()}
      className={`p-1 rounded-lg hover-theme text-theme-muted disabled:opacity-40 flex items-center gap-1 ${className}`}
      title={copied ? 'Copied' : label}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? <Check size={size} className="text-emerald-400" /> : <Copy size={size} />}
      {label && label !== 'Copy' && (
        <span className="text-[10px]">{copied ? 'Copied' : label}</span>
      )}
    </button>
  )
}
