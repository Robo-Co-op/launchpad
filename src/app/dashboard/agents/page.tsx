export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/client'
import AgentHandoffGraph from '@/components/AgentHandoffGraph'
import CostSankey from '@/components/CostSankey'

async function getAgentsData() {
  try {
    const supabase = createServiceClient()
    const [runsRes, startupsRes] = await Promise.all([
      supabase
        .from('agent_runs')
        .select('task_type, startup_id, cost_usd, created_at')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('startups').select('id, name'),
    ])
    return {
      runs: runsRes.data ?? [],
      startupNames: Object.fromEntries(
        (startupsRes.data ?? []).map((s: any) => [s.id, s.name])
      ),
    }
  } catch {
    return { runs: [], startupNames: {} }
  }
}

const AGENTS = [
  { role: 'ceo', label: 'CEO', color: '#f59e0b', title: 'Chief Executive Officer', taskType: 'pivot_analysis', model: 'Opus' },
  { role: 'cto', label: 'CTO', color: '#3b82f6', title: 'Chief Technology Officer', taskType: 'mvp_spec', model: 'Sonnet' },
  { role: 'cmo', label: 'CMO', color: '#ec4899', title: 'Chief Marketing Officer', taskType: 'market_research', model: 'Sonnet' },
  { role: 'coo', label: 'COO', color: '#f97316', title: 'Chief Operating Officer', taskType: 'ops_review', model: 'Sonnet' },
  { role: 'cfo', label: 'CFO', color: '#22c55e', title: 'Chief Financial Officer', taskType: 'budget_review', model: 'Sonnet' },
]

export default async function AgentsIndexPage() {
  const { runs, startupNames } = await getAgentsData()

  const statsByAgent = AGENTS.map((a) => {
    const filtered = runs.filter((r: any) => r.task_type === a.taskType)
    return {
      ...a,
      runCount: filtered.length,
      cost: filtered.reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0),
      lastRun: filtered[0]?.created_at,
    }
  })

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      <div className="px-6 py-4 border-b border-[#1c1c22] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">Agents</h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">全5CXOの関係性と稼働状況</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-600 font-mono">
          <span>{runs.length} runs</span>
          <span>·</span>
          <span>${runs.reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-4">
        {/* Force Graph */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">
              Agent Handoff Graph
            </p>
            <span className="text-[10px] text-zinc-700">CEO中心・handoff重みで線の太さが変化</span>
          </div>
          <AgentHandoffGraph runs={runs} width={600} height={340} />
        </div>

        {/* Cost Sankey */}
        <CostSankey runs={runs} startupNames={startupNames} height={260} />

        {/* Agent list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {statsByAgent.map((a, i) => (
            <Link
              key={a.role}
              href={`/dashboard/agents/${a.role}`}
              className="card p-4 hover:border-[#27272a] transition-all group relative overflow-hidden"
              style={{ animation: 'fadeIn 0.3s ease-out both', animationDelay: `${i * 40}ms` }}
            >
              <div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20"
                style={{ backgroundColor: a.color }}
              />
              <div className="flex items-start gap-3 mb-3 relative">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: a.color + '20', color: a.color }}
                >
                  {a.label}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold group-hover:text-white transition-colors">
                    {a.title}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{a.model}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 relative">
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Runs</p>
                  <p className="text-[14px] font-semibold mt-0.5">{a.runCount}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Cost</p>
                  <p className="text-[14px] font-semibold mt-0.5" style={{ color: a.color }}>
                    ${a.cost.toFixed(2)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
