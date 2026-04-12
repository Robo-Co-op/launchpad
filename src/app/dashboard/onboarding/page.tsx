'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'input' | 'loading' | 'review' | 'creating'

interface Experiment {
  hypothesis: string
  metric: string
  targetValue: string
}

interface Proposal {
  name: string
  type: 'affiliate_seo' | 'digital_product' | 'game_ads'
  description: string
  whyThisFits: string
  experiments: Experiment[]
}

const TYPE_LABELS: Record<string, string> = {
  affiliate_seo: 'Affiliate / SEO',
  digital_product: 'Digital Product',
  game_ads: 'Game + Ads',
}

const TYPE_COLORS: Record<string, string> = {
  affiliate_seo: 'bg-emerald-900/50 text-emerald-400 border-emerald-800',
  digital_product: 'bg-blue-900/50 text-blue-400 border-blue-800',
  game_ads: 'bg-orange-900/50 text-orange-400 border-orange-800',
}

const COMMON_LANGUAGES = [
  'English', 'Arabic', 'French', 'Spanish', 'Farsi/Dari', 'Turkish',
  'Swahili', 'Ukrainian', 'Russian', 'Pashto', 'Tigrinya', 'Somali',
  'Japanese', 'Chinese', 'Hindi', 'Bengali', 'Portuguese', 'German',
  'Korean', 'Vietnamese', 'Thai', 'Burmese', 'Amharic',
]

const REGIONS = [
  'East Asia', 'Southeast Asia', 'South Asia', 'Central Asia',
  'Middle East', 'North Africa', 'East Africa', 'West Africa', 'Southern Africa',
  'Western Europe', 'Eastern Europe', 'Northern Europe',
  'North America', 'Central America', 'South America',
  'Oceania',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [languages, setLanguages] = useState<string[]>([])
  const [customLang, setCustomLang] = useState('')
  const [region, setRegion] = useState('')
  const [budget, setBudget] = useState(500)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [ceoReasoning, setCeoReasoning] = useState('')
  const [costUsd, setCostUsd] = useState(0)
  const [error, setError] = useState('')

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const addCustomLang = () => {
    const trimmed = customLang.trim()
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages(prev => [...prev, trimmed])
      setCustomLang('')
    }
  }

  const handleSubmit = async () => {
    if (languages.length === 0) { setError('言語を1つ以上選択してください'); return }
    if (!region) { setError('地域を選択してください'); return }

    setError('')
    setStep('loading')

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ languages, region, monthlyBudgetUsd: budget }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'CEOの実行に失敗しました')
      }

      const data = await res.json()
      setProposals(data.proposals)
      setCeoReasoning(data.ceoReasoning)
      setCostUsd(data.costUsd)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
      setStep('input')
    }
  }

  const handleApprove = async () => {
    setStep('creating')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposals }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '作成に失敗しました')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
      setStep('review')
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-white mb-2">CEO (Opus) が事業を選定中...</h2>
            <p className="text-gray-400 text-sm">
              あなたの言語と地域を分析し、最適な3つのビジネスを選んでいます
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-white mb-2">3つのスタートアップを作成中...</h2>
            <p className="text-gray-400 text-sm">実験仮説を設定しています</p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">CEO提案</h1>
            <p className="text-gray-400 text-sm">コスト: ${costUsd.toFixed(4)}</p>
          </div>

          <div className="bg-purple-900/20 border border-purple-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-purple-400 mb-2">CEO判断理由</h3>
            <p className="text-gray-300 text-sm">{ceoReasoning}</p>
          </div>

          <div className="space-y-6">
            {proposals.map((p, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{p.description}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full border ${TYPE_COLORS[p.type]}`}>
                    {TYPE_LABELS[p.type]}
                  </span>
                </div>

                <p className="text-sm text-purple-300">{p.whyThisFits}</p>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">実験仮説 ({p.experiments.length})</h4>
                  <div className="space-y-2">
                    {p.experiments.slice(0, 3).map((e, j) => (
                      <div key={j} className="bg-gray-800/50 rounded-lg p-3 text-sm">
                        <p className="text-white">{e.hypothesis}</p>
                        <p className="text-gray-500 mt-1">{e.metric} → {e.targetValue}</p>
                      </div>
                    ))}
                    {p.experiments.length > 3 && (
                      <p className="text-xs text-gray-500">+{p.experiments.length - 3} more experiments</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('input')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              やり直す
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              この3事業で開始する
            </button>
          </div>
        </div>
      </div>
    )
  }

  // step === 'input'
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Launchpad</h1>
          <p className="text-gray-400">
            あなたの言語と地域を教えてください。<br/>
            CEO (AI) が最適な3つのビジネスを提案します。
          </p>
        </div>

        {/* 言語選択 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">話せる言語（複数選択可）</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  languages.includes(lang)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customLang}
              onChange={e => setCustomLang(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomLang()}
              placeholder="その他の言語を追加..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-600"
            />
            <button onClick={addCustomLang} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
              追加
            </button>
          </div>
          {languages.length > 0 && (
            <p className="text-xs text-purple-400">選択中: {languages.join(', ')}</p>
          )}
        </div>

        {/* 地域選択 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">ターゲット地域</label>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  region === r
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 月額予算 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">月額AI予算 (USD)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={200}
              max={1000}
              step={50}
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              className="flex-1 accent-purple-600"
            />
            <span className="text-lg font-mono text-white w-20 text-right">${budget}</span>
          </div>
          <p className="text-xs text-gray-500">
            $500で3事業×10実験を余裕で回せます。$200-300でも最小構成で可能。
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={languages.length === 0 || !region}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium text-lg transition-colors"
        >
          CEOに事業を提案してもらう
        </button>
      </div>
    </div>
  )
}
