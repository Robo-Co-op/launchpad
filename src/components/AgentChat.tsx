'use client'

import { useState } from 'react'

type TaskType = 'pivot_analysis' | 'market_research' | 'mvp_spec' | 'pivot_decision'

interface AgentChatProps {
  startupId: string
  onPivotExecuted?: () => void
}

interface AgentResult {
  content: string
  tokensUsed: { input: number; output: number }
  costUsd: number
  budgetRemaining: number
}

const TASK_LABELS: Record<TaskType, string> = {
  pivot_analysis: 'ピボット分析',
  market_research: '市場調査',
  mvp_spec: 'MVP仕様',
  pivot_decision: 'ピボット判断',
}

const TASK_DESCRIPTIONS: Record<TaskType, string> = {
  pivot_analysis: '現在のビジネスモデルを分析し、具体的なピボットオプションを提案',
  market_research: 'ターゲット市場・競合・差別化機会を迅速に調査',
  mvp_spec: '仮説検証に必要な最小限のMVP仕様を定義',
  pivot_decision: 'メトリクスに基づきピボットを実行するか判断',
}

export default function AgentChat({ startupId, onPivotExecuted }: AgentChatProps) {
  const [taskType, setTaskType] = useState<TaskType>('pivot_analysis')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<AgentResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRun() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId, taskType, prompt }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました')
        return
      }
      setResult(data)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleExecutePivot() {
    if (!result) return
    // ピボット内容をピボットログに記録
    const res = await fetch('/api/pivot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startupId,
        agentSuggestion: result.content,
        taskType,
      }),
    })
    if (res.ok) {
      onPivotExecuted?.()
    }
  }

  return (
    <div className="space-y-4">
      {/* タスク選択 */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(TASK_LABELS) as TaskType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTaskType(t)}
            className={`p-3 rounded-lg text-left transition-colors border ${
              taskType === t
                ? 'bg-purple-900/50 border-purple-500 text-purple-200'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="text-sm font-medium">{TASK_LABELS[t]}</div>
            <div className="text-xs mt-0.5 opacity-70">{TASK_DESCRIPTIONS[t]}</div>
          </button>
        ))}
      </div>

      {/* プロンプト入力 */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`${TASK_LABELS[taskType]}のプロンプトを入力...`}
        rows={4}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
      />

      {/* 実行ボタン */}
      <button
        onClick={handleRun}
        disabled={loading || !prompt.trim()}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {loading ? '実行中...' : 'エージェント実行'}
      </button>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
              {result.content}
            </pre>
          </div>

          {/* コスト情報 */}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              入力: {result.tokensUsed.input.toLocaleString()} / 出力: {result.tokensUsed.output.toLocaleString()} トークン
            </span>
            <span>コスト: ${result.costUsd.toFixed(6)} | 残り予算: ${result.budgetRemaining.toFixed(4)}</span>
          </div>

          {/* ピボット実行ボタン */}
          {taskType === 'pivot_decision' && (
            <button
              onClick={handleExecutePivot}
              className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              ピボットを実行してログに記録
            </button>
          )}
        </div>
      )}
    </div>
  )
}
