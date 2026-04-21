export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/client'
import StartupCard from '@/components/StartupCard'
import AgentActivityFeed from '@/components/AgentActivityFeed'

async function getDashboardData() {
  try {
    const supabase = createServiceClient()
    // 実費はagent_runsテーブルを直接集計する（token_budgetsは未同期のため信用しない）
    const [startupsRes, experimentsRes, runsRes, allRunsRes, budgetRes] = await Promise.all([
      supabase.from('startups').select('id, name, status, business_type, experiment_count, pivot_count, created_at').order('created_at'),
      supabase.from('experiments').select('id, startup_id, hypothesis, metric, target_value, status, result, started_at, completed_at').order('created_at'),
      supabase.from('agent_runs').select('id, startup_id, model, task_type, cost_usd, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('agent_runs').select('cost_usd, created_at'),
      supabase.from('token_budgets').select('*').limit(1).maybeSingle(),
    ])

    // 月初からの合計で当月支出を計算
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const allRuns = allRunsRes.data ?? []
    const monthSpend = allRuns
      .filter((r: any) => r.created_at >= monthStart)
      .reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0)
    const totalSpend = allRuns
      .reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0)
    const budgetTotal = Number(budgetRes.data?.total_usd ?? 500)

    return {
      startups: startupsRes.data ?? [],
      experiments: experimentsRes.data ?? [],
      recentRuns: runsRes.data ?? [],
      monthSpend,
      totalSpend,
      budgetTotal,
      totalRuns: allRuns.length,
    }
  } catch {
    return { startups: [], experiments: [], recentRuns: [], monthSpend: 0, totalSpend: 0, budgetTotal: 500, totalRuns: 0 }
  }
}

// task_type ベースでCXO役職を特定する（modelだけだとSonnet勢が全員同じラベルになる）
const TASK_AGENTS: Record<string, { label: string; color: string; role: string; taskLabel: string }> = {
  pivot_analysis: { label: 'CEO', color: '#f59e0b', role: 'ceo', taskLabel: 'Pivot Analysis' },
  mvp_spec: { label: 'CTO', color: '#3b82f6', role: 'cto', taskLabel: 'MVP Specification' },
  market_research: { label: 'CMO', color: '#ec4899', role: 'cmo', taskLabel: 'Market Research' },
  ops_review: { label: 'COO', color: '#f97316', role: 'coo', taskLabel: 'Operations Review' },
  budget_review: { label: 'CFO', color: '#22c55e', role: 'cfo', taskLabel: 'Budget Review' },
  pivot_decision: { label: 'CEO', color: '#f59e0b', role: 'ceo', taskLabel: 'Pivot Decision' },
}

