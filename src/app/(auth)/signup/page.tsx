'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const REFUGEE_STATUS_OPTIONS = [
  { value: 'refugee', label: '難民' },
  { value: 'asylum_seeker', label: '庇護申請者' },
  { value: 'stateless', label: '無国籍' },
  { value: 'other', label: 'その他' },
]

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    countryOfOrigin: '',
    currentCountry: '',
    refugeeStatus: 'refugee',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await getSupabaseClient().auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // プロフィールを作成
      const { error: profileError } = await getSupabaseClient().from('profiles').insert({
        id: data.user.id,
        full_name: formData.fullName,
        country_of_origin: formData.countryOfOrigin,
        current_country: formData.currentCountry,
        refugee_status: formData.refugeeStatus,
      })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/pricing')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Launchpad</h1>
          <p className="text-gray-400 mt-2">難民起業家アクセラレーター</p>
        </div>

        <form onSubmit={handleSignup} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-white">新規登録</h2>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {[
            { name: 'fullName', label: '氏名', type: 'text' },
            { name: 'email', label: 'メールアドレス', type: 'email' },
            { name: 'password', label: 'パスワード', type: 'password' },
            { name: 'countryOfOrigin', label: '出身国', type: 'text' },
            { name: 'currentCountry', label: '現在の居住国', type: 'text' },
          ].map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm text-gray-400 mb-1">{label}</label>
              <input
                type={type}
                name={name}
                value={formData[name as keyof typeof formData]}
                onChange={handleChange}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-400 mb-1">ステータス</label>
            <select
              name="refugeeStatus"
              value={formData.refugeeStatus}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            >
              {REFUGEE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? '登録中...' : '登録してプランを選ぶ'}
          </button>

          <p className="text-center text-sm text-gray-500">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300">
              ログイン
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
