import { useEffect } from 'react'
import { useEtherMailStore } from '../store/useStore'
import { useAccessibleVaults, useVaultAccessContext } from './useAccessibleVaults'
import { canAccessVault, filterNotesByVaultAccess } from '../lib/vaultAccess'
import { VAULT_PERSONAL_ID } from '../data/seed'

/** Clears active vault/note/file when access is revoked or shares change. */
export function useVaultAccessGuard() {
  const activeVaultId = useEtherMailStore((s) => s.activeVaultId)
  const activeNoteId = useEtherMailStore((s) => s.activeNoteId)
  const activeVaultFileId = useEtherMailStore((s) => s.activeVaultFileId)
  const notes = useEtherMailStore((s) => s.notes)
  const vaultFiles = useEtherMailStore((s) => s.vaultFiles)
  const setActiveVault = useEtherMailStore((s) => s.setActiveVault)
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectVaultFile = useEtherMailStore((s) => s.selectVaultFile)
  const accessibleVaults = useAccessibleVaults()
  const ctx = useVaultAccessContext()

  useEffect(() => {
    if (!activeVaultId) return
    const vault = ctx.vaults.find((v) => v.id === activeVaultId)
    if (!vault || !canAccessVault(vault, ctx)) {
      const fallback = accessibleVaults[0]?.id ?? null
      setActiveVault(fallback)
    }
  }, [activeVaultId, accessibleVaults, ctx, setActiveVault])

  useEffect(() => {
    const allowedNotes = filterNotesByVaultAccess(notes, ctx)
    if (activeNoteId && !allowedNotes.some((n) => n.id === activeNoteId)) {
      selectNote(null)
    }
  }, [activeNoteId, notes, ctx, selectNote])

  useEffect(() => {
    const allowedVaultIds = new Set(accessibleVaults.map((v) => v.id))
    if (!activeVaultFileId) return
    const file = vaultFiles.find((f) => f.id === activeVaultFileId)
    const vaultId = file?.vaultId ?? VAULT_PERSONAL_ID
    if (!allowedVaultIds.has(vaultId)) {
      selectVaultFile(null)
    }
  }, [activeVaultFileId, vaultFiles, accessibleVaults, selectVaultFile])
}
