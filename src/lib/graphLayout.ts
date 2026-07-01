import type { GraphEdge, GraphNode } from '../types'
import { personRadius } from './contactGraph'

export interface GraphPosition {
  x: number
  y: number
}

export interface ForceLayoutOptions {
  width?: number
  height?: number
  iterations?: number
  seed?: number
  forces?: GraphForceSettings
}

/** Slider values 10–200 (100 = default), like percentage tuning */
export interface GraphForceSettings {
  centerForce: number
  repelForce: number
  linkForce: number
  linkDistance: number
}

export const DEFAULT_GRAPH_FORCE_SETTINGS: GraphForceSettings = {
  centerForce: 100,
  repelForce: 100,
  linkForce: 100,
  linkDistance: 100,
}

export const GRAPH_FORCE_SLIDERS: {
  key: keyof GraphForceSettings
  label: string
  hint: string
  min: number
  max: number
}[] = [
  { key: 'centerForce', label: 'Center', hint: 'Pull toward middle — higher = tighter blob', min: 10, max: 200 },
  { key: 'repelForce', label: 'Repel', hint: 'Push nodes apart', min: 10, max: 200 },
  { key: 'linkForce', label: 'Link pull', hint: 'Spring tension on connections', min: 10, max: 200 },
  { key: 'linkDistance', label: 'Link length', hint: 'Target distance between linked nodes', min: 40, max: 200 },
]

function forceMult(value: number | undefined): number {
  return (value ?? 100) / 100
}

export type GraphLayoutView =
  | 'force'
  | 'circular'
  | 'spiral'
  | 'grid'
  | 'radial'
  | 'hierarchical'
  | 'concentric'
  | 'cluster'

export const GRAPH_LAYOUT_VIEWS: {
  id: GraphLayoutView
  label: string
  hint: string
}[] = [
  { id: 'force', label: 'Force', hint: 'Physics layout' },
  { id: 'circular', label: 'Circular', hint: 'Even ring' },
  { id: 'spiral', label: 'Spiral', hint: 'Outward spiral' },
  { id: 'grid', label: 'Grid', hint: 'Square grid' },
  { id: 'radial', label: 'Radial', hint: 'Grouped by type' },
  { id: 'cluster', label: 'Cluster', hint: 'Spaced type islands' },
  { id: 'hierarchical', label: 'Tree', hint: 'Layered from hub' },
  { id: 'concentric', label: 'Rings', hint: 'By connections' },
]

interface LayoutBounds {
  width: number
  height: number
  cx: number
  cy: number
}

function layoutBounds(options: ForceLayoutOptions = {}): LayoutBounds {
  const width = options.width ?? 900
  const height = options.height ?? 600
  return { width, height, cx: width / 2, cy: height / 2 }
}

function sortedNodes(nodes: GraphNode[]): GraphNode[] {
  return [...nodes].sort((a, b) => {
    const t = a.type.localeCompare(b.type)
    if (t !== 0) return t
    return a.label.localeCompare(b.label)
  })
}

function nodeDegrees(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const deg = new Map<string, number>()
  nodes.forEach((n) => deg.set(n.id, 0))
  edges.forEach((e) => {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1)
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1)
  })
  return deg
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function hashIds(ids: string[]): number {
  let h = 2166136261
  for (const id of ids) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  return Math.abs(h) || 1
}

