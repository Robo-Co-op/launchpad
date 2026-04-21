// 半円の予算バーンダウンゲージ（SVG実装・依存なし）
// 使用量・予測線・ネオングロウで SNS 映え重視

interface Props {
  spent: number
  budget: number
  dayOfMonth?: number
  daysInMonth?: number
}

export default function BurnDownGauge({ spent, budget, dayOfMonth, daysInMonth }: Props) {
  const pct = Math.min(100, (spent / budget) * 100)
  const isOver = pct >= 100
  const isWarn = pct >= 80

  // 着色ロジック
  const arcColor = isOver ? '#ef4444' : isWarn ? '#eab308' : '#a855f7'
  const glowColor = isOver ? '#ef4444' : isWarn ? '#eab308' : '#a855f7'

  // 半円の始点=180°, 終点=360° (左→右)
  const startAngle = 180
  const sweep = (pct / 100) * 180
  const endAngle = startAngle + sweep
  const cx = 100
  const cy = 100
  const radius = 80
  const strokeWidth = 14

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const polar = (a: number) => ({
    x: cx + radius * Math.cos(toRad(a)),
    y: cy + radius * Math.sin(toRad(a)),
  })

  const start = polar(startAngle)
  const end = polar(endAngle)
  const largeArc = sweep > 180 ? 1 : 0

  const arcPath = `M ${start.x},${start.y} A ${radius},${radius} 0 ${largeArc} 1 ${end.x},${end.y}`
  const trackPath = `M ${polar(180).x},${polar(180).y} A ${radius},${radius} 0 0 1 ${polar(360).x},${polar(360).y}`

  // 月末予測: 現在のペース（1日あたり）× 日数
  let projection: number | null = null
  if (dayOfMonth && daysInMonth && dayOfMonth > 0) {
    projection = (spent / dayOfMonth) * daysInMonth
  }
  const projectionPct = projection ? Math.min(150, (projection / budget) * 100) : null

  // 予測ライン位置
  const projectionAngle = projectionPct ? 180 + (Math.min(100, projectionPct) / 100) * 180 : null
  const projectionPoint = projectionAngle ? polar(projectionAngle) : null

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">Budget Burn-Down</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">月次予算 ${budget}</p>
        </div>
        <div className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
          isOver ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          isWarn ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
          'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        }`}>
          {pct.toFixed(1)}%
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible">
          <defs>
            <filter id="gaugeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={arcColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={arcColor} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* 背景トラック */}
          <path
            d={trackPath}
            stroke="#1c1c22"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* メインアーク */}
          {pct > 0 && (
            <path
              d={arcPath}
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              filter="url(#gaugeGlow)"
              style={{
                transition: 'all 0.6s ease-out',
              }}
            />
          )}

          {/* 予測ライン */}
          {projectionPoint && projectionPct && (
            <>
              <line
                x1={cx}
                y1={cy}
                x2={projectionPoint.x}
                y2={projectionPoint.y}
                stroke={projectionPct >= 100 ? '#ef4444' : '#71717a'}
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity={0.7}
              />
              <circle
                cx={projectionPoint.x}
                cy={projectionPoint.y}
                r="4"
                fill={projectionPct >= 100 ? '#ef4444' : '#a1a1aa'}
              />
            </>
          )}

          {/* 中央数値 */}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-white"
            fontSize="22"
            fontWeight="700"
            style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
          >
            ${spent.toFixed(2)}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            className="fill-zinc-500"
            fontSize="9"
          >
            of ${budget}
          </text>
        </svg>
      </div>

      {/* 予測テキスト */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
        <span className="flex items-center gap-1.5 text-zinc-600">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: arcColor }} />
          実績 ${spent.toFixed(2)}
        </span>
        {projection != null && (
          <span className={`flex items-center gap-1.5 ${projectionPct && projectionPct >= 100 ? 'text-red-400' : 'text-zinc-500'}`}>
            <span className="w-2 h-0.5 bg-zinc-500 border-t border-dashed" />
            月末予測 ${projection.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}
