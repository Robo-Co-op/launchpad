'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  {
    id: 'bootcamp',
    name: 'Bootcamp',
    price: '¥10,000',
    period: '/月',
    budget: '$50',
    tokens: '約25,000,000',
    features: ['AIエージェント3体', 'スタートアップ3社まで', '30ピボット', 'コミュニティアクセス'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_BOOTCAMP_PRICE_ID ?? 'price_bootcamp',
    highlight: false,
  },
  {
    id: 'accelerator',
    name: 'Accelerator',
    price: '¥50,000',
    period: '/月',
    budget: '$500',
    tokens: '約250,000,000',
    features: ['AIエージェント100体', 'スタートアップ3社', '30ピボット/30日', '専任メンター', '優先サポート'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_ACCELERATOR_PRICE_ID ?? 'price_accelerator',
    highlight: true,
  },
  {
    id: 'loan',
    name: 'Startup Loan',
    price: '¥100,000',
    period: '一括',
    budget: '$500',
    tokens: '約250,000,000',
    features: ['Acceleratorの全機能', 'メンターシップ込み', '卒業後フォローアップ', '投資家紹介'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_LOAN_PRICE_ID ?? 'price_loan',
    highlight: false,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(plan: typeof PLANS[0]) {
    setLoading(plan.id)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, plan: plan.id }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.error === '認証が必要です') {
          router.push('/login')
          return
        }
        alert(data.error)
        return
      }
      window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">プランを選ぶ</h1>
          <p className="text-gray-400 text-lg">
            1人 × 3スタートアップ × 100エージェント × 30ピボット × 30日
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gray-900 border rounded-2xl p-7 flex flex-col transition-transform hover:-translate-y-1 ${
                plan.highlight
                  ? 'border-purple-500 shadow-lg shadow-purple-900/30'
                  : 'border-gray-800'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  おすすめ
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <div className="mt-2 text-sm text-purple-400">
                  AIトークン予算: {plan.budget} ({plan.tokens} tokens)
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? '処理中...' : '今すぐ始める'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
