import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Focus,
  Mail,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useEtherMailStore, useGraph } from '../store/useStore'
import { GraphFilterPanel } from './GraphFilterPanel'
import {
  countNodesByType,
  filterGraph,
  findOrphanIds,
  fitCameraToBounds,
  getNeighborhood,
  GRAPH_LAYOUT_VIEWS,
  nodeDrawRadius,
  runGraphLayout,
  type GraphLayoutView,
  type GraphPosition,
} from '../lib/graphLayout'
import {
  ALL_NODE_TYPES,
  GRAPH_EDGE_COLORS,
  GRAPH_EDGE_LABELS,
  GRAPH_EDGE_WIDTH,
  GRAPH_NODE_COLORS,
  GRAPH_TYPE_LABELS,
} from '../lib/graphTheme'
import type { GraphNode } from '../types'

const LAYOUT_W = 900
const LAYOUT_H = 600

export function GraphView() {
  const { nodes: allNodes, edges: allEdges } = useGraph()
  const selectNote = useEtherMailStore((s) => s.selectNote)
  const selectEmail = useEtherMailStore((s) => s.selectEmail)
  const setView = useEtherMailStore((s) => s.setView)
  const setGraphPersonFilter = useEtherMailStore((s) => s.setGraphPersonFilter)
  const activeVaultId = useEtherMailStore((s) => s.activeVaultId)
  const vaults = useEtherMailStore((s) => s.vaults)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef<Map<string, GraphPosition>>(new Map())
  const pinnedRef = useRef<Set<string>>(new Set())
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef<{ distance: number; zoom: number; panX: number; panY: number } | null>(null)

  const [search, setSearch] = useState('')
  const [types, setTypes] = useState<Set<GraphNode['type']>>(() => new Set(ALL_NODE_TYPES))
  const [orphansOnly, setOrphansOnly] = useState(false)
  const [localGraph, setLocalGraph] = useState(false)
  const [localDepth, setLocalDepth] = useState(2)
  const [showArrows, setShowArrows] = useState(true)
  const [layoutView, setLayoutView] = useState<GraphLayoutView>('force')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [positions, setPositions] = useState<Map<string, GraphPosition>>(new Map())
  const [camera, setCamera] = useState({ panX: 0, panY: 0, zoom: 1 })
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 })
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [panning, setPanning] = useState<{ sx: number; sy: number; panX: number; panY: number } | null>(
    null,
  )
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  )
  const [isPinching, setIsPinching] = useState(false)
  const [, bumpFrame] = useState(0)

  const activeVault = vaults.find((v) => v.id === activeVaultId)
  const selectedNode = allNodes.find((n) => n.id === selectedId) ?? null

  const { nodes, edges } = useMemo(
    () =>
      filterGraph(allNodes, allEdges, {
        types,
        search,
        orphansOnly,
        localRootId: localGraph && selectedId ? selectedId : null,
        localDepth,
      }),
    [allNodes, allEdges, types, search, orphansOnly, localGraph, selectedId, localDepth],
  )

  const graphKey = useMemo(
    () => `${nodes.map((n) => n.id).join('|')}::${edges.map((e) => e.id).join('|')}`,
    [nodes, edges],
  )

  const typeCounts = useMemo(() => countNodesByType(allNodes), [allNodes])
  const orphanCount = useMemo(() => findOrphanIds(allNodes, allEdges).size, [allNodes, allEdges])

  const focusId = hoveredId ?? selectedId
  const highlightIds = useMemo(() => {
    if (!focusId) return null
    return getNeighborhood(focusId, edges, 1)
  }, [focusId, edges])

  const applyLayout = useCallback(
    (clearPins: boolean) => {
      if (clearPins) pinnedRef.current.clear()
      const layout = runGraphLayout(layoutView, nodes, edges, {
        width: LAYOUT_W,
        height: LAYOUT_H,
      })
      const merged = new Map<string, GraphPosition>()
      nodes.forEach((n) => {
        const pinned = pinnedRef.current.has(n.id) ? positionsRef.current.get(n.id) : null
        merged.set(n.id, pinned ?? layout.get(n.id) ?? { x: LAYOUT_W / 2, y: LAYOUT_H / 2 })
      })
      positionsRef.current = merged
      setPositions(merged)
      pinnedRef.current = new Set([...pinnedRef.current].filter((id) => merged.has(id)))
    },
    [layoutView, nodes, edges],
  )

  useEffect(() => {
    applyLayout(false)
  }, [graphKey, applyLayout])

  const handleLayoutViewChange = useCallback((view: GraphLayoutView) => {
    pinnedRef.current.clear()
    setLayoutView(view)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setCanvasSize({ w: el.clientWidth, h: Math.max(400, el.clientHeight) })
    })
    ro.observe(el)
    setCanvasSize({ w: el.clientWidth, h: Math.max(400, el.clientHeight) })
    return () => ro.disconnect()
  }, [])

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - camera.panX) / camera.zoom,
      y: (sy - camera.panY) / camera.zoom,
    }),
    [camera],
  )

  const hitTest = useCallback(
    (sx: number, sy: number) => {
      const { x, y } = screenToWorld(sx, sy)
      let hit: GraphNode | null = null
      let best = Infinity
      for (const node of nodes) {
        const p = positionsRef.current.get(node.id)
        if (!p) continue
        const r = nodeDrawRadius(node) + 4
        const d = Math.hypot(x - p.x, y - p.y)
        if (d < r && d < best) {
          best = d
          hit = node
        }
      }
      return hit
    },
    [nodes, screenToWorld],
  )

  const fitView = useCallback(() => {
    const fit = fitCameraToBounds(positionsRef.current, canvasSize.w, canvasSize.h)
    setCamera(fit)
  }, [canvasSize])

  const clearSelection = useCallback(() => {
    setSelectedId(null)
    setHoveredId(null)
    setLocalGraph(false)
    setDragging(null)
  }, [])

  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      setCamera((c) => {
        const worldX = (sx - c.panX) / c.zoom
        const worldY = (sy - c.panY) / c.zoom
        const zoom = Math.min(3.5, Math.max(0.2, c.zoom * factor))
        return { zoom, panX: sx - worldX * zoom, panY: sy - worldY * zoom }
      })
    },
    [],
  )

  const pointerDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const getPinchCenter = (rect: DOMRect) => {
    const pts = [...activePointersRef.current.values()]
    if (pts.length < 2) return { x: rect.width / 2, y: rect.height / 2 }
    return { x: (pts[0].x + pts[1].x) / 2 - rect.left, y: (pts[0].y + pts[1].y) / 2 - rect.top }
  }

  useEffect(() => {
    if (positions.size > 0) fitView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey, layoutView])

  const openNode = useCallback(
    (node: GraphNode) => {
      if (node.type === 'note') {
        selectNote(node.id)
        setView('vault')
      } else if (node.type === 'email') {
        selectEmail(node.id)
        setView('email')
      } else if (node.type === 'person') {
        setGraphPersonFilter(node.id)
        setView('email')
      } else if (node.type === 'calendar') {
        setView('calendar')
      } else if (node.type === 'tag') {
        setSearch(node.label)
        setTypes(new Set(ALL_NODE_TYPES))
        setSelectedId(node.id)
      }
    },
    [selectNote, selectEmail, setView, setGraphPersonFilter],
  )

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
  ) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.max(Math.hypot(dx, dy), 1)
    const ux = dx / dist
    const uy = dy / dist
    const endX = x2 - ux * 10
    const endY = y2 - uy * 10
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.stroke()
    if (showArrows) {
      const head = 7
      const angle = Math.atan2(dy, dx)
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(endX - head * Math.cos(angle - 0.45), endY - head * Math.sin(angle - 0.45))
      ctx.lineTo(endX - head * Math.cos(angle + 0.45), endY - head * Math.sin(angle + 0.45))
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || positions.size === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const { w, h } = canvasSize
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // subtle grid
    ctx.save()
    ctx.translate(camera.panX, camera.panY)
    ctx.scale(camera.zoom, camera.zoom)
    const gridStep = 40
    const left = (-camera.panX) / camera.zoom
    const top = (-camera.panY) / camera.zoom
    const right = (w - camera.panX) / camera.zoom
    const bottom = (h - camera.panY) / camera.zoom
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)'
    ctx.lineWidth = 1 / camera.zoom
    for (let gx = Math.floor(left / gridStep) * gridStep; gx < right; gx += gridStep) {
      ctx.beginPath()
      ctx.moveTo(gx, top)
      ctx.lineTo(gx, bottom)
      ctx.stroke()
    }
    for (let gy = Math.floor(top / gridStep) * gridStep; gy < bottom; gy += gridStep) {
      ctx.beginPath()
      ctx.moveTo(left, gy)
      ctx.lineTo(right, gy)
      ctx.stroke()
    }

    edges.forEach((edge) => {
      const s = positionsRef.current.get(edge.source)
      const t = positionsRef.current.get(edge.target)
      if (!s || !t) return
      const active =
        !highlightIds || (highlightIds.has(edge.source) && highlightIds.has(edge.target))
      const color = active ? GRAPH_EDGE_COLORS[edge.type] : 'rgba(148, 163, 184, 0.06)'
      const width = (active ? GRAPH_EDGE_WIDTH[edge.type] : 0.6) / camera.zoom
      drawArrow(ctx, s.x, s.y, t.x, t.y, color, width)
    })

    nodes.forEach((node) => {
      const p = positionsRef.current.get(node.id)
      if (!p) return
      const active = !highlightIds || highlightIds.has(node.id)
      const isFocus = node.id === focusId
      const radius = nodeDrawRadius(node)
      const drawR = isFocus ? radius + 2.5 : radius

      ctx.beginPath()
      ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2)
      ctx.fillStyle = active ? GRAPH_NODE_COLORS[node.type] : 'rgba(100, 116, 139, 0.25)'
      ctx.globalAlpha = active ? 1 : 0.35
      ctx.fill()
      ctx.globalAlpha = 1

      if (isFocus) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2 / camera.zoom
        ctx.stroke()
      } else if (node.id === selectedId) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.lineWidth = 1.5 / camera.zoom
        ctx.stroke()
      }

      const showLabel = camera.zoom >= 0.55 || isFocus || active
      if (showLabel) {
        ctx.fillStyle = active ? 'rgba(226, 232, 240, 0.95)' : 'rgba(148, 163, 184, 0.4)'
        ctx.font = `${Math.max(9, 11 / camera.zoom)}px Inter, sans-serif`
        const label =
          node.type === 'person' && node.metadata?.totalInteractions
            ? `${node.label} (${node.metadata.totalInteractions})`
            : node.label
        const maxLen = camera.zoom < 0.8 ? 14 : 22
        const text = label.length > maxLen ? `${label.slice(0, maxLen - 1)}…` : label
        ctx.fillText(text, p.x - drawR, p.y + drawR + 12 / camera.zoom)
      }
    })

    ctx.restore()
  }, [
    positions,
    nodes,
    edges,
    camera,
    canvasSize,
    highlightIds,
    focusId,
    selectedId,
    showArrows,
  ])

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!canvas || !rect) return

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      const pts = [...activePointersRef.current.values()]
      pinchRef.current = {
        distance: pointerDistance(pts[0], pts[1]),
        zoom: camera.zoom,
        panX: camera.panX,
        panY: camera.panY,
      }
      setIsPinching(true)
      setDragging(null)
      setPanning(null)
      setSelectedId(null)
      setHoveredId(null)
      canvas.setPointerCapture(e.pointerId)
      return
    }

    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const hit = hitTest(sx, sy)
    if (hit) {
      const p = positionsRef.current.get(hit.id)!
      const world = screenToWorld(sx, sy)
      setDragging({ id: hit.id, ox: world.x - p.x, oy: world.y - p.y })
      setSelectedId(hit.id)
      canvas.setPointerCapture(e.pointerId)
    } else {
      clearSelection()
      setPanning({ sx: e.clientX, sy: e.clientY, panX: camera.panX, panY: camera.panY })
      canvas.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!canvas || !rect) return

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    if (activePointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...activePointersRef.current.values()]
      const dist = pointerDistance(pts[0], pts[1])
      const scale = dist / Math.max(pinchRef.current.distance, 1)
      const center = getPinchCenter(rect)
      const worldX = (center.x - pinchRef.current.panX) / pinchRef.current.zoom
      const worldY = (center.y - pinchRef.current.panY) / pinchRef.current.zoom
      const zoom = Math.min(3.5, Math.max(0.2, pinchRef.current.zoom * scale))
      setCamera({
        zoom,
        panX: center.x - worldX * zoom,
        panY: center.y - worldY * zoom,
      })
      return
    }

    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    if (dragging) {
      const world = screenToWorld(sx, sy)
      const next = new Map(positionsRef.current)
      next.set(dragging.id, { x: world.x - dragging.ox, y: world.y - dragging.oy })
      positionsRef.current = next
      pinnedRef.current.add(dragging.id)
      setPositions(next)
      bumpFrame((n) => n + 1)
      return
    }

    if (panning) {
      setCamera((c) => ({
        ...c,
        panX: panning.panX + (e.clientX - panning.sx),
        panY: panning.panY + (e.clientY - panning.sy),
      }))
      return
    }

    if (!isPinching) {
      setHoveredId(hitTest(sx, sy)?.id ?? null)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null
      setIsPinching(false)
    }
    setDragging(null)
    setPanning(null)
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    zoomAt(sx, sy, e.deltaY > 0 ? 0.9 : 1.1)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
    if (hit) openNode(hit)
  }

  const toggleType = (type: GraphNode['type']) => {
    setTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size === 1) return prev
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const connectedEdges = selectedId
    ? edges.filter((e) => e.source === selectedId || e.target === selectedId)
    : []

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
      {filtersOpen && (
        <aside className="w-full lg:w-56 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--glass-border)] glass flex flex-col min-h-0 max-h-[34vh] lg:max-h-none overflow-y-auto">
          <GraphFilterPanel
            search={search}
            onSearchChange={setSearch}
            types={types}
            onToggleType={toggleType}
            orphansOnly={orphansOnly}
            onOrphansOnlyChange={setOrphansOnly}
            localGraph={localGraph}
            onLocalGraphChange={setLocalGraph}
            localDepth={localDepth}
            onLocalDepthChange={setLocalDepth}
            showArrows={showArrows}
            onShowArrowsChange={setShowArrows}
            layoutView={layoutView}
            onLayoutViewChange={handleLayoutViewChange}
            typeCounts={typeCounts}
            selectedNode={selectedNode}
            orphanCount={orphanCount}
          />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-h-0 min-w-0 p-2 sm:p-3 lg:p-4">
        <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-theme">Knowledge Graph</h1>
            <p className="text-[10px] sm:text-xs text-theme-muted mt-0.5 truncate">
              {nodes.length} nodes · {edges.length} links
              {activeVault ? ` · ${activeVault.name}` : ' · all vaults'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="p-1.5 rounded-lg glass hover-theme text-theme-muted"
              title={filtersOpen ? 'Hide filters' : 'Show filters'}
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={clearSelection}
                className="px-2 py-1 rounded-lg glass hover-theme text-[10px] text-theme-secondary"
              >
                Unselect
              </button>
            )}
            <button
              type="button"
              onClick={() => zoomAt(canvasSize.w / 2, canvasSize.h / 2, 1.2)}
              className="p-1.5 rounded-lg glass hover-theme text-theme-muted"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => zoomAt(canvasSize.w / 2, canvasSize.h / 2, 1 / 1.2)}
              className="p-1.5 rounded-lg glass hover-theme text-theme-muted"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={fitView}
              className="p-1.5 rounded-lg glass hover-theme text-theme-muted"
              title="Fit to view"
            >
              <Maximize2 size={14} />
            </button>
            <label className="sr-only" htmlFor="graph-layout-select">
              Layout
            </label>
            <select
              id="graph-layout-select"
              value={layoutView}
              onChange={(e) => handleLayoutViewChange(e.target.value as GraphLayoutView)}
              className="max-w-[5.5rem] sm:max-w-none px-1.5 py-1 rounded-lg glass text-[10px] text-theme-secondary outline-none cursor-pointer"
              title="Graph layout"
            >
              {GRAPH_LAYOUT_VIEWS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                applyLayout(true)
                fitView()
              }}
              className="p-1.5 rounded-lg glass hover-theme text-theme-muted"
              title="Reset layout"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0 gap-3">
          <div
            ref={containerRef}
            className="flex-1 glass rounded-xl overflow-hidden relative min-h-[320px] border border-[var(--glass-border)]"
          >
            {nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-theme-muted p-6 text-center">
                No nodes match your filters. Try enabling more groups or clearing search.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full touch-none"
                style={{ cursor: dragging ? 'grabbing' : panning ? 'grabbing' : 'grab' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onWheel={onWheel}
                onDoubleClick={onDoubleClick}
              />
            )}

            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px] text-theme-secondary glass rounded-lg px-2.5 py-1.5 pointer-events-none">
              {ALL_NODE_TYPES.map((type) => (
                <span key={type} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: GRAPH_NODE_COLORS[type] }}
                  />
                  {GRAPH_TYPE_LABELS[type]}
                </span>
              ))}
            </div>
          </div>

          {selectedNode && (
            <aside className="hidden xl:flex w-56 shrink-0 flex-col glass rounded-xl border border-[var(--glass-border)] overflow-hidden">
              <div className="p-3 border-b border-[var(--glass-border)] flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-theme-muted">
                    {GRAPH_TYPE_LABELS[selectedNode.type]}
                  </p>
                  <p className="text-sm font-semibold text-theme mt-1 leading-snug break-words">
                    {selectedNode.label}
                  </p>
                  {selectedNode.type === 'person' && selectedNode.metadata && (
                    <p className="text-[10px] text-theme-muted mt-1">
                      {selectedNode.metadata.emailCount ?? 0} emails ·{' '}
                      {selectedNode.metadata.calendarCount ?? 0} events
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-1 rounded-lg hover-theme text-theme-muted shrink-0"
                  aria-label="Close selection"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-muted">
                  Connections ({connectedEdges.length})
                </p>
                {connectedEdges.slice(0, 8).map((edge) => {
                  const otherId = edge.source === selectedId ? edge.target : edge.source
                  const other = nodes.find((n) => n.id === otherId)
                  if (!other) return null
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => setSelectedId(other.id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg glass hover-theme text-[11px]"
                    >
                      <span className="text-theme-muted">{GRAPH_EDGE_LABELS[edge.type]}</span>
                      <span className="block text-theme-secondary truncate">{other.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="p-3 border-t border-[var(--glass-border)] space-y-1.5">
                <button
                  type="button"
                  onClick={() => openNode(selectedNode)}
                  className="w-full px-3 py-1.5 rounded-lg btn-accent text-xs font-medium"
                >
                  Open
                </button>
                {selectedNode.type === 'person' && (
                  <button
                    type="button"
                    onClick={() => openNode(selectedNode)}
                    className="w-full px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme flex items-center justify-center gap-1"
                  >
                    <Mail size={12} /> Filter inbox
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLocalGraph(true)
                    fitView()
                  }}
                  className="w-full px-3 py-1.5 rounded-lg glass text-xs text-theme-secondary hover-theme flex items-center justify-center gap-1"
                >
                  <Focus size={12} /> Local graph
                </button>
              </div>
            </aside>
          )}
        </div>

        {selectedNode && (
          <div className="xl:hidden mt-2 glass rounded-xl p-3 border border-[var(--glass-border)] shrink-0 relative">
            <button
              type="button"
              onClick={clearSelection}
              className="absolute top-2 right-2 p-1.5 rounded-lg hover-theme text-theme-muted"
              aria-label="Close selection"
            >
              <X size={16} />
            </button>
            <div className="flex items-center justify-between gap-2 pr-8">
              <div className="min-w-0">
                <p className="text-[10px] text-theme-muted">{GRAPH_TYPE_LABELS[selectedNode.type]}</p>
                <p className="text-sm font-medium text-theme truncate">{selectedNode.label}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setLocalGraph(true)}
                  className="px-2.5 py-1 rounded-lg glass text-[10px] text-theme-secondary"
                >
                  Local
                </button>
                <button
                  type="button"
                  onClick={() => openNode(selectedNode)}
                  className="px-2.5 py-1 rounded-lg btn-accent text-[10px] font-medium"
                >
                  Open
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
