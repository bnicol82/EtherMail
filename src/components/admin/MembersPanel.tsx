import { useState } from 'react'
import { Users, UserPlus, Trash2 } from 'lucide-react'
import { useEtherMailStore } from '../../store/useStore'
import type { OrgRole } from '../../types/admin'

const ROLES: OrgRole[] = ['member', 'admin', 'owner']

export function MembersPanel() {
  const orgMembers = useEtherMailStore((s) => s.orgMembers)
  const inviteOrgMember = useEtherMailStore((s) => s.inviteOrgMember)
  const updateOrgMemberRole = useEtherMailStore((s) => s.updateOrgMemberRole)
  const removeOrgMember = useEtherMailStore((s) => s.removeOrgMember)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<OrgRole>('member')

  const invite = () => {
    const trimmed = email.trim()
    if (!trimmed) return
    inviteOrgMember({ email: trimmed, name: name.trim() || trimmed.split('@')[0], role })
    setEmail('')
    setName('')
    setRole('member')
  }

  return (
    <section className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-accent" />
        <h2 className="font-semibold text-theme">Members</h2>
      </div>
      <p className="text-xs text-theme-muted mb-4">
        Invite teammates and assign roles. Requires <strong className="text-theme-secondary">shared
        vaults</strong> feature for vault collaboration.
      </p>

      <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 mb-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@company.com"
          className="px-3 py-2 rounded-lg input-theme text-sm outline-none"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          className="px-3 py-2 rounded-lg input-theme text-sm outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as OrgRole)}
          className="px-3 py-2 rounded-lg input-theme text-sm outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={invite}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl btn-accent text-sm font-medium"
        >
          <UserPlus size={16} />
          Invite
        </button>
      </div>

      <div className="space-y-2">
        {orgMembers.length === 0 ? (
          <p className="text-sm text-theme-muted py-4 text-center">No members yet.</p>
        ) : (
          orgMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-xl glass flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme truncate">{member.name}</p>
                <p className="text-xs text-theme-muted truncate">{member.email}</p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  member.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : 'bg-amber-500/20 text-amber-500'
                }`}
              >
                {member.status}
              </span>
              <select
                value={member.role}
                onChange={(e) => updateOrgMemberRole(member.id, e.target.value as OrgRole)}
                className="text-xs px-2 py-1 rounded-lg input-theme outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeOrgMember(member.id)}
                className="p-1.5 rounded-lg hover-theme text-theme-muted hover:text-red-400"
                aria-label={`Remove ${member.email}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
