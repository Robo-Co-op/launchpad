import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { runCEOOnboarding } from '@/lib/agent/ceo-onboarding'
import { z } from 'zod'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 300_000 })
    return true
  }
  if (entry.count >= 2) return false
  entry.count++
  return true
}

const requestSchema = z.object({
  languages: z.array(z.string().min(1)).min(1).max(10),
  region: z.string().min(1).max(100),
  monthlyBudgetUsd: z.number().min(100).max(10000),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'オンボーディングは5分に2回まで実行できます' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力値が無効です', details: parsed.error.issues }, { status: 400 })
  }

  const supabaseService = createServiceClient()

  try {
    const result = await runCEOOnboarding(parsed.data, user.id, supabaseService)

    // プロフィール更新
    await supabaseService.from('profiles').update({
      languages: parsed.data.languages,
      region: parsed.data.region,
      monthly_budget_usd: parsed.data.monthlyBudgetUsd,
    }).eq('id', user.id)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '予期せぬエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// CEO提案承認 → 3スタートアップ + experiments 一括作成
const approveSchema = z.object({
  proposals: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['affiliate_seo', 'digital_product', 'game_ads']),
    description: z.string(),
    experiments: z.array(z.object({
      hypothesis: z.string(),
      metric: z.string(),
      targetValue: z.string(),
    })),
  })).length(3),
})

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const parsed = approveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力値が無効です', details: parsed.error.issues }, { status: 400 })
  }

  const supabaseService = createServiceClient()

  // 3スタートアップ一括作成
  const startupInserts = parsed.data.proposals.map(p => ({
    user_id: user.id,
    name: p.name,
    description: p.description,
    business_type: p.type,
    status: 'active',
    pivot_count: 0,
    experiment_count: 0,
    max_experiments: 10,
  }))

  const { data: startups, error: startupError } = await supabaseService
    .from('startups')
    .insert(startupInserts)
    .select('id')

  if (startupError || !startups) {
    return NextResponse.json({ error: 'スタートアップ作成に失敗しました' }, { status: 500 })
  }

  // 各スタートアップに実験を紐付け
  const experimentInserts = parsed.data.proposals.flatMap((p, i) =>
    p.experiments.map(e => ({
      startup_id: startups[i].id,
      hypothesis: e.hypothesis,
      metric: e.metric,
      target_value: e.targetValue,
      status: 'pending' as const,
    }))
  )

  await supabaseService.from('experiments').insert(experimentInserts)

  // オンボーディング完了マーク
  await supabaseService.from('profiles').update({
    onboarding_complete: true,
  }).eq('id', user.id)

  return NextResponse.json({
    startups: startups.map((s, i) => ({
      id: s.id,
      name: parsed.data.proposals[i].name,
      type: parsed.data.proposals[i].type,
    })),
  })
}
