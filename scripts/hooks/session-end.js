#!/usr/bin/env node
/**
 * セッション終了hook: セッションの重要情報を日次ノートに保存
 * - 今日のセッションで何をしたか
 * - 重要な決定事項
 * - 次回やるべきこと
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const MEMORY_DIR = path.join(ROOT, 'memory')

function getDateStr() {
  return new Date().toISOString().slice(0, 10)
}

function getTimeStr() {
  return new Date().toISOString().slice(11, 16)
}

function main() {
  // memory/ ディレクトリ確認
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true })
  }

  const dateStr = getDateStr()
  const timeStr = getTimeStr()
  const dailyFile = path.join(MEMORY_DIR, `${dateStr}.md`)

  // セッションのトランスクリプトからサマリーを抽出
  // stdin からセッションサマリーを受け取る（CC が渡す）
  let input = ''
  try {
    input = fs.readFileSync(0, 'utf-8') // stdin
  } catch {
    // stdin が空の場合
  }

  const entry = `\n### セッション ${timeStr} UTC\n${input || '(セッション内容なし)'}\n`

  // 日次ノートに追記
  fs.appendFileSync(dailyFile, entry)
  console.log(`セッション記録を ${dailyFile} に保存しました`)
}

main()
