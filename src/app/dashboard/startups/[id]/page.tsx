import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AgentChat from '@/components/AgentChat'
import CXOBoard from '@/components/CXOBoard'

interface Props {
  params: Promise<{ id: string }>
}

export default async function StartupDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: startup }, { data: pivotLogs }] = await Promise.all([
    supabase
      .from('startups')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('pivot_log')
      .select('*')
      .eq('startup_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!startup) notFound()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-300">← 戻る</Link>
          <div>
            <h1 className="text-xl font-bold">{startup.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              startup.status === 'active' ? 'bg-green-900/50 text-green-400' :
              startup.status === 'pivoted' ? 'bg-orange-900/50 text-orange-400' :
              startup.status === 'graduated' ? 'bg-blue-900/50 text-blue-400' :
              'bg-gray-800 text-gray-400'
            }`}>
              {startup.status}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          ピボット数: <span className="text-white font-semibold">{startup.pivot_count}</span> / 30
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* CXO マルチエージェント会議 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-base font-semibold">CXO マルチエージェント</h2>
            <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-400 rounded-full">Zero Human Company</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            CEO・CTO・CMO・COO・CFO の5つのAIエージェントが並列で会議を行い、戦略的意思決定を行います。
          </p>
          <CXOBoard startupId={startup.id} />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">AIエージェント</h2>
          <AgentChat startupId={startup.id} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">ピボットログ</h2>

          {startup.description && (
            <div className="mb-5 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-xs text-gray-500 mb-1">説明</h3>
              <p className="text-sm text-gray-300">{startup.description}</p>
            </div>
          )}

          {pivotLogs && pivotLogs.length > 0 ? (
            <div className="space-y-3">
              {pivotLogs.map((log) => (
                <div key={log.id} className="p-4 bg-gray-800 rounded-lg border-l-2 border-orange-500">
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(log.created_at).toLocaleDateString('ja-JP')}
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-500">前:</span> <span className="text-gray-300">{log.pivot_from}</span></p>
                    <p><span className="text-gray-500">後:</span> <span className="text-orange-300">{log.pivot_to}</span></p>
                    {log.reason && (
                      <p className="text-xs text-gray-500 mt-2">{log.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">まだピボットログがありません。エージェントを使ってピボット判断を行いましょう。</p>
          )}
        </div>
        </div>
      </main>
    </div>
  )
}
