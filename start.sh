#!/bin/bash
# Launchpad — AI CXO で起業を始める
# Usage: bash <(curl -sL https://raw.githubusercontent.com/Robo-Co-op/launchpad/main/start.sh)

set -e

echo ""
echo "  🚀 Launchpad — AI CXO Startup Platform"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Claude Code チェック
if ! command -v claude &> /dev/null; then
  echo "  Claude Code is required. Install:"
  echo "  npm install -g @anthropic-ai/claude-code"
  echo ""
  read -p "  Install now? (y/n): " install_cc
  if [[ "$install_cc" == "y" || "$install_cc" == "Y" ]]; then
    npm install -g @anthropic-ai/claude-code
  else
    echo "  Please install Claude Code and try again."
    exit 1
  fi
fi

# 名前を聞く
echo ""
read -p "  How should I call you? " user_name
user_name=${user_name:-friend}

# ディレクトリ名はlaunchpadで固定
dir_name="launchpad"

# クローン
if [ -d "$dir_name" ]; then
  echo "  launchpad/ already exists. Entering that directory."
else
  echo "  Setting up Launchpad..."
  git clone --depth 1 https://github.com/Robo-Co-op/launchpad.git "$dir_name" 2>/dev/null
  rm -rf "$dir_name/.git"
  cd "$dir_name"
  git init -q
  git add -A
  git commit -q -m "Launchpad initial setup"
fi

cd "$dir_name" 2>/dev/null || true

# ユーザー名を保存（CLAUDE.mdから参照）
echo "$user_name" > .user_name

echo ""
echo "  ✅ Welcome, $user_name!"
echo ""
echo "  Starting Claude Code..."
echo "  Just talk in your language. The AI CXO team will build your businesses."
echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Claude Code 起動
claude
