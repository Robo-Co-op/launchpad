-- Launchpad データベーススキーマ
-- Supabase SQL エディタで実行してください

-- ユーザープロフィール
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  country_of_origin text,
  current_country text,
  refugee_status text check (refugee_status in ('refugee', 'asylum_seeker', 'stateless', 'other')),
  cohort_id uuid,
  created_at timestamptz default now()
);

-- スタートアップ (ユーザーあたり最大3社)
create table startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'pivoted', 'paused', 'graduated')),
  pivot_count int default 0,
  created_at timestamptz default now()
);

-- ピボットログ (追記専用)
create table pivot_log (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references startups(id) on delete cascade,
  pivot_from text not null,
  pivot_to text not null,
  reason text,
  agent_suggestion text,
  created_at timestamptz default now()
);

-- エージェント実行ログ
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  startup_id uuid references startups(id),
  model text not null,
  tokens_input int,
  tokens_output int,
  cost_usd numeric(10,6),
  task_type text,
  created_at timestamptz default now()
);

-- トークン予算
create table token_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) unique,
  total_usd numeric(10,2) default 500.00,
  spent_usd numeric(10,6) default 0,
  reset_at timestamptz,
  updated_at timestamptz default now()
);

-- Stripe サブスクリプション
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan text check (plan in ('bootcamp', 'accelerator', 'loan')),
  status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- RLS を有効化
alter table profiles enable row level security;
alter table startups enable row level security;
alter table pivot_log enable row level security;
alter table agent_runs enable row level security;
alter table token_budgets enable row level security;
alter table subscriptions enable row level security;

-- RLS ポリシー
create policy "Users own their profile" on profiles
  for all using (auth.uid() = id);

create policy "Users own their startups" on startups
  for all using (auth.uid() = user_id);

create policy "Users see their pivot logs" on pivot_log
  for select using (
    auth.uid() = (select user_id from startups where id = startup_id)
  );

create policy "Pivot log is append-only" on pivot_log
  for insert with check (
    auth.uid() = (select user_id from startups where id = startup_id)
  );

create policy "Users see their agent runs" on agent_runs
  for all using (auth.uid() = user_id);

create policy "Users see their budget" on token_budgets
  for all using (auth.uid() = user_id);

create policy "Users see their subscription" on subscriptions
  for all using (auth.uid() = user_id);
