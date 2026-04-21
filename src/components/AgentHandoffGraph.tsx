'use client'

// エージェント間のhandoff関係を SVG で可視化（依存なし force-directed layout の簡易版）
// 実際の agent_runs から「同じ startup_id に近い時刻で連鎖したタスク」を handoff として推定

import { useEffect, useRef, useState } from 'react'

interface AgentNode {
  id: string
  label: string
  color: string
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null  // fixed position (for CEO center)
  fy?: number | null
  runCount: number
  cost: number
}

interface Edge {
  source: string
  target: string
  weight: number
  lastAt: number
}

const AGENTS = [
  { id: 'ceo', label: 'CEO', color: '#f59e0b', taskType: 'pivot_analysis' },
  { id: 'cto', label: 'CTO', color: '#3b82f6', taskType: 'mvp_spec' },
  { id: 'cmo', label: 'CMO', color: '#ec4899', taskType: 'market_research' },
  { id: 'coo', label: 'COO', color: '#f97316', taskType: 'ops_review' },
  { id: 'cfo', label: 'CFO', color: '#22c55e', taskType: 'budget_review' },
]

interface Props {
  runs: Array<{
    task_type: string | null
    startup_id: string | null
    cost_usd: number | null
    created_at: string
  }>
  width?: number
  height?: number
}

