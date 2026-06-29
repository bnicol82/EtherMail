import { useEffect, useRef, useState } from 'react'
import { useNexusStore, useGraph } from '../store/useStore'
import type { GraphNode } from '../types'

const TYPE_COLORS: Record<GraphNode['type'], string> = {
  note: '#6366f1',
  email: '#22d3ee',
  person: '#f472b6',
  tag: '#a78bfa',
}

export function GraphView() {
  const { nodes, edges } = useGraph()
  const selectNote = useNexusStore((s) => s.selectNote)
  const selectEmail = useNexusStore((s) => s.selectEmail)
  const setView = useNexusStore((s) => s.setView)
  const notes = useNexusStore((s) => s.notes)
  const emails = useNexusStore((s) => s.emails)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [hovered, setHovered] = useState<string | null>(null)

  const width = 900
  const height = 600

  // Simple force layout
  useEffect(() => {
    const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>()
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      const r = 180 + Math.random() * 80
      pos.set(n.id, {
        x: width / 2 + Math.cos(angle) * r,
        y: height / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      })
    })

    for (let iter = 0; iter < 80; iter++) {
      // Repulsion
      const ids = [...pos.keys()]
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos.get(ids[i])!
          const b = pos.get(ids[j])!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.max(Math.hypot(dx, dy), 1)
          const force = 800 / (dist * dist)
          a.vx -= (dx / dist) * force
          a.vy -= (dy / dist) * force
          b.vx += (dx / dist) * force
          b.vy += (dy / dist) * force
        }
      }
      // Attraction along edges
      edges.forEach((e) => {
        const a = pos.get(e.source)
        const b = pos.get(e.target)
        if (!a || !b) return
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.max(Math.hypot(dx, dy), 1)
        const force = (dist - 100) * 0.02
        a.vx += (dx / dist) * force
        a.vy += (dy / dist) * force
        b.vx -= (dx / dist) * force
        b.vy -= (dy / dist) * force
      })
      // Center gravity
      pos.forEach((p) => {
        p.vx += (width / 2 - p.x) * 0.001
        p.vy += (height / 2 - p.y) * 0.001
        p.vx *= 0.85
        p.vy *= 0.85
        p.x += p.vx
        p.y += p.vy
      })
    }

    const final = new Map<string, { x: number; y: number }>()
    pos.forEach((p, id) => final.set(id, { x: p.x, y: p.y }))
    setPositions(final)
  }, [nodes.length, edges.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || positions.size === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = containerRef.current?.clientWidth ?? width
    const h = Math.min(600, window.innerHeight - 200)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    const scaleX = w / width
    const scaleY = h / height

    ctx.clearRect(0, 0, w, h)

    edges.forEach((edge) => {
      const s = positions.get(edge.source)
      const t = positions.get(edge.target)
      if (!s || !t) return
      ctx.beginPath()
      ctx.moveTo(s.x * scaleX, s.y * scaleY)
      ctx.lineTo(t.x * scaleX, t.y * scaleY)
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    nodes.forEach((node) => {
      const p = positions.get(node.id)
      if (!p) return
      const x = p.x * scaleX
      const y = p.y * scaleY
      const isHovered = hovered === node.id
      const radius = isHovered ? 10 : 6

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = TYPE_COLORS[node.type]
      ctx.fill()

      if (isHovered) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.fillStyle = '#cbd5e1'
      ctx.font = '11px Inter, sans-serif'
      ctx.fillText(node.label.slice(0, 20), x - 30, y + radius + 12)
    })
  }, [positions, nodes, edges, hovered])

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width
    const h = rect.height
    const scaleX = w / width
    const scaleY = h / height

    for (const node of nodes) {
      const p = positions.get(node.id)
      if (!p) continue
      const nx = p.x * scaleX
      const ny = p.y * scaleY
      if (Math.hypot(x - nx, y - ny) < 14) {
        if (node.type === 'note' || notes.find((n) => n.id === node.id)) {
          selectNote(node.id)
          setView('vault')
        } else if (node.type === 'email' || emails.find((em) => em.id === node.id)) {
          selectEmail(node.id)
          setView('email')
        }
        return
      }
    }
  }

  const handleMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width
    const h = rect.height
    const scaleX = w / width
    const scaleY = h / height

    let found: string | null = null
    for (const node of nodes) {
      const p = positions.get(node.id)
      if (!p) continue
      if (Math.hypot(x - p.x * scaleX, y - p.y * scaleY) < 14) {
        found = node.id
        break
      }
    }
    setHovered(found)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 md:p-6 pb-24">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-theme">Knowledge Graph</h1>
        <p className="text-sm text-theme-muted mt-1">
          {nodes.length} nodes · {edges.length} connections — click a node to navigate
        </p>
      </div>

      <div ref={containerRef} className="flex-1 glass rounded-xl overflow-hidden relative min-h-[400px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={handleClick}
          onMouseMove={handleMove}
        />
        <div className="absolute bottom-4 left-4 flex gap-3 text-xs text-theme-secondary glass rounded-lg px-3 py-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Notes</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Emails</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> People</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Tags</span>
        </div>
      </div>
    </div>
  )
}