export function runForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const width = options.width ?? 900
  const height = options.height ?? 600
  const iterations = options.iterations ?? 120
  const rand = seededRandom(options.seed ?? hashIds(nodes.map((n) => n.id)))
  const forces = options.forces ?? DEFAULT_GRAPH_FORCE_SETTINGS
  const centerPull = 0.0015 * forceMult(forces.centerForce)
  const repelStrength = 900 * forceMult(forces.repelForce)
  const linkStrength = 0.035 * forceMult(forces.linkForce)
  const linkDistScale = forceMult(forces.linkDistance)

  const pos = new Map<string, GraphPosition & { vx: number; vy: number }>()
  nodes.forEach((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2
    const r = 160 + rand() * 100
    pos.set(n.id, {
      x: width / 2 + Math.cos(angle) * r,
      y: height / 2 + Math.sin(angle) * r,
      vx: 0,
      vy: 0,
    })
  })

  const linkDistance = (type: GraphEdge['type']) => {
    const base = (() => {
      switch (type) {
        case 'links_to':
          return 72
        case 'tagged':
          return 88
        case 'references':
          return 110
        case 'from':
        case 'emailed':
          return 95
        case 'attended':
          return 100
        default:
          return 100
      }
    })()
    return base * linkDistScale
  }

  for (let iter = 0; iter < iterations; iter++) {
    const ids = [...pos.keys()]
    const cooling = 1 - iter / iterations

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!
        const b = pos.get(ids[j])!
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.max(Math.hypot(dx, dy), 1)
        const force = (repelStrength * cooling) / (dist * dist)
        a.vx -= (dx / dist) * force
        a.vy -= (dy / dist) * force
        b.vx += (dx / dist) * force
        b.vy += (dy / dist) * force
      }
    }

    edges.forEach((e) => {
      const a = pos.get(e.source)
      const b = pos.get(e.target)
      if (!a || !b) return
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.max(Math.hypot(dx, dy), 1)
      const target = linkDistance(e.type)
      const force = (dist - target) * linkStrength * cooling
      a.vx += (dx / dist) * force
      a.vy += (dy / dist) * force
      b.vx -= (dx / dist) * force
      b.vy -= (dy / dist) * force
    })

    pos.forEach((p) => {
      p.vx += (width / 2 - p.x) * centerPull
      p.vy += (height / 2 - p.y) * centerPull
      p.vx *= 0.82
      p.vy *= 0.82
      p.x += p.vx
      p.y += p.vy
    })
  }

  const final = new Map<string, GraphPosition>()
  pos.forEach((p, id) => final.set(id, { x: p.x, y: p.y }))
  return final
}

export function runCircularLayout(
  nodes: GraphNode[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const { cx, cy } = layoutBounds(options)
  const sorted = sortedNodes(nodes)
  const n = sorted.length
  const radius = Math.max(120, Math.min(260, 28 * Math.sqrt(n)))
  const result = new Map<string, GraphPosition>()
  sorted.forEach((node, i) => {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2
    result.set(node.id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    })
  })
  return result
}

export function runSpiralLayout(
  nodes: GraphNode[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const { cx, cy } = layoutBounds(options)
  const sorted = sortedNodes(nodes)
  const result = new Map<string, GraphPosition>()
  const spacing = 14
  sorted.forEach((node, i) => {
    const angle = i * 0.55
    const radius = spacing * angle * 0.35
    result.set(node.id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    })
  })
  return result
}

export function runGridLayout(
  nodes: GraphNode[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const { cx, cy } = layoutBounds(options)
  const sorted = sortedNodes(nodes)
  const n = sorted.length
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const rows = Math.max(1, Math.ceil(n / cols))
  const cell = Math.min(72, Math.max(48, 520 / Math.max(cols, rows)))
  const result = new Map<string, GraphPosition>()
  const gridW = (cols - 1) * cell
  const gridH = (rows - 1) * cell
  sorted.forEach((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    result.set(node.id, {
      x: cx - gridW / 2 + col * cell,
      y: cy - gridH / 2 + row * cell,
    })
  })
  return result
}

const TYPE_ORDER: GraphNode['type'][] = ['note', 'email', 'person', 'tag', 'calendar']

/** Relative anchor for each type cluster (scaled from canvas center) */
const CLUSTER_ANCHORS: Record<GraphNode['type'], { x: number; y: number }> = {
  note: { x: -0.38, y: -0.32 },
  email: { x: 0.38, y: -0.32 },
  person: { x: 0, y: 0.02 },
  tag: { x: -0.38, y: 0.34 },
  calendar: { x: 0.38, y: 0.34 },
}

function nodesByType(nodes: GraphNode[]): Map<GraphNode['type'], GraphNode[]> {
  const byType = new Map<GraphNode['type'], GraphNode[]>()
  TYPE_ORDER.forEach((t) => byType.set(t, []))
  nodes.forEach((n) => {
    const list = byType.get(n.type) ?? []
    list.push(n)
    byType.set(n.type, list)
  })
  return byType
}

function layoutClusterGroup(
  group: GraphNode[],
  centerX: number,
  centerY: number,
  result: Map<string, GraphPosition>,
): void {
  const sorted = [...group].sort((a, b) => a.label.localeCompare(b.label))
  const n = sorted.length
  if (n === 0) return
  if (n === 1) {
    result.set(sorted[0].id, { x: centerX, y: centerY })
    return
  }

  const ringRadius = Math.max(36, Math.min(105, 15 * Math.sqrt(n)))
  sorted.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    result.set(node.id, {
      x: centerX + Math.cos(angle) * ringRadius,
      y: centerY + Math.sin(angle) * ringRadius,
    })
  })
}

