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
        const force = (900 * cooling) / (dist * dist)
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
      const force = (dist - target) * 0.035 * cooling
      a.vx += (dx / dist) * force
      a.vy += (dy / dist) * force
      b.vx -= (dx / dist) * force
      b.vy -= (dy / dist) * force
    })

    pos.forEach((p) => {
      p.vx += (width / 2 - p.x) * 0.0015
      p.vy += (height / 2 - p.y) * 0.0015
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
