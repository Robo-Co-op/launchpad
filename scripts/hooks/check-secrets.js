#!/usr/bin/env node
/**
 * PreToolUse hook: git commit前にシークレットを検出
 * .env内容、APIキー、トークンがステージングに含まれていないか確認
 */
const { execSync } = require('child_process')

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,           // Anthropic / OpenAI API key
  /eyJ[a-zA-Z0-9_-]{50,}/,         // JWT token
  /ghp_[a-zA-Z0-9]{36}/,           // GitHub PAT
  /ghu_[a-zA-Z0-9]{36}/,           // GitHub user token
  /xoxb-[0-9]{10,}-[a-zA-Z0-9]+/,  // Slack bot token
  /AKIA[0-9A-Z]{16}/,              // AWS access key
  /supabase.*service_role.*/i,      // Supabase service role key mention
  /ca-pub-\d{16}/,                  // AdSense publisher ID (not secret but check)
]

const SENSITIVE_FILES = [
  /\.env$/,
  /\.env\.local$/,
  /\.env\.production$/,
  /credentials\.json$/,
  /\.pem$/,
  /\.key$/,
]

function main() {
  // stdin からツール入力を受け取る
  let input = ''
  try {
    input = require('fs').readFileSync(0, 'utf-8')
  } catch {
    process.exit(0)
  }

  let toolInput
  try {
    toolInput = JSON.parse(input)
  } catch {
    process.exit(0)
  }

  // Bash の git commit コマンドのみチェック
  if (!toolInput.tool_input?.command?.includes('git commit')) {
    process.exit(0)
  }

  // ステージングされたファイルを確認
  try {
    const staged = execSync('git diff --cached --name-only', { cwd: process.env.PWD || '.' })
      .toString().trim().split('\n').filter(Boolean)

    // 機密ファイルチェック
    for (const file of staged) {
      for (const pattern of SENSITIVE_FILES) {
        if (pattern.test(file)) {
          console.error(`⚠️ 機密ファイルがステージされています: ${file}`)
          console.error('git reset HEAD ' + file + ' でアンステージしてください')
          process.exit(2)
        }
      }
    }

    // ステージされたdiffの中身をチェック
    const diff = execSync('git diff --cached', { cwd: process.env.PWD || '.' }).toString()
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(diff)) {
        console.error(`⚠️ シークレットらしき値がdiffに含まれています: ${pattern}`)
        console.error('コミット前に確認してください')
        process.exit(2)
      }
    }
  } catch {
    // git コマンド失敗は無視
  }

  process.exit(0)
}

main()
