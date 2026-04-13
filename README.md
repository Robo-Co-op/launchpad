# Launchpad

AI CXO team that runs 3 digital businesses for you. Just talk.

## Start

```bash
bash <(curl -sL https://raw.githubusercontent.com/Robo-Co-op/launchpad/main/start.sh)
```

That's it. Claude Code opens and asks what languages you speak.

## What happens

1. AI asks your name, languages, and country
2. CEO (AI) picks 3 businesses optimized for your strengths
3. CTO, CMO, COO, CFO agents build and run them
4. You check in when you want

## Businesses (all $0 to start)

| Type | What | Revenue |
|------|------|---------|
| Affiliate/SEO | Multi-language review sites | Affiliate commissions |
| Digital Products | Templates, ebooks on Gumroad | Direct sales |
| Games + Ads | HTML5 games with AdSense | Ad revenue |

## Requirements

- [Claude Code](https://claude.ai/download) (`npm i -g @anthropic-ai/claude-code`)
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))

## How it works

Launchpad is a Claude Code configuration. Open Claude Code in this directory → it becomes your CEO → manages CTO/CMO/COO/CFO agents → they build businesses.

```
AI: "How should I call you?"
You: "Ahmed"
AI: "Hi Ahmed! Which languages do you speak?" → you pick from list
AI: "Where do you live?" → you pick from list
AI: "Here are 3 businesses I recommend..."
You: "Let's go"
AI: → delegates to CTO, CMO, COO, CFO → they start building
```

## Budget

$500/month runs 3 businesses in parallel.

| Role | Model | ~Cost |
|------|-------|-------|
| Coordinator (main) | Sonnet | $150/mo |
| CEO (strategy) | Opus | $30/mo |
| CXOs (execution) | Sonnet | $200/mo |
| Research | Haiku | $70/mo |

## Setup (your own instance)

### 1. Fork & clone

```bash
# Fork on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/launchpad.git
cd launchpad
npm install
```

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste contents of `supabase/schema.sql` → **Run**
3. Go to **Settings > API** → copy Project URL, anon key, service role key

### 3. Environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase keys and Anthropic API key
```

### 4. Deploy to Vercel

```bash
npx vercel          # Link to your Vercel project
npx vercel env add  # Add each key from .env.local
npx vercel --prod   # Deploy
```

### 5. Start

```bash
claude   # in the project directory
# AI will guide you through onboarding
```

## License

MIT
