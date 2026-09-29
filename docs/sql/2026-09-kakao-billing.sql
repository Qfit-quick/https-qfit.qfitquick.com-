-- Run once in the Supabase SQL editor before deploying the Kakao billing
-- Worker (worker/api/kakaoBilling.js). Additive only — existing Toss rows
-- keep working unchanged (provider defaults to 'toss').
--
-- billing_customers previously assumed exactly one provider (Toss) per user.
-- Kakao needs its own token (a "SID", not a card-style billing key) and a way
-- to tell the renewal cron which provider actually owns the subscription.
alter table public.billing_customers
  add column if not exists provider text not null default 'toss'
    check (provider in ('toss', 'kakao')),
  add column if not exists kakao_sid text;

-- billing_key stays NOT enforced not-null (a Kakao customer has no Toss
-- billing_key at all) — it already allowed null before this migration.
