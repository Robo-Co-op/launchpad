#!/usr/bin/env node
/**
 * pre-compact hook: コンテキスト圧縮前に重要な状態を保存
 * compaction で失われる情報を memory/ に退避する
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
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true })
  }

  const dateStr = getDateStr()
  const timeStr = getTimeStr()
  const dailyFile = path.join(MEMORY_DIR, `${dateStr}.md`)

  // stdin からコンテキストサマリーを受け取る
  let input = ''
  try {
    input = fs.readFileSync(0, 'utf-8')
  } catch {
    // stdin なし
  }

  const entry = `\n### Pre-compact ${timeStr} UTC\n${input || '(コンテキスト状態なし)'}\n`
  fs.appendFileSync(dailyFile, entry)
  console.log(`コンパクション前の状態を保存: ${dailyFile}`)
}

main()
