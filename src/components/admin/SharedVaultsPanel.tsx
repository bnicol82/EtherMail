import { FolderOpen, Share2 } from 'lucide-react'
import { useEtherMailStore } from '../../store/useStore'
import type { VaultSharePermission } from '../../types/orgApi'

const PERMISSIONS: VaultSharePermission[] = ['read', 'write', 'admin']

export function SharedVaultsPanel() {
  const vaults = useEtherMailStore((s) => s.vaults)
  const vaultShares = useEtherMailStore((s) => s.vaultShares)
  const orgMembers = useEtherMailStore((s) => s.orgMembers)
  const setVaultShared = useEtherMailStore((s) => s.setVaultShared)
  const setVaultSharePermission = useEtherMailStore((s) => s.setVaultSharePermission)
  const toggleVaultShareMember = useEtherMailStore((s) => s.toggleVaultShareMember)

  return (
    <section className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Share2 size={18} className="text-accent" />
        <h2 className="font-semibold text-theme">Shared vaults</h2>
      </div>
      <p className="text-xs text-theme-muted mb-4">
        Share vaults with organization members. Members need the <strong className="text-theme-secondary">Shared
        vaults</strong> feature enabled in policy.
      </p>

      <div className="space-y-3">
        {vaults.map((vault) => {
          const share = vaultShares.find((s) => s.vaultId === vault.id)
          const isShared = vault.shared ?? Boolean(share)
          return (
            <div key={vault.id} className="p-4 rounded-xl glass">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen size={16} className="text-accent shrink-0" />
                  <span className="text-sm font-medium text-theme truncate">{vault.name}</span>
                  <span className="text-[10px] text-theme-muted capitalize">{vault.kind}</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setVaultShared(vault.id, e.target.checked)}
                    className="rounded accent-[var(--accent)]"
                  />
                  Shared
                </label>
              </div>

              {isShared && (
                <div className="space-y-2 pt-2 border-t border-[var(--glass-border)]">
                  <label className="block text-[11px] text-theme-muted">
                    Permission
                    <select
                      value={share?.permission ?? 'read'}
                      onChange={(e) =>
                        setVaultSharePermission(vault.id, e.target.value as VaultSharePermission)
                      }
                      className="mt-1 w-full px-2 py-1.5 rounded-lg input-theme text-xs outline-none"
                    >
                      {PERMISSIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-[10px] text-theme-muted">Members with access</p>
                  <div className="flex flex-wrap gap-1.5">
                    {orgMembers.length === 0 ? (
                      <span className="text-[10px] text-theme-muted">Invite members first</span>
                    ) : (
                      orgMembers.map((m) => {
                        const checked = share?.memberIds.includes(m.id) ?? false
                        return (
                          <label
                            key={m.id}
                            className={`text-[10px] px-2 py-1 rounded-full cursor-pointer border ${
                              checked
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-[var(--glass-border)] text-theme-muted'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggleVaultShareMember(vault.id, m.id)}
                            />
                            {m.name}
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
