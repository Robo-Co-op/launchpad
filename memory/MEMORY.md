# Launchpad 長期記憶

> このファイルは nightly_consolidation によって自動更新されます。
> 手動編集も可能です。

## プロジェクト概要
- Launchpad: AI CXOマルチエージェント起業プラットフォーム
- 運営者: Jin (Jintae Kim) / Robo Co-op
- インフラ: Next.js + Vercel + Supabase (ap-northeast-1)
- リポジトリ: Robo-Co-op/launchpad

## 現在の3事業
1. **AI Tool Lab** (affiliate_seo) — Amazon Associates (tag=robocoop-ai-22)
2. **Prompt Pack** (digital_product) — Gumroad (robocoop.gumroad.com) 3商品
3. **Puzzle Games** (game_ads) — AdSense (ca-pub-1023108228973632, 審査待ち)

## エージェント体制
- CEO: Opus (毎日9:00 JST heartbeat)
- CTO/CMO/COO/CFO: Sonnet (毎日21:00 JST heartbeat)
- Research: Haiku (オンデマンド)
- Coordinator: Sonnet (メインセッション)

## 重要な決定ログ
- 2026-04-12: 3事業の収益化コード設置完了（Amazon/Gumroad/AdSense）
- 2026-04-12: Vercel Cronによるheartbeat実装
- 2026-04-12: 長期記憶システム導入

## 学習した教訓
- Supabase anon key + RLS = auth.uid() null → service role key使用
- Next.js server component で fetch('/api/...') は不要 → 直接Supabase呼び出し
- export const dynamic = 'force-dynamic' で静的プリレンダリング防止
- Manus → GitHub push不可 → patch file workflow で対応
