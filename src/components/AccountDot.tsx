import type { EmailAccount } from '../types'
import { accountColor, accountShortLabel } from '../lib/utils'

interface Props {
  account: EmailAccount | undefined
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function AccountDot({ account, size = 'sm', showLabel = false, className = '' }: Props) {
  const dim = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  const color = accountColor(account)

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      title={account?.email ?? 'Unknown account'}
    >
      <span
        className={`${dim} rounded-full ring-1 ring-black/10`}
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {showLabel && account && (
        <span className="text-[10px] text-theme-muted truncate max-w-[72px]">
          {accountShortLabel(account)}
        </span>
      )}
    </span>
  )
}