export function runClusterLayout(
  nodes: GraphNode[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const { cx, cy, width, height } = layoutBounds(options)
  const result = new Map<string, GraphPosition>()
  const byType = nodesByType(nodes)
  const spreadX = width * 0.42
  const spreadY = height * 0.4

  for (const type of TYPE_ORDER) {
    const group = byType.get(type) ?? []
    if (group.length === 0) continue
    const anchor = CLUSTER_ANCHORS[type]
    const clusterX = cx + anchor.x * spreadX
    const clusterY = cy + anchor.y * spreadY
    layoutClusterGroup(group, clusterX, clusterY, result)
  }

  return result
}

export function runRadialLayout(
  nodes: GraphNode[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const { cx, cy } = layoutBounds(options)
  const result = new Map<string, GraphPosition>()
  const byType = new Map<GraphNode['type'], GraphNode[]>()
  TYPE_ORDER.forEach((t) => byType.set(t, []))
  nodes.forEach((n) => {
    const list = byType.get(n.type) ?? []
    list.push(n)
    byType.set(n.type, list)
  })

  const activeTypes = TYPE_ORDER.filter((t) => (byType.get(t)?.length ?? 0) > 0)
  const slice = (Math.PI * 2) / Math.max(activeTypes.length, 1)

  activeTypes.forEach((type, ti) => {
    const group = (byType.get(type) ?? []).sort((a, b) => a.label.localeCompare(b.label))
    const start = ti * slice - Math.PI / 2
    const end = start + slice * 0.92
    group.forEach((node, i) => {
      const t = group.length === 1 ? 0.5 : i / (group.length - 1)
      const angle = start + (end - start) * t
      const radius = 90 + (i % 3) * 36
      result.set(node.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      })
    })
  })

  return result
}

export function runHierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const { cx, cy, width, height } = layoutBounds(options)
  const result = new Map<string, GraphPosition>()
  if (nodes.length === 0) return result

  const adj = buildAdjacency(edges)
  const degrees = nodeDegrees(nodes, edges)
  const root = [...nodes].sort(
    (a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0),
  )[0].id

  const layers: string[][] = []
  const seen = new Set<string>([root])
  layers.push([root])
  let frontier = [root]

  while (frontier.length > 0 && layers.flat().length < nodes.length) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of adj.get(id) ?? []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor)
          next.push(neighbor)
        }
      }
    }
    if (next.length > 0) layers.push(next.sort())
    frontier = next
  }

  const remaining = nodes.filter((n) => !seen.has(n.id)).map((n) => n.id)
  if (remaining.length > 0) layers.push(remaining)

  const layerGap = Math.min(90, (height - 80) / Math.max(layers.length, 1))
  const topY = cy - ((layers.length - 1) * layerGap) / 2

  layers.forEach((layer, li) => {
    const y = topY + li * layerGap
    const gap = Math.min(64, (width - 80) / Math.max(layer.length, 1))
    const rowW = (layer.length - 1) * gap
    layer.forEach((id, i) => {
      result.set(id, { x: cx - rowW / 2 + i * gap, y })
    })
  })

  return result
}

export function runConcentricLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  const { cx, cy } = layoutBounds(options)
  const degrees = nodeDegrees(nodes, edges)
  const sorted = [...nodes].sort(
    (a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0),
  )

  const ringCapacity = [1, 8, 16, 24, 32]
  const result = new Map<string, GraphPosition>()
  let idx = 0
  let ring = 0

  while (idx < sorted.length) {
    const cap = ringCapacity[ring] ?? 24 + ring * 10
    const slice = sorted.slice(idx, idx + cap)
    const radius = ring === 0 ? 0 : 55 + ring * 58
    slice.forEach((node, i) => {
      if (ring === 0) {
        result.set(node.id, { x: cx, y: cy })
        return
      }
      const angle = (i / slice.length) * Math.PI * 2 - Math.PI / 2
      result.set(node.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      })
    })
    idx += slice.length
    ring += 1
  }

  return result
}

