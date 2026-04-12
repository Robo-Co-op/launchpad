#!/usr/bin/env node
/**
 * セッション開始hook: 前回の記憶とコンテキストを読み込む
 * - MEMORY.md（長期記憶）
 * - 今日・昨日の日次ノート
 * - 直近のagent_runs サマリー
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const MEMORY_DIR = path.join(ROOT, 'memory')
const MEMORY_MD = path.join(MEMORY_DIR, 'MEMORY.md')

function getDateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function readIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

function main() {
  const parts = []

  // 長期記憶
  const memory = readIfExists(MEMORY_MD)
  if (memory) {
    parts.push('## 長期記憶 (MEMORY.md)\n' + memory)
  }

  // 今日の日次ノート
  const today = readIfExists(path.join(MEMORY_DIR, `${getDateStr(0)}.md`))
  if (today) {
    parts.push(`## 今日のノート (${getDateStr(0)})\n` + today)
  }

  // 昨日の日次ノート
  const yesterday = readIfExists(path.join(MEMORY_DIR, `${getDateStr(-1)}.md`))
  if (yesterday) {
    parts.push(`## 昨日のノート (${getDateStr(-1)})\n` + yesterday)
  }

  if (parts.length > 0) {
    // セッションコンテキストとして出力
    console.log('--- Launchpad Memory Loaded ---')
    console.log(parts.join('\n\n'))
    console.log('--- End Memory ---')
  }
}

main()
