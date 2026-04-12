#!/bin/bash
# Launchpad — AI CXO で起業を始める
# Usage: bash <(curl -sL https://raw.githubusercontent.com/Robo-Co-op/launchpad/main/start.sh)

set -e

echo ""
echo "  🚀 Launchpad — AI CXOマルチエージェント起業"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Claude Code チェック
if ! command -v claude &> /dev/null; then
  echo "  Claude Code が必要です。インストール:"
  echo "  npm install -g @anthropic-ai/claude-code"
  echo ""
  read -p "  今インストールしますか？ (y/n): " install_cc
  if [[ "$install_cc" == "y" || "$install_cc" == "Y" ]]; then
    npm install -g @anthropic-ai/claude-code
  else
    echo "  Claude Code をインストールしてから再実行してください。"
    exit 1
  fi
fi

# 会社名
echo ""
read -p "  会社名 (英語、スペースなし): " company_name
company_name=${company_name:-my-startup}

# クローン
if [ -d "$company_name" ]; then
  echo "  $company_name は既に存在します。そのディレクトリに入ります。"
else
  echo "  Launchpad をセットアップ中..."
  git clone --depth 1 https://github.com/Robo-Co-op/launchpad.git "$company_name" 2>/dev/null
  rm -rf "$company_name/.git"
  cd "$company_name"
  git init -q
  git add -A
  git commit -q -m "Launchpad 初期セットアップ"
fi

cd "$company_name" 2>/dev/null || true

echo ""
echo "  ✅ セットアップ完了！"
echo ""
echo "  Claude Code を起動します。"
echo "  自然言語で話すだけで、AI CXOチームがビジネスを始めます。"
echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Claude Code 起動
claude
