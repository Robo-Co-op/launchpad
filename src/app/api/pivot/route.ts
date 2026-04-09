import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/client'
import { z } from 'zod'

const requestSchema = z.object({
  startupId: z.string().uuid(),
  agentSuggestion: z.string().max(10000),
  taskType: z.string(),
  pivotFrom: z.string().max(500).optional(),
  pivotTo: z.string().max(500).optional(),
  reason: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '入力値が無効です' }, { status: 400 })

  const { startupId, agentSuggestion, pivotFrom, pivotTo, reason } = parsed.data
  const supabaseService = createServiceClient()

  const { data: startup } = await supabaseService
    .from('startups')
    .select('pivot_count')
    .eq('id', startupId)
    .eq('user_id', user.id)
    .single()

  if (!startup) return NextResponse.json({ error: 'スタートアップが見つかりません' }, { status: 404 })

  await supabaseService.from('pivot_log').insert({
    startup_id: startupId,
    pivot_from: pivotFrom ?? '現在のモデル',
    pivot_to: pivotTo ?? 'AIが提案するモデル',
    reason,
    agent_suggestion: agentSuggestion,
  })

  await supabaseService
    .from('startups')
    .update({ pivot_count: startup.pivot_count + 1, status: 'pivoted' })
    .eq('id', startupId)

  return NextResponse.json({ success: true })
}
