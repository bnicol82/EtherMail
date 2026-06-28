import { useEffect, useRef } from 'react'
import type { GraphEdge, GraphNode } from '../types'

const TYPE_COLORS: Record<GraphNode['type'], string> = {
  note: '#6366f1',
  email: '#22d3ee',
  person: '#f472b6',
  tag: '#a78bfa',
}

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Layout: simple force-like circle if no positions
    const positioned = nodes.map((n, i) => {
      if (n.x !== undefined && n.y !== undefined) return n
      const angle = (i / nodes.length) * Math.PI * 2
      const r = Math.min(width, height) * 0.32
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * r,
        y: height / 2 + Math.sin(angle) * r,
      }
    })

    // If focus, filter to neighborhood
    let displayNodes = positioned
    let displayEdges = edges
    if (focusId) {
      const neighborIds = new Set<string>([focusId])
      edges.forEach((e) => {
        if (e.source === focusId) neighborIds.add(e.target)
        if (e.target === focusId) neighborIds.add(e.source)
      })
      displayNodes = positioned.filter((n) => neighborIds.has(n.id)).slice(0, 12)
      const ids = new Set(displayNodes.map((n) => n.id))
      displayEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target))
    }

    ctx.clearRect(0, 0, width, height)

    // Edges
    displayEdges.forEach((edge) => {
      const s = displayNodes.find((n) => n.id === edge.source)
      const t = displayNodes.find((n) => n.id === edge.target)
      if (!s?.x || !s?.y || !t?.x || !t?.y) return
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(t.x, t.y)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Nodes
    displayNodes.forEach((node) => {
      if (node.x === undefined || node.y === undefined) return
      const isFocus = node.id === focusId
      const radius = isFocus ? 8 : 5
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = TYPE_COLORS[node.type]
      ctx.globalAlpha = isFocus ? 1 : 0.75
      ctx.fill()
      ctx.globalAlpha = 1

      if (isFocus) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      ctx.fillStyle = '#94a3b8'
      ctx.font = '9px Inter, sans-serif'
      const label = node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label
      ctx.fillText(label, node.x - 20, node.y + radius + 10)
    })
  }, [nodes, edges, width, height, focusId])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
  nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      const r = Math.min(width, height) * 0.32
      const nx = n.x ?? width / 2 + Math.cos(angle) * r
      const ny = n.y ?? height / 2 + Math.sin(angle) * r
      if (Math.hypot(x - nx, y - ny) < 12) onNodeClick(n.id)
    })
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-lg cursor-pointer"
      style={{ width, height }}
      onClick={handleClick}
    />
  )
}
