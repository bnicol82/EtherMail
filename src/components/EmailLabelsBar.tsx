import { useState } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import type { EmailLabel } from '../types'

const LABEL_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

interface Props {
  compact?: boolean
  labels: EmailLabel[]
  activeLabelId: string | null
  onFilter: (labelId: string | null) => void
  onCreateLabel: (name: string, color: string) => void
  onDeleteLabel: (labelId: string) => void
  emailCounts: Record<string, number>
}

export function EmailLabelsBar({
  compact = false,
  labels,
  activeLabelId,
  onFilter,
  onCreateLabel,
  onDeleteLabel,
  emailCounts,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(LABEL_COLORS[0])

  const submitCreate = () => {
    const name = newName.trim()
    if (!name) return
    onCreateLabel(name, newColor)
    setNewName('')
    setCreating(false)
  }

  return (
    <div className={compact ? 'space-y-1' : 'mb-2 space-y-2'}>
      <div className="flex items-center gap-1 flex-wrap">
        {!compact && (
        <span className="text-[10px] text-theme-muted flex items-center gap-1 mr-0.5">
          <Tag size={11} />
          Labels
        </span>
        )}
        <button
          type="button"
          onClick={() => onFilter(null)}
          className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
            activeLabelId === null
              ? 'bg-[var(--accent)] text-white border-transparent'
              : 'glass text-theme-muted hover-theme border-[var(--glass-border)]'
          }`}
        >
          All
        </button>
        {labels.map((label) => {
          const count = emailCounts[label.id] ?? 0
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onFilter(activeLabelId === label.id ? null : label.id)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                activeLabelId === label.id
                  ? 'text-white border-transparent'
                  : 'glass text-theme-secondary hover-theme border-[var(--glass-border)]'
              }`}
              style={
                activeLabelId === label.id
                  ? { backgroundColor: label.color }
                  : { borderColor: `${label.color}55` }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
              {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] glass text-theme-muted hover-theme"
        >
          <Plus size={11} />
          New
        </button>
      </div>

      {creating && (
        <div className="flex flex-wrap items-center gap-1.5 glass rounded-lg p-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name"
            className="flex-1 min-w-[8rem] px-2 py-1 rounded-lg input-theme text-xs outline-none"
            onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
          />
          <div className="flex gap-1">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border-2 ${newColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <button type="button" onClick={submitCreate} className="px-2 py-1 rounded-lg btn-accent text-[10px]">
            Add
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="p-1 rounded-lg hover-theme text-theme-muted"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {labels.length > 0 && activeLabelId && (
        <button
          type="button"
          onClick={() => onDeleteLabel(activeLabelId)}
          className="text-[10px] text-red-400 hover:underline"
        >
          Delete active label
        </button>
      )}
    </div>
  )
}

export function EmailLabelChip({ label }: { label: EmailLabel }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] border"
      style={{
        color: label.color,
        borderColor: `${label.color}44`,
        backgroundColor: `${label.color}18`,
      }}
    >
      <Tag size={8} />
      {label.name}
    </span>
  )
}

interface PickerProps {
  labels: EmailLabel[]
  selectedIds: string[]
  onToggle: (labelId: string) => void
}

export function EmailLabelPicker({ labels, selectedIds, onToggle }: PickerProps) {
  if (labels.length === 0) return null
  return (
    <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
      <p className="text-xs text-theme-muted mb-2 flex items-center gap-1">
        <Tag size={12} />
        Labels
      </p>
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => {
          const active = selectedIds.includes(label.id)
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onToggle(label.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors ${
                active ? 'text-white' : 'glass text-theme-secondary hover-theme'
              }`}
              style={active ? { backgroundColor: label.color, borderColor: label.color } : { borderColor: `${label.color}44` }}
            >
              <Tag size={10} />
              {label.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
