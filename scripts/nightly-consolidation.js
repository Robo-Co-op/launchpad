#!/usr/bin/env node
/**
 * 夜間統合スクリプト: 日次ノートから重要情報を抽出し MEMORY.md に追記
 * cron: 毎日 17:00 UTC (翌2:00 JST)
 *
 * 処理:
 * 1. 今日の日次ノート (memory/YYYY-MM-DD.md) を読む
 * 2. Haiku で重要情報を抽出
 * 3. MEMORY.md の該当セクションに追記
 * 4. 7日以上古い日次ノートを memory/archive/ に移動
 */
const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')

const ROOT = path.resolve(__dirname, '..')
const MEMORY_DIR = path.join(ROOT, 'memory')
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive')
const MEMORY_MD = path.join(MEMORY_DIR, 'MEMORY.md')

function getDateStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

async function extractImportantInfo(dailyContent) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `以下はLaunchpad（AI起業プラットフォーム）の今日のセッションログです。
長期記憶に残すべき重要な情報だけを抽出してください。

カテゴリ:
- 重要な決定（事業方針、技術選定、ピボット）
- 学習した教訓（トラブルシュートで判明したこと）
- 新しい事実（アカウント作成、設定変更、デプロイ）
- 次回やるべきこと

不要: 日常的なコマンド実行、コード変更の詳細

各項目は「- YYYY-MM-DD: 内容」の形式で、最大5項目。
重要なものがなければ「なし」と答えてください。

---
${dailyContent}
---`
    }],
    system: 'あなたは情報抽出アシスタントです。簡潔に、重要な情報だけを抽出します。',
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

function archiveOldNotes() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true })
  }

  const files = fs.readdirSync(MEMORY_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)

  for (const file of files) {
    const dateStr = file.replace('.md', '')
    if (new Date(dateStr) < cutoff) {
      fs.renameSync(
        path.join(MEMORY_DIR, file),
        path.join(ARCHIVE_DIR, file)
      )
      console.log(`アーカイブ: ${file}`)
    }
  }
}

async function main() {
  const today = getDateStr(0)
  const dailyFile = path.join(MEMORY_DIR, `${today}.md`)

  if (!fs.existsSync(dailyFile)) {
    console.log(`${today} の日次ノートなし。スキップ。`)
    archiveOldNotes()
    return
  }

  const dailyContent = fs.readFileSync(dailyFile, 'utf-8')
  if (dailyContent.trim().length < 50) {
    console.log('日次ノートが短すぎるためスキップ。')
    archiveOldNotes()
    return
  }

  console.log('重要情報を抽出中...')
  const extracted = await extractImportantInfo(dailyContent)

  if (extracted && extracted !== 'なし') {
    // MEMORY.md に追記
    let memoryContent = fs.readFileSync(MEMORY_MD, 'utf-8')

    // 「重要な決定ログ」セクションの末尾に追記
    const marker = '## 学習した教訓'
    if (memoryContent.includes(marker)) {
      memoryContent = memoryContent.replace(
        marker,
        `${extracted}\n\n${marker}`
      )
    } else {
      memoryContent += `\n\n## ${today} の抽出\n${extracted}\n`
    }

    fs.writeFileSync(MEMORY_MD, memoryContent)
    console.log(`MEMORY.md を更新しました`)
  }

  // 古いノートをアーカイブ
  archiveOldNotes()
  console.log('夜間統合完了')
}

main().catch(err => {
  console.error('夜間統合エラー:', err.message)
  process.exit(1)
})
