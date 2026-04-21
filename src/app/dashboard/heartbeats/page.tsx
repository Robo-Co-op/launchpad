export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/client'

// vercel.jsonのcron設定に合わせたスケジュール（UTC）
const SCHEDULES: {
  role: string
  label: string
  color: string
  model: string
  taskType: string
  cronUtc: string
  cronLabelJst: string
}[] = [
  {
    role: 'ceo',
    label: 'CEO',
    color: '#f59e0b',
    model: 'Opus',
    taskType: 'pivot_analysis',
    cronUtc: '0 0 * * *',
    cronLabelJst: '毎日 09:00 JST',
  },
  {
    role: 'cto',
    label: 'CTO',
    color: '#3b82f6',
    model: 'Sonnet',
    taskType: 'mvp_spec',
    cronUtc: '0 12 * * *',
    cronLabelJst: '毎日 21:00 JST',
  },
  {
    role: 'cmo',
    label: 'CMO',
    color: '#ec4899',
    model: 'Sonnet',
    taskType: 'market_research',
    cronUtc: '0 12 * * *',
    cronLabelJst: '毎日 21:00 JST',
  },
  {
    role: 'coo',
    label: 'COO',
    color: '#f97316',
    model: 'Sonnet',
    taskType: 'ops_review',
    cronUtc: '0 12 * * *',
    cronLabelJst: '毎日 21:00 JST',
  },
  {
    role: 'cfo',
    label: 'CFO',
    color: '#22c55e',
    model: 'Sonnet',
    taskType: 'budget_review',
    cronUtc: '0 12 * * *',
    cronLabelJst: '毎日 21:00 JST',
  },
]

// cronパターンから次回実行時刻を計算（毎日X時固定）
function getNextRun(cronUtc: string): Date {
  const parts = cronUtc.split(' ')
  const minute = parseInt(parts[0])
  const hour = parseInt(parts[1])
  const now = new Date()
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hour,
    minute,
    0,
  ))
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  return next
}

function formatDuration(ms: number): string {
  const secs = Math.abs(Math.floor(ms / 1000))
  const hours = Math.floor(secs / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

async function getHeartbeatData() {
  try {
    const supabase = createServiceClient()
    const [runsRes, startupsRes] = await Promise.all([
      supabase
        .from('agent_runs')
        .select('id, startup_id, task_type, cost_usd, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('startups').select('id, name'),
    ])
    return {
      runs: runsRes.data ?? [],
      startupMap: Object.fromEntries((startupsRes.data ?? []).map((s: any) => [s.id, s])),
    }
  } catch {
    return { runs: [], startupMap: {} }
  }
}

export default async function HeartbeatsPage() {
  const { runs, startupMap } = await getHeartbeatData()

  const now = new Date()

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-[#1c1c22] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">Heartbeats</h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">Agent cron schedules and last runs</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            All scheduled
          </span>
          <span className="text-zinc-700">|</span>
          <span className="font-mono">Now: {now.toISOString().replace('T', ' ').slice(0, 16)} UTC</span>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-4">
        {SCHEDULES.map((s, i) => {
          const agentRuns = runs.filter((r: any) => r.task_type === s.taskType)
          const lastRun = agentRuns[0]
          const nextRun = getNextRun(s.cronUtc)
          const nextInMs = nextRun.getTime() - now.getTime()
          const lastRunAgo = lastRun ? now.getTime() - new Date(lastRun.created_at).getTime() : null

          return (
            <div
              key={s.role}
              className="card p-5 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Agent */}
                <Link href={`/dashboard/agents/${s.role}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold"
                    style={{ backgroundColor: s.color + '20', color: s.color }}
                  >
                    {s.label}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">{s.label}</p>
                    <p className="text-[10px] text-zinc-600 font-mono">{s.model}</p>
                  </div>
                </Link>

                {/* Schedule */}
                <div className="flex items-center gap-6 ml-auto flex-wrap">
                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Schedule</p>
                    <p className="text-[12px] text-zinc-300">{s.cronLabelJst}</p>
                    <p className="text-[9px] text-zinc-700 font-mono mt-0.5">cron: {s.cronUtc}</p>
                  </div>

                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Last Run</p>
                    <p className="text-[12px] text-zinc-300">
                      {lastRunAgo != null ? formatDuration(lastRunAgo) + ' ago' : 'never'}
                    </p>
                    {lastRun && (
                      <p className="text-[9px] text-zinc-700 font-mono mt-0.5">
                        ${Number(lastRun.cost_usd || 0).toFixed(4)}
                        {lastRun.startup_id && startupMap[lastRun.startup_id]
                          ? ` · ${startupMap[lastRun.startup_id].name}`
                          : ''}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Next Run</p>
                    <p className="text-[12px] font-semibold" style={{ color: s.color }}>
                      in {formatDuration(nextInMs)}
                    </p>
                    <p className="text-[9px] text-zinc-700 font-mono mt-0.5">
                      {nextRun.toISOString().replace('T', ' ').slice(0, 16)} UTC
                    </p>
                  </div>

                  <div className="min-w-[80px]">
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Runs</p>
                    <p className="text-[16px] font-semibold tracking-tight">
                      {agentRuns.length}
                    </p>
                    <p className="text-[9px] text-zinc-700 font-mono mt-0.5">
                      ${agentRuns.reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 直近5runのミニタイムライン */}
              {agentRuns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#1c1c22]">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Recent 10 runs</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {agentRuns.slice(0, 10).map((r: any) => {
                      const ago = now.getTime() - new Date(r.created_at).getTime()
                      return (
                        <div
                          key={r.id}
                          className="flex flex-col gap-0.5 items-center"
                          title={`${new Date(r.created_at).toISOString()} · $${Number(r.cost_usd || 0).toFixed(4)}`}
                        >
                          <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: s.color, opacity: 0.8 }}
                          />
                          <span className="text-[8px] text-zinc-700 font-mono">
                            {formatDuration(ago)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
