import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/client'
import { maskPII } from '@/lib/security/piiMasker'
import { runCouncil } from '@/lib/agent/council'

// レート制限: CXO会議は重いので 3回/分/ユーザー
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

const requestSchema = z.object({
  startupId: z.string().uuid(),
  agenda: z.string().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'CXO会議は1分間に3回までです' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力値が無効です', details: parsed.error.issues }, { status: 400 })
  }

  const { startupId, agenda } = parsed.data
  const supabaseService = createServiceClient()

  // スタートアップの所有権確認 + コンテキスト取得
  const { data: startup } = await supabaseService
    .from('startups')
    .select('id, name, description, status, pivot_count')
    .eq('id', startupId)
    .eq('user_id', user.id)
    .single()

  if (!startup) {
    return NextResponse.json({ error: 'スタートアップが見つかりません' }, { status: 404 })
  }

  // サブスクリプション確認 (有料プランのみCXO会議利用可)
  const { data: subscription } = await supabaseService
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'CXO会議は有料プランが必要です' }, { status: 403 })
  }

  const startupContext = [
    `会社名: ${startup.name}`,
    startup.description ? `説明: ${startup.description}` : '',
    `ステータス: ${startup.status}`,
    `ピボット数: ${startup.pivot_count} / 30`,
  ].filter(Boolean).join('\n')

  const sanitizedAgenda = maskPII(agenda)

  try {
    const result = await runCouncil(
      user.id,
      startupId,
      startupContext,
      sanitizedAgenda,
      supabaseService
    )
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CXO会議でエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