export default function AgentHandoffGraph({ runs, width = 400, height = 320 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<AgentNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [pulsingEdge, setPulsingEdge] = useState<string | null>(null)

  // 初期ノード配置＋handoff推定
  useEffect(() => {
    const cx = width / 2
    const cy = height / 2

    // CEO を中心、CxO を円周上に配置
    const initialNodes: AgentNode[] = AGENTS.map((a, i) => {
      if (a.id === 'ceo') {
        return {
          ...a,
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          fx: cx,
          fy: cy,
          runCount: 0,
          cost: 0,
        }
      }
      const angle = (i - 1) * ((2 * Math.PI) / (AGENTS.length - 1)) - Math.PI / 2
      const r = Math.min(cx, cy) * 0.65
      return {
        ...a,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        runCount: 0,
        cost: 0,
      }
    })

    // ラン集計
    runs.forEach((r) => {
      const agent = AGENTS.find((a) => a.taskType === r.task_type)
      if (!agent) return
      const node = initialNodes.find((n) => n.id === agent.id)
      if (node) {
        node.runCount++
        node.cost += Number(r.cost_usd || 0)
      }
    })

    // Handoff推定: 同じstartup_idで、CEOからの pivot_analysis → その後30分以内の他エージェントランを handoff扱い
    const runsBySim = [...runs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const edgeMap: Record<string, Edge> = {}
    for (let i = 0; i < runsBySim.length; i++) {
      const current = runsBySim[i]
      const currentAgent = AGENTS.find((a) => a.taskType === current.task_type)
      if (!currentAgent) continue
      // 同じstartup_idで 6時間以内の次のランを handoff とみなす
      for (let j = i + 1; j < runsBySim.length; j++) {
        const next = runsBySim[j]
        if (next.startup_id !== current.startup_id) continue
        const nextAgent = AGENTS.find((a) => a.taskType === next.task_type)
        if (!nextAgent || nextAgent.id === currentAgent.id) continue
        const dt =
          new Date(next.created_at).getTime() - new Date(current.created_at).getTime()
        if (dt > 6 * 3600 * 1000) break
        const key = `${currentAgent.id}→${nextAgent.id}`
        if (!edgeMap[key]) {
          edgeMap[key] = {
            source: currentAgent.id,
            target: nextAgent.id,
            weight: 0,
            lastAt: 0,
          }
        }
        edgeMap[key].weight++
        edgeMap[key].lastAt = Math.max(
          edgeMap[key].lastAt,
          new Date(next.created_at).getTime()
        )
        break // first handoff only
      }
    }
    // 実データが薄い場合、CEO→全員を薄い骨組みエッジで追加
    AGENTS.forEach((a) => {
      if (a.id === 'ceo') return
      const key = `ceo→${a.id}`
      if (!edgeMap[key]) {
        edgeMap[key] = { source: 'ceo', target: a.id, weight: 0, lastAt: 0 }
      }
    })

    setNodes(initialNodes)
    setEdges(Object.values(edgeMap))
  }, [runs, width, height])

  // Force simulation（軽量版）
  useEffect(() => {
    if (nodes.length === 0) return
    let raf = 0
    let iterations = 0
    const maxIter = 120

    const tick = () => {
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }))
        const cx = width / 2
        const cy = height / 2

        // 反発力
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x
            const dy = next[j].y - next[i].y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = Math.min(800 / (dist * dist), 0.5)
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            if (next[i].fx == null) { next[i].vx -= fx; next[i].vy -= fy }
            if (next[j].fx == null) { next[j].vx += fx; next[j].vy += fy }
          }
        }

        // センター引力
        for (const n of next) {
          if (n.fx != null) continue
          n.vx += (cx - n.x) * 0.002
          n.vy += (cy - n.y) * 0.002
        }

        // 減衰＋位置更新
        for (const n of next) {
          if (n.fx != null) {
            n.x = n.fx
            n.y = n.fy!
            continue
          }
          n.vx *= 0.82
          n.vy *= 0.82
          n.x += n.vx
          n.y += n.vy
          // 境界
          n.x = Math.max(30, Math.min(width - 30, n.x))
          n.y = Math.max(30, Math.min(height - 30, n.y))
        }
        return next
      })
      iterations++
      if (iterations < maxIter) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [nodes.length, width, height])

  // ランダムエッジをパルス（アニメ演出）
  useEffect(() => {
    if (edges.length === 0) return
    const pulsables = edges.filter((e) => e.weight > 0)
    if (pulsables.length === 0) return
    const id = setInterval(() => {
      const e = pulsables[Math.floor(Math.random() * pulsables.length)]
      setPulsingEdge(`${e.source}→${e.target}`)
      setTimeout(() => setPulsingEdge(null), 1200)
    }, 2500)
    return () => clearInterval(id)
  }, [edges])

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const maxWeight = Math.max(...edges.map((e) => e.weight), 1)

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hardglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map((e) => {
        const s = nodeMap[e.source]
        const t = nodeMap[e.target]
        if (!s || !t) return null
        const key = `${e.source}→${e.target}`
        const isPulsing = pulsingEdge === key
        const opacity = e.weight === 0 ? 0.1 : 0.15 + (e.weight / maxWeight) * 0.5
        const strokeW = e.weight === 0 ? 1 : 1 + (e.weight / maxWeight) * 2

        return (
          <g key={key}>
            <line
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={isPulsing ? '#a855f7' : '#3f3f46'}
              strokeWidth={isPulsing ? strokeW + 1 : strokeW}
              opacity={isPulsing ? 1 : opacity}
              filter={isPulsing ? 'url(#hardglow)' : undefined}
              strokeDasharray={e.weight === 0 ? '4 3' : undefined}
              style={{ transition: 'all 0.3s ease-out' }}
            />
            {e.weight > 0 && (
              <text
                x={(s.x + t.x) / 2}
                y={(s.y + t.y) / 2 - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#71717a"
                fontFamily="monospace"
              >
                {e.weight}
              </text>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const nodeSize = Math.max(18, Math.min(32, 18 + n.runCount * 0.8))
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
            {/* Outer glow */}
            <circle
              r={nodeSize + 4}
              fill={n.color}
              opacity={0.1}
              filter="url(#glow)"
            />
            {/* Main circle */}
            <circle
              r={nodeSize}
              fill={n.color + '20'}
              stroke={n.color}
              strokeWidth="1.5"
            />
            {/* Label */}
            <text
              textAnchor="middle"
              y="2"
              fontSize="10"
              fontWeight="700"
              fill={n.color}
            >
              {n.label}
            </text>
            {/* Run count */}
            {n.runCount > 0 && (
              <text
                textAnchor="middle"
                y={nodeSize + 12}
                fontSize="9"
                fill="#a1a1aa"
                fontFamily="monospace"
              >
                {n.runCount} · ${n.cost.toFixed(2)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