export function runGraphLayout(
  view: GraphLayoutView,
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ForceLayoutOptions = {},
): Map<string, GraphPosition> {
  switch (view) {
    case 'circular':
      return runCircularLayout(nodes, options)
    case 'spiral':
      return runSpiralLayout(nodes, options)
    case 'grid':
      return runGridLayout(nodes, options)
    case 'radial':
      return runRadialLayout(nodes, options)
    case 'cluster':
      return runClusterLayout(nodes, options)
    case 'hierarchical':
      return runHierarchicalLayout(nodes, edges, options)
    case 'concentric':
      return runConcentricLayout(nodes, edges, options)
    case 'force':
    default:
      return runForceLayout(nodes, edges, options)
  }
}

export function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set())
    if (!adj.has(b)) adj.set(b, new Set())
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }
  edges.forEach((e) => link(e.source, e.target))
  return adj
}

export function getNeighborhood(
  rootId: string,
  edges: GraphEdge[],
  depth: number,
): Set<string> {
  const adj = buildAdjacency(edges)
  const seen = new Set<string>([rootId])
  let frontier = [rootId]
  for (let d = 0; d < depth; d++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of adj.get(id) ?? []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor)
          next.push(neighbor)
        }
      }
    }
    frontier = next
  }
  return seen
}

export function findOrphanIds(nodes: GraphNode[], edges: GraphEdge[]): Set<string> {
  const connected = new Set<string>()
  edges.forEach((e) => {
    connected.add(e.source)
    connected.add(e.target)
  })
  return new Set(nodes.filter((n) => !connected.has(n.id)).map((n) => n.id))
}

export function countNodesByType(nodes: GraphNode[]): Record<GraphNode['type'], number> {
  const counts: Record<GraphNode['type'], number> = {
    note: 0,
    email: 0,
    person: 0,
    tag: 0,
    calendar: 0,
  }
  nodes.forEach((n) => {
    counts[n.type] += 1
  })
  return counts
}

export interface GraphFilters {
  types: Set<GraphNode['type']>
  search: string
  orphansOnly: boolean
  localRootId: string | null
  localDepth: number
}

export function filterGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  filters: GraphFilters,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  let filteredNodes = nodes.filter((n) => filters.types.has(n.type))

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    const matching = new Set(
      filteredNodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id),
    )
    if (matching.size > 0) {
      const expanded = new Set(matching)
      edges.forEach((e) => {
        if (matching.has(e.source)) expanded.add(e.target)
        if (matching.has(e.target)) expanded.add(e.source)
      })
      filteredNodes = filteredNodes.filter((n) => expanded.has(n.id))
    } else {
      filteredNodes = []
    }
  }

  if (filters.orphansOnly) {
    const orphans = findOrphanIds(filteredNodes, edges)
    filteredNodes = filteredNodes.filter((n) => orphans.has(n.id))
  }

  if (filters.localRootId) {
    const neighborhood = getNeighborhood(filters.localRootId, edges, filters.localDepth)
    filteredNodes = filteredNodes.filter((n) => neighborhood.has(n.id))
  }

  const ids = new Set(filteredNodes.map((n) => n.id))
  const filteredEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target))

  return { nodes: filteredNodes, edges: filteredEdges }
}

export function nodeDrawRadius(node: GraphNode): number {
  return node.type === 'person' ? personRadius(node.metadata) : 7
}

export function fitCameraToBounds(
  positions: Map<string, GraphPosition>,
  canvasW: number,
  canvasH: number,
  padding = 48,
): { panX: number; panY: number; zoom: number } {
  if (positions.size === 0) return { panX: 0, panY: 0, zoom: 1 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  positions.forEach((p) => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  })

  const bw = Math.max(maxX - minX, 80)
  const bh = Math.max(maxY - minY, 80)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const zoom = Math.min((canvasW - padding * 2) / bw, (canvasH - padding * 2) / bh, 2.5)
  const panX = canvasW / 2 - cx * zoom
  const panY = canvasH / 2 - cy * zoom
  return { panX, panY, zoom }
}
