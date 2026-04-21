'use client'

// CRT レトロテーマ切替ボタン。localStorage に記憶
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [crt, setCrt] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('launchpad-crt')
    if (saved === '1') {
      document.body.classList.add('theme-crt')
      setCrt(true)
    }
  }, [])

  const toggle = () => {
    const next = !crt
    setCrt(next)
    if (next) {
      document.body.classList.add('theme-crt')
      localStorage.setItem('launchpad-crt', '1')
    } else {
      document.body.classList.remove('theme-crt')
      localStorage.removeItem('launchpad-crt')
    }
  }

  return (
    <button
      onClick={toggle}
      title={crt ? 'CRTモード OFF' : 'CRTモード ON'}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono transition-all ${
        crt
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
          : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
      }`}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="5" width="18" height="12" rx="1" strokeLinejoin="round" />
        <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      CRT
    </button>
  )
}
