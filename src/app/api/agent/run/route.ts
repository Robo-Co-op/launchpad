import { NextRequest, NextResponse } from 'next/server'
import { runAgent, AgentConfig } from '@/lib/agent/harness'
import { createServiceClient } from '@/lib/supabase/client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { maskPII } from '@/lib/security/piiMasker'
import { z } from 'zod'

// レート制限用メモリキャッシュ (本番では Redis 推奨)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

const requestSchema = z.object({
  startupId: z.string().uuid(),
  taskType: z.enum(['pivot_analysis', 'market_research', 'mvp_spec', 'pivot_decision']),
  prompt: z.string().min(1).max(5000),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // レート制限チェック (10リクエスト/分)
  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'リクエスト制限を超えました。1分後に再試行してください' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力値が無効です', details: parsed.error.issues }, { status: 400 })
  }

  const { startupId, taskType, prompt } = parsed.data

  const supabaseService = createServiceClient()

  // スタートアップの所有権確認
  const { data: startup } = await supabaseService
    .from('startups')
    .select('id')
    .eq('id', startupId)
    .eq('user_id', user.id)
    .single()

  if (!startup) {
    return NextResponse.json({ error: 'スタートアップが見つかりません' }, { status: 404 })
  }

  // PII マスク処理
  const sanitizedPrompt = maskPII(prompt)
  const config: AgentConfig = { userId: user.id, startupId, taskType }

  try {
    const result = await runAgent(config, sanitizedPrompt, supabaseService)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '予期せぬエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
