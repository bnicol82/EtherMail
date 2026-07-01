import { useEffect, useMemo, useRef } from 'react'
import type { GraphEdge, GraphNode } from '../types'
import { runForceLayout, nodeDrawRadius } from '../lib/graphLayout'
import { GRAPH_EDGE_COLORS, GRAPH_NODE_COLORS } from '../lib/graphTheme'

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width?: number
  height?: number
  focusId?: string | null
  onNodeClick?: (id: string) => void
}

export function MiniGraph({
  nodes,
  edges,
  width = 280,
  height = 200,
  focusId,
  onNodeClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const { displayNodes, displayEdges } = useMemo(() => {
    if (!focusId) return { displayNodes: nodes, displayEdges: edges }

    const neighborIds = new Set<string>([focusId])
    edges.forEach((e) => {
      if (e.source === focusId) neighborIds.add(e.target)
      if (e.target === focusId) neighborIds.add(e.source)
    })
    const filtered = nodes.filter((n) => neighborIds.has(n.id)).slice(0, 14)
    const ids = new Set(filtered.map((n) => n.id))
    return {
      displayNodes: filtered,
      displayEdges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    }
  }, [nodes, edges, focusId])

  const layoutKey = useMemo(
    () => displayNodes.map((n) => n.id).join('|'),
    [displayNodes],
  )

  useEffect(() => {
    positionsRef.current = runForceLayout(displayNodes, displayEdges, {
      width,
      height,
      iterations: 80,
    })
  }, [layoutKey, displayNodes, displayEdges, width, height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const positions = positionsRef.current

    displayEdges.forEach((edge) => {
      const s = positions.get(edge.source)
      const t = positions.get(edge.target)
      if (!s || !t) return
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(t.x, t.y)
      ctx.strokeStyle = GRAPH_EDGE_COLORS[edge.type] ?? 'rgba(148, 163, 184, 0.15)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    displayNodes.forEach((node) => {
      const p = positions.get(node.id)
      if (!p) return
      const isFocus = node.id === focusId
      const baseRadius = nodeDrawRadius(node)
      const radius = isFocus ? baseRadius + 2 : Math.max(4, baseRadius - 1)

      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = GRAPH_NODE_COLORS[node.type]
      ctx.globalAlpha = isFocus ? 1 : 0.8
      ctx.fill()
      ctx.globalAlpha = 1

      if (isFocus) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      if (isFocus || displayNodes.length <= 8) {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.9)'
        ctx.font = '9px Inter, sans-serif'
        const label = node.label.length > 14 ? `${node.label.slice(0, 12)}…` : node.label
        ctx.fillText(label, p.x - 22, p.y + radius + 10)
      }
    })
  }, [displayNodes, displayEdges, width, height, focusId, layoutKey])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const positions = positionsRef.current

    for (const node of displayNodes) {
      const p = positions.get(node.id)
      if (!p) continue
      const r = nodeDrawRadius(node) + 6
      if (Math.hypot(x - p.x, y - p.y) < r) {
        onNodeClick(node.id)
        return
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-lg cursor-pointer bg-[var(--glass-bg)]/30"
      style={{ width, height }}
      onClick={handleClick}
    />
  )
}
