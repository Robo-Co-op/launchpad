// GitHub contribution graph 風の 30日 × 24時間 heatmap
// agent_runs の発火頻度を色強度で可視化

interface Run {
  created_at: string
  cost_usd?: number | null
}

interface Props {
  runs: Run[]
  days?: number
}

export default function HeartbeatHeatmap({ runs, days = 30 }: Props) {
  const now = new Date()
  // days日 × 24時間 のバケット
  const buckets: Record<string, { count: number; cost: number }> = {}

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - d)
    for (let h = 0; h < 24; h++) {
      const key = `${date.toISOString().slice(0, 10)}-${h}`
      buckets[key] = { count: 0, cost: 0 }
    }
  }

  runs.forEach((r) => {
    const d = new Date(r.created_at)
    const dayStr = d.toISOString().slice(0, 10)
    const key = `${dayStr}-${d.getUTCHours()}`
    if (buckets[key]) {
      buckets[key].count++
      buckets[key].cost += Number(r.cost_usd || 0)
    }
  })

  const maxCount = Math.max(...Object.values(buckets).map((b) => b.count), 1)

  // グリッド配列を作る (日×時)
  const dayLabels: { date: string; label: string }[] = []
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now)
    date.setUTCDate(date.getUTCDate() - d)
    dayLabels.push({
      date: date.toISOString().slice(0, 10),
      label: date.toISOString().slice(5, 10),
    })
  }

  const totalRuns = Object.values(buckets).reduce((s, b) => s + b.count, 0)
  const totalCost = Object.values(buckets).reduce((s, b) => s + b.cost, 0)
  const activeCells = Object.values(buckets).filter((b) => b.count > 0).length

  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">Heartbeat Activity</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">直近{days}日 × 時間別発火密度</p>
        </div>
        <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-3">
          <span>{totalRuns} runs</span>
          <span>·</span>
          <span>${totalCost.toFixed(2)}</span>
          <span>·</span>
          <span>{activeCells} active cells</span>
        </div>
      </div>

      {/* 24h軸 */}
      <div className="flex items-start gap-1">
        <div className="w-10 shrink-0 flex flex-col gap-[2px] pt-[14px]">
          {dayLabels.map((d, i) =>
            i % 5 === 0 ? (
              <span key={d.date} className="text-[9px] text-zinc-700 font-mono leading-[9px]">
                {d.label}
              </span>
            ) : (
              <span key={d.date} className="text-[9px] leading-[9px]">&nbsp;</span>
            )
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* 時間ヘッダー */}
          <div className="flex gap-[2px] mb-1 h-3">
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="flex-1 text-[8px] text-zinc-700 font-mono text-center leading-[12px]">
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>

          {/* セルグリッド */}
          <div className="flex flex-col gap-[2px]">
            {dayLabels.map((d) => (
              <div key={d.date} className="flex gap-[2px]">
                {Array.from({ length: 24 }).map((_, h) => {
                  const bucket = buckets[`${d.date}-${h}`] || { count: 0, cost: 0 }
                  const intensity = bucket.count / maxCount
                  return (
                    <div
                      key={h}
                      title={`${d.date} ${h}:00 UTC · ${bucket.count} runs · $${bucket.cost.toFixed(4)}`}
                      className="flex-1 aspect-square rounded-[2px] transition-all hover:ring-1 hover:ring-purple-400 cursor-help"
                      style={{
                        backgroundColor:
                          bucket.count === 0
                            ? '#1c1c22'
                            : `rgba(168, 85, 247, ${0.25 + intensity * 0.75})`,
                        boxShadow: bucket.count > 0 ? `0 0 ${intensity * 4}px rgba(168, 85, 247, ${intensity * 0.5})` : undefined,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-4 flex items-center justify-end gap-2 text-[9px] text-zinc-700 font-mono">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div
            key={v}
            className="w-3 h-3 rounded-[2px]"
            style={{
              backgroundColor: v === 0 ? '#1c1c22' : `rgba(168, 85, 247, ${0.25 + v * 0.75})`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
