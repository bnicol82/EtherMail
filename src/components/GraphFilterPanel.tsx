import { Search, X } from 'lucide-react'
import {
  ALL_NODE_TYPES,
  GRAPH_NODE_COLORS,
  GRAPH_TYPE_LABELS,
} from '../lib/graphTheme'
import { GRAPH_LAYOUT_VIEWS, type GraphLayoutView } from '../lib/graphLayout'
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
  layoutView: GraphLayoutView
  onLayoutViewChange: (value: GraphLayoutView) => void
  typeCounts: Record<GraphNode['type'], number>
  selectedNode: GraphNode | null
  orphanCount: number
  compact?: boolean
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
  layoutView,
  onLayoutViewChange,
  typeCounts,
  selectedNode,
  orphanCount,
  compact,
}: Props) {
  return (
    <div className={`p-3 space-y-2.5 ${compact ? '' : 'space-y-3'}`}>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2 gap-1">
          {ALL_NODE_TYPES.map((type) => {
            const on = types.has(type)
            const count = typeCounts[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => onToggleType(type)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-left transition-colors ${
                  on ? 'glass text-theme-secondary' : 'opacity-45 text-theme-muted'
                }`}
                aria-pressed={on}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: GRAPH_NODE_COLORS[type] }}
                />
                <span className="truncate flex-1">{GRAPH_TYPE_LABELS[type]}</span>
                <span className="text-theme-muted tabular-nums text-[10px]">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5">
          Layout
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1">
          {GRAPH_LAYOUT_VIEWS.map((view) => {
            const on = layoutView === view.id
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => onLayoutViewChange(view.id)}
                title={view.hint}
                className={`px-2 py-1.5 rounded-lg text-[11px] text-left transition-colors ${
                  on ? 'btn-accent' : 'glass text-theme-muted'
                }`}
                aria-pressed={on}
              >
                {view.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted mb-1.5">
          Display
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onOrphansOnlyChange(!orphansOnly)}
            className={`text-[10px] px-2 py-1 rounded-full ${
              orphansOnly ? 'btn-accent' : 'glass text-theme-muted'
            }`}
          >
            Orphans {orphanCount}
          </button>
          <button
            type="button"
            onClick={() => onShowArrowsChange(!showArrows)}
            className={`text-[10px] px-2 py-1 rounded-full ${
              showArrows ? 'btn-accent' : 'glass text-theme-muted'
            }`}
          >
            Arrows
          </button>
          <button
            type="button"
            disabled={!selectedNode}
            onClick={() => onLocalGraphChange(!localGraph)}
            className={`text-[10px] px-2 py-1 rounded-full disabled:opacity-40 ${
              localGraph ? 'btn-accent' : 'glass text-theme-muted'
            }`}
          >
            Local
          </button>
        </div>
        {localGraph && selectedNode && (
          <div className="mt-2">
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

      <p className="text-[10px] text-theme-muted leading-relaxed hidden lg:block">
        Drag to pan · pinch or scroll to zoom · tap empty space to deselect
      </p>
    </div>
  )
}
