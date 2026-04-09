import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BudgetGauge from '@/components/BudgetGauge'

export default async function BudgetPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: budget }, { data: runs }] = await Promise.all([
    supabase.from('token_budgets').select('*').eq('user_id', user.id).single(),
    supabase
      .from('agent_runs')
      .select('*, startups(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!budget) redirect('/pricing')

  const byTask = (runs ?? []).reduce((acc, run) => {
    const key = run.task_type as string
    if (!acc[key]) acc[key] = { count: 0, cost: 0 }
    acc[key].count++
    acc[key].cost += Number(run.cost_usd)
    return acc
  }, {} as Record<string, { count: number; cost: number }>)

  const byModel = (runs ?? []).reduce((acc, run) => {
    const key = run.model as string
    if (!acc[key]) acc[key] = { count: 0, cost: 0, tokens: 0 }
    acc[key].count++
    acc[key].cost += Number(run.cost_usd)
    acc[key].tokens += run.tokens_input + run.tokens_output
    return acc
  }, {} as Record<string, { count: number; cost: number; tokens: number }>)

  const totalRuns = (runs ?? []).length
  const resetAt = budget.reset_at ? new Date(budget.reset_at) : null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-300">← 戻る</Link>
        <h1 className="text-xl font-bold">トークン予算</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center">
          <BudgetGauge spentUsd={Number(budget.spent_usd)} totalUsd={Number(budget.total_usd)} />
          {resetAt && (
            <p className="mt-4 text-xs text-gray-500">
              リセット日: {resetAt.toLocaleDateString('ja-JP')}
            </p>
          )}
          <p className="text-sm text-gray-400 mt-2">合計実行回数: {totalRuns} 回</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-4">タスクタイプ別使用量</h2>
          <div className="space-y-3">
            {(Object.entries(byTask) as [string, { count: number; cost: number }][]).map(([task, stats]) => (
              <div key={task} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 capitalize">{task.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-4 text-gray-400">
                  <span>{stats.count} 回</span>
                  <span className="text-purple-400">${stats.cost.toFixed(6)}</span>
                </div>
              </div>
            ))}
            {Object.keys(byTask).length === 0 && (
              <p className="text-gray-600 text-sm">まだ実行履歴がありません</p>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-4">モデル別使用量</h2>
          <div className="space-y-3">
            {(Object.entries(byModel) as [string, { count: number; cost: number; tokens: number }][]).map(([model, stats]) => (
              <div key={model} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-mono text-xs">{model}</span>
                <div className="flex items-center gap-4 text-gray-400">
                  <span>{(stats.tokens / 1000).toFixed(1)}K tokens</span>
                  <span className="text-purple-400">${stats.cost.toFixed(6)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-4">最近の実行履歴</h2>
          <div className="space-y-2">
            {(runs ?? []).slice(0, 20).map((run) => (
              <div key={run.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{new Date(run.created_at).toLocaleDateString('ja-JP')}</span>
                  <span className="text-gray-300">{run.task_type?.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500">{(run as any).startups?.name}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <span>{run.tokens_input + run.tokens_output} tokens</span>
                  <span className="text-purple-400">${Number(run.cost_usd).toFixed(6)}</span>
                </div>
              </div>
            ))}
            {(runs ?? []).length === 0 && (
              <p className="text-gray-600 text-sm">まだ実行履歴がありません</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
