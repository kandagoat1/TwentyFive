create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  broker text,
  starting_balance numeric(18,2) not null default 0,
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists accounts_user_idx on accounts(user_id);

create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists strategies_user_idx on strategies(user_id);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.accounts (user_id, name, starting_balance)
  values (new.id, 'Main', 0);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid references accounts on delete cascade,
  strategy_id uuid references strategies on delete set null,

  symbol text not null,
  asset_class text not null default 'equity'
    check (asset_class in ('equity','option','future','forex','crypto')),
  direction text not null check (direction in ('long','short')),
  status text not null default 'open' check (status in ('open','closed')),

  entry_at timestamptz not null default now(),
  exit_at timestamptz,

  qty numeric(18,8) not null,
  avg_entry numeric(18,8) not null,
  avg_exit numeric(18,8),
  stop_loss numeric(18,8),
  take_profit numeric(18,8),
  fees numeric(18,2) not null default 0,

  setup text,
  mistakes text[] not null default '{}',
  emotion_pre text,
  emotion_post text,
  conviction smallint check (conviction between 1 and 5),
  notes text,
  tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  gross_pnl numeric(18,2) generated always as (
    case when avg_exit is null then null
    else round(
      (case when direction = 'long'
            then (avg_exit - avg_entry)
            else (avg_entry - avg_exit) end) * qty
    , 2) end
  ) stored,

  net_pnl numeric(18,2) generated always as (
    case when avg_exit is null then null
    else round(
      (case when direction = 'long'
            then (avg_exit - avg_entry)
            else (avg_entry - avg_exit) end) * qty - fees
    , 2) end
  ) stored,

  risk_per_unit numeric(18,8) generated always as (
    case when stop_loss is null then null
    else abs(avg_entry - stop_loss) end
  ) stored,

  risk_amount numeric(18,2) generated always as (
    case when stop_loss is null then null
    else round(abs(avg_entry - stop_loss) * qty, 2) end
  ) stored,

  r_multiple numeric(10,4) generated always as (
    case
      when stop_loss is null or avg_exit is null then null
      when abs(avg_entry - stop_loss) = 0 then null
      else round(
        ((case when direction = 'long'
               then (avg_exit - avg_entry)
               else (avg_entry - avg_exit) end)
         / abs(avg_entry - stop_loss))::numeric
      , 4) end
  ) stored,

  planned_rr numeric(10,4) generated always as (
    case
      when stop_loss is null or take_profit is null then null
      when abs(avg_entry - stop_loss) = 0 then null
      else round((abs(take_profit - avg_entry) / abs(avg_entry - stop_loss))::numeric, 4)
    end
  ) stored,

  hold_minutes integer generated always as (
    case when exit_at is null then null
    else (extract(epoch from (exit_at - entry_at)) / 60)::int end
  ) stored
);

create index if not exists trades_user_idx     on trades(user_id);
create index if not exists trades_entry_idx    on trades(user_id, entry_at desc);
create index if not exists trades_symbol_idx   on trades(user_id, symbol);
create index if not exists trades_status_idx   on trades(user_id, status);
create index if not exists trades_strategy_idx on trades(strategy_id);
create index if not exists trades_tags_idx     on trades using gin(tags);
create index if not exists trades_mistakes_idx on trades using gin(mistakes);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trades_touch on trades;
create trigger trades_touch before update on trades
  for each row execute function touch_updated_at();

create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  side text not null check (side in ('buy','sell')),
  qty numeric(18,8) not null,
  price numeric(18,8) not null,
  fee numeric(18,2) not null default 0,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists executions_trade_idx on executions(trade_id, executed_at);

create table if not exists trade_attachments (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  storage_path text not null,
  caption text,
  kind text not null default 'chart' check (kind in ('chart','entry','exit','other')),
  created_at timestamptz not null default now()
);
create index if not exists attachments_trade_idx on trade_attachments(trade_id);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  entry_date date not null default current_date,
  market_view text,
  lessons text,
  mood smallint check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table profiles          enable row level security;
alter table accounts          enable row level security;
alter table strategies        enable row level security;
alter table trades            enable row level security;
alter table executions        enable row level security;
alter table trade_attachments enable row level security;
alter table journal_entries   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['accounts','strategies','trades','executions',
                           'trade_attachments','journal_entries']
  loop
    execute format('drop policy if exists own_rows on %I', t);
    execute format(
      'create policy own_rows on %I for all
       using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

drop policy if exists own_profile on profiles;
create policy own_profile on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace view daily_pnl
with (security_invoker = on) as
select
  user_id,
  (exit_at at time zone 'UTC')::date as day,
  count(*)                            as trades,
  sum(net_pnl)                        as net_pnl,
  sum(case when net_pnl > 0 then 1 else 0 end) as wins,
  sum(case when net_pnl < 0 then 1 else 0 end) as losses,
  avg(r_multiple)                     as avg_r
from trades
where status = 'closed' and exit_at is not null
group by user_id, (exit_at at time zone 'UTC')::date;

create or replace view trade_stats
with (security_invoker = on) as
select
  user_id,
  count(*)                                                  as total_trades,
  sum(case when net_pnl > 0 then 1 else 0 end)              as wins,
  sum(case when net_pnl < 0 then 1 else 0 end)              as losses,
  round(100.0 * sum(case when net_pnl > 0 then 1 else 0 end)
        / nullif(count(*),0), 2)                            as win_rate,
  round(sum(net_pnl), 2)                                    as net_pnl,
  round(avg(net_pnl), 2)                                    as expectancy,
  round(avg(r_multiple), 4)                                 as avg_r,
  round(avg(case when net_pnl > 0 then net_pnl end), 2)     as avg_win,
  round(avg(case when net_pnl < 0 then net_pnl end), 2)     as avg_loss,
  round(
    sum(case when net_pnl > 0 then net_pnl else 0 end)
    / nullif(abs(sum(case when net_pnl < 0 then net_pnl else 0 end)), 0)
  , 2)                                                      as profit_factor,
  max(net_pnl)                                              as best_trade,
  min(net_pnl)                                              as worst_trade
from trades
where status = 'closed'
group by user_id;

create or replace view mistake_cost
with (security_invoker = on) as
select user_id, unnest(mistakes) as mistake,
       count(*) as occurrences,
       round(sum(net_pnl), 2) as total_pnl,
       round(avg(r_multiple), 3) as avg_r
from trades
where status = 'closed' and array_length(mistakes,1) > 0
group by user_id, unnest(mistakes);