export default async function DashboardPage() {
  const { startups, experiments, recentRuns, monthSpend, totalSpend, budgetTotal, totalRuns } = await getDashboardData()

  const startupNames: Record<string, string> = Object.fromEntries(
    startups.map((s: any) => [s.id, s.name])
  )

  const runningExps = experiments.filter((e: any) => e.status === 'running').length
  const successExps = experiments.filter((e: any) => e.status === 'success').length
  const failedExps = experiments.filter((e: any) => e.status === 'failed').length
  const budgetPct = Math.min(100, Math.round((monthSpend / budgetTotal) * 100))
  const earliestDate = startups[0]?.created_at
  const daysSinceStart = earliestDate
    ? Math.floor((Date.now() - new Date(earliestDate).getTime()) / 86400000)
    : 0
  const daysLeft = Math.max(0, 30 - daysSinceStart)

  const recentAgentWork = recentRuns.slice(0, 5)

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1c1c22] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">Autonomous operations of 3 businesses</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            System Active
          </span>
          <span className="text-zinc-700">|</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            label="Experiments"
            value={runningExps.toString()}
            sub={`${experiments.length} total`}
            color="green"
            detail={successExps > 0 ? `${successExps} success` : undefined}
          />
          <KPICard
            label="Agent Runs"
            value={totalRuns.toString()}
            sub={failedExps > 0 ? `${failedExps} failed exp` : 'all good'}
            color="blue"
          />
          <KPICard
            label="Month Spend"
            value={`$${monthSpend.toFixed(2)}`}
            sub={`${budgetPct}% of $${budgetTotal} · $${totalSpend.toFixed(2)} total`}
            color="purple"
            progress={budgetPct}
          />
          <KPICard
            label="Days Left"
            value={daysLeft.toString()}
            sub={`Day ${daysSinceStart} of 30`}
            color={daysLeft <= 7 ? 'red' : 'orange'}
          />
        </div>

        {/* Agent Work */}
        <section>
          <SectionHeader title="Recent Agent Work" count={recentAgentWork.length} />
          {recentAgentWork.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recentAgentWork.map((run: any, i: number) => {
                const mapped = run.task_type ? TASK_AGENTS[run.task_type] : undefined
                const agent = mapped ?? {
                  label: 'Agent',
                  color: '#71717a',
                  role: '',
                  taskLabel: run.task_type?.replace(/_/g, ' ') ?? 'Task',
                }
                const startupName = run.startup_id ? startupNames[run.startup_id] : null
                return (
                  <Link
                    key={run.id}
                    href={agent.role ? `/dashboard/agents/${agent.role}` : '#'}
                    className="card p-3.5 animate-fade-in hover:border-[#27272a] transition-colors group"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: agent.color + '20', color: agent.color }}
                        >
                          {agent.label}
                        </div>
                        <span className="text-[12px] font-medium text-zinc-300 group-hover:text-white transition-colors">
                          {agent.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-700 font-mono">
                        {new Date(run.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{agent.taskLabel}</p>
                    {startupName && (
                      <p className="text-[10px] text-zinc-600 mt-0.5 truncate">· {startupName}</p>
                    )}
                    {run.cost_usd > 0 && (
                      <p className="text-[10px] text-zinc-700 mt-1 font-mono">${Number(run.cost_usd).toFixed(4)}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'CEO', model: 'Opus', color: '#f59e0b' },
                { label: 'CMO', model: 'Sonnet', color: '#ec4899' },
                { label: 'CTO', model: 'Sonnet', color: '#3b82f6' },
              ].map((agent) => (
                <div key={agent.label} className="card border-dashed p-3.5 flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: agent.color + '15', color: agent.color }}
                  >
                    {agent.label[0]}
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-zinc-500">{agent.label}</p>
                    <p className="text-[10px] text-zinc-700">待機中</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Startups */}
        <section>
          <SectionHeader title="Startups" detail={`${experiments.length} experiments total`} />
          {startups.length === 0 ? (
            <div className="card border-dashed p-10 text-center">
              <p className="text-zinc-600 text-[13px]">Businesses appear after onboarding in the agent console</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              {startups.map((startup: any) => (
                <StartupCard
                  key={startup.id}
                  startup={startup}
                  experiments={experiments.filter((e: any) => e.startup_id === startup.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bottom: Experiment Tracker + Activity */}
        <div className="grid md:grid-cols-5 gap-3">
          {/* Experiment Tracker */}
          <div className="md:col-span-3 card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">Experiment Tracker</p>
              <span className="text-[11px] text-zinc-600 font-mono">{successExps} / 30</span>
            </div>
            {/* 30-grid layout */}
            <div className="grid grid-cols-10 gap-1.5 mb-4">
              {Array.from({ length: 30 }).map((_, i) => {
                const exp = experiments[i]
                return (
                  <div
                    key={i}
                    title={exp ? `#${i + 1}: ${exp.hypothesis?.slice(0, 50)}` : `Experiment #${i + 1}`}
                    className={`aspect-square rounded-[3px] transition-all duration-300 ${
                      exp?.status === 'success' ? 'bg-green-500/80 shadow-sm shadow-green-500/20' :
                      exp?.status === 'running' ? 'bg-purple-500/80 shadow-sm shadow-purple-500/20 animate-pulse' :
                      exp?.status === 'failed' ? 'bg-red-500/40' :
                      'bg-zinc-800/60'
                    }`}
                  />
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 text-[10px] text-zinc-600 mb-3">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-purple-500/80" />Running</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-green-500/80" />Success</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-red-500/40" />Failed</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-zinc-800/60" />Pending</span>
            </div>
            {/* Business Progress */}
            <div className="space-y-2 border-t border-[#1c1c22] pt-3">
              {startups.map((s: any) => {
                const exps = experiments.filter((e: any) => e.startup_id === s.id)
                const done = exps.filter((e: any) => e.status === 'success').length
                const running = exps.filter((e: any) => e.status === 'running').length
                return (
                  <div key={s.id} className="flex items-center gap-3 text-[11px]">
                    <span className="text-zinc-500 w-24 truncate shrink-0">{s.name}</span>
                    <div className="flex gap-[3px] flex-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`h-[6px] flex-1 rounded-sm transition-all ${
                          exps[i]?.status === 'success' ? 'bg-green-500/70' :
                          exps[i]?.status === 'running' ? 'bg-purple-500/70' :
                          'bg-zinc-800/50'
                        }`} />
                      ))}
                    </div>
                    <span className="text-zinc-700 w-14 text-right font-mono text-[10px]">
                      {running > 0 ? <span className="text-purple-400">{running} run</span> : done > 0 ? <span className="text-green-400">{done} done</span> : '0/10'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="md:col-span-2">
            <AgentActivityFeed runs={recentRuns} startupNames={startupNames} />
          </div>
        </div>
      </div>
    </div>
  )
}

// KPI Card Component
function KPICard({ label, value, sub, color, progress, detail }: {
  label: string
  value: string
  sub: string
  color: 'green' | 'blue' | 'purple' | 'red' | 'orange'
  progress?: number
  detail?: string
}) {
  const colorMap = {
    green: { text: 'text-emerald-400', glow: 'shadow-emerald-500/5' },
    blue: { text: 'text-blue-400', glow: 'shadow-blue-500/5' },
    purple: { text: 'text-purple-400', glow: 'shadow-purple-500/5' },
    red: { text: 'text-red-400', glow: 'shadow-red-500/5' },
    orange: { text: 'text-amber-400', glow: 'shadow-amber-500/5' },
  }
  const c = colorMap[color]

  return (
    <div className={`card p-4 ${c.glow}`}>
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-xl font-bold tracking-tight ${c.text}`}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-[3px] bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500/70 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-zinc-700">{sub}</p>
        {detail && <p className="text-[10px] text-emerald-600">{detail}</p>}
      </div>
    </div>
  )
}

// Section Header
function SectionHeader({ title, count, detail }: { title: string; count?: number; detail?: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">{title}</p>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {detail && <span className="text-[10px] text-zinc-700">{detail}</span>}
    </div>
  )
}
