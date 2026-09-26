-- Run once in the Supabase SQL editor before deploying the billing Worker.
-- billing_key has no browser RLS policy; only the Worker service-role can read it.
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_key text not null unique check (char_length(customer_key) between 2 and 50),
  billing_key text, card_number text, card_issuer_code text, billing_key_issued_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null, status text not null check (status in ('pending','active','past_due','canceled','expired')),
  current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean not null default false,
  billing_anchor_day integer check (billing_anchor_day between 1 and 31),
  payment_retry_count integer not null default 0 check (payment_retry_count >= 0),
  next_retry_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique check (order_id ~ '^[A-Za-z0-9_-]{6,64}$'), billing_period_start date not null,
  amount integer not null check (amount > 0), status text not null check (status in ('pending','paid','failed','canceled')),
  toss_payment_key text unique, approved_at timestamptz, failure_code text, failure_message text, toss_response jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(subscription_id, billing_period_start)
);
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_orders enable row level security;
revoke all on public.billing_customers, public.subscriptions, public.payment_orders from anon, authenticated;
grant select on public.subscriptions, public.payment_orders to authenticated;
-- service_role은 RLS를 우회하지만 GRANT는 별개다 — 이게 없으면 Worker가
-- 테이블을 만들자마자 42501(permission denied)로 막힌다(2026-09-25 실전 확인).
grant select, insert, update on public.billing_customers, public.subscriptions, public.payment_orders to service_role;
drop policy if exists "read own subscription" on public.subscriptions;
drop policy if exists "read own payment orders" on public.payment_orders;
create policy "read own subscription" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own payment orders" on public.payment_orders for select to authenticated using ((select auth.uid()) = user_id);
-- No browser insert/update/delete policy: entitlement and payment state are server-owned.
create index if not exists payment_orders_user_created_idx on public.payment_orders(user_id, created_at desc);

-- Upgrade databases created from an earlier version of this file.
alter table public.subscriptions
  add column if not exists billing_anchor_day integer,
  add column if not exists payment_retry_count integer not null default 0,
  add column if not exists next_retry_at timestamptz;
update public.subscriptions
set billing_anchor_day = extract(day from current_period_start)::integer
where billing_anchor_day is null and current_period_start is not null;

-- Failed attempts can be retried with a new orderId. At most one unresolved or
-- successful order may exist for one subscription period; unresolved orders
-- block another charge until the Toss result is reconciled.
alter table public.payment_orders
  drop constraint if exists payment_orders_subscription_id_billing_period_start_key;
create unique index if not exists payment_orders_one_open_or_paid_per_period_idx
  on public.payment_orders(subscription_id, billing_period_start)
  where status in ('pending', 'paid');
