import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BudgetGauge from '@/components/BudgetGauge'
import PivotCounter from '@/components/PivotCounter'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: startups },
    { data: budget },
    { data: subscription },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('startups').select('id, name, status, pivot_count, business_type, experiment_count, created_at').eq('user_id', user.id).order('created_at'),
    supabase.from('token_budgets').select('*').eq('user_id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
  ])

  if (!subscription) redirect('/pricing')

  // オンボーディング未完了ならリダイレクト
  if (!profile?.onboarding_complete) redirect('/dashboard/onboarding')

  const startupList = startups ?? []
  const earliestStartup = startupList[0]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Launchpad</h1>
          <p className="text-sm text-gray-400">{profile?.full_name ?? user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-purple-900/50 border border-purple-800 text-purple-300 px-3 py-1 rounded-full capitalize">
            {subscription?.plan}
          </span>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-gray-500 hover:text-gray-300">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center">
            <h2 className="text-sm font-medium text-gray-400 mb-4">AIトークン予算</h2>
            {budget ? (
              <BudgetGauge
                spentUsd={Number(budget.spent_usd)}
                totalUsd={Number(budget.total_usd)}
              />
            ) : (
              <p className="text-gray-500 text-sm">予算未設定</p>
            )}
            <Link href="/dashboard/budget" className="mt-4 text-xs text-purple-400 hover:text-purple-300">
              詳細を見る →
            </Link>
          </div>

          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-4">実験進捗</h2>
            <PivotCounter
              startups={startupList.map((s) => ({
                id: s.id,
                name: s.name,
                pivotCount: s.experiment_count ?? s.pivot_count,
              }))}
              startDate={earliestStartup?.created_at ?? new Date().toISOString()}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">スタートアップ</h2>
            {startupList.length < 3 && (
              <Link
                href="/dashboard/startups/new"
                className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + 新規作成
              </Link>
            )}
          </div>

          {startupList.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
              <p className="text-gray-500 mb-4">まだスタートアップがありません</p>
              <Link
                href="/dashboard/startups/new"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                最初のスタートアップを作成
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {startupList.map((startup) => (
                <Link key={startup.id} href={`/dashboard/startups/${startup.id}`}>
                  <div className="bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-xl p-5 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-white">{startup.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        startup.status === 'active' ? 'bg-green-900/50 text-green-400' :
                        startup.status === 'pivoted' ? 'bg-orange-900/50 text-orange-400' :
                        startup.status === 'graduated' ? 'bg-blue-900/50 text-blue-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {startup.status}
                      </span>
                    </div>
                    {startup.business_type && (
                      <p className="text-xs text-purple-400 mb-1">{startup.business_type.replace('_', ' ')}</p>
                    )}
                    <div className="text-sm text-gray-400">
                      実験: {startup.experiment_count ?? startup.pivot_count}/10
                    </div>
                  </div>
                </Link>
              ))}

              {Array.from({ length: 3 - startupList.length }).map((_, i) => (
                <Link key={`empty-${i}`} href="/dashboard/startups/new">
                  <div className="bg-gray-900 border border-dashed border-gray-700 hover:border-purple-700 rounded-xl p-5 transition-colors cursor-pointer flex items-center justify-center h-[100px]">
                    <span className="text-gray-600 text-sm">+ スロット {startupList.length + i + 1}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
