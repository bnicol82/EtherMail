import { Search, X } from 'lucide-react'
import {
  ALL_NODE_TYPES,
  GRAPH_NODE_COLORS,
  GRAPH_TYPE_LABELS,
} from '../lib/graphTheme'
import type { GraphNode } from '../types'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  types: Set<GraphNode['type']>
  onToggleType: (type: GraphNode['type']) => void
  orphansOnly: boolean
  onOrphansOnlyChange: (value: boolean) => void
  localGraph: boolean
  onLocalGraphChange: (value: boolean) => void
  localDepth: number
  onLocalDepthChange: (value: number) => void
  showArrows: boolean
  onShowArrowsChange: (value: boolean) => void
  typeCounts: Record<GraphNode['type'], number>
  selectedNode: GraphNode | null
  orphanCount: number
}

export function GraphFilterPanel({
  search,
  onSearchChange,
  types,
  onToggleType,
  orphansOnly,
  onOrphansOnlyChange,
  localGraph,
  onLocalGraphChange,
  localDepth,
  onLocalDepthChange,
  showArrows,
  onShowArrowsChange,
  typeCounts,
  selectedNode,
  orphanCount,
}: Props) {
  return (
    <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--glass-border)] glass flex flex-col min-h-0 max-h-[40vh] lg:max-h-none overflow-y-auto">
      <div className="p-3 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5">
            Search
          </p>
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-theme-muted" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Find node…"
              className="w-full pl-7 pr-7 py-1.5 rounded-lg input-theme text-xs outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-theme-muted hover-theme"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5">
            Groups
          </p>
          <div className="space-y-1">
            {ALL_NODE_TYPES.map((type) => {
              const on = types.has(type)
              const count = typeCounts[type]
              return (
                <label
                  key={type}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs ${
                    on ? 'glass' : 'opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleType(type)}
                    className="rounded border-[var(--glass-border)]"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: GRAPH_NODE_COLORS[type] }}
                  />
                  <span className="text-theme-secondary flex-1">{GRAPH_TYPE_LABELS[type]}</span>
                  <span className="text-theme-muted tabular-nums">{count}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted">
            Display
          </p>
          <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={orphansOnly}
              onChange={(e) => onOrphansOnlyChange(e.target.checked)}
              className="rounded border-[var(--glass-border)]"
            />
            Orphans only
            <span className="text-theme-muted ml-auto">{orphanCount}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showArrows}
              onChange={(e) => onShowArrowsChange(e.target.checked)}
              className="rounded border-[var(--glass-border)]"
            />
            Show arrows
          </label>
          <label
            className={`flex items-center gap-2 text-xs cursor-pointer ${
              selectedNode ? 'text-theme-secondary' : 'text-theme-muted opacity-60'
            }`}
          >
            <input
              type="checkbox"
              checked={localGraph}
              disabled={!selectedNode}
              onChange={(e) => onLocalGraphChange(e.target.checked)}
              className="rounded border-[var(--glass-border)]"
            />
            Local graph
          </label>
          {localGraph && selectedNode && (
            <div className="pl-5">
              <label className="text-[10px] text-theme-muted flex items-center justify-between gap-2">
                Depth
                <span className="text-theme-secondary tabular-nums">{localDepth}</span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                value={localDepth}
                onChange={(e) => onLocalDepthChange(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          )}
        </div>

        <p className="text-[10px] text-theme-muted leading-relaxed">
          Drag to pan · scroll to zoom · drag nodes to pin · double-click to open
        </p>
      </div>
    </aside>
  )
}
