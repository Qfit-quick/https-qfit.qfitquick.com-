-- Run once in the Supabase SQL editor. Additive only — existing subscribers
-- are unaffected (trial_used defaults to false, which is correct for anyone
-- who already paid before this existed; it just means the column doesn't
-- retroactively know they "used" a trial, which is fine since they already
-- paid and won't see the trial button while premium).
--
-- 무료 체험은 결제수단 등록 없이(worker/api/billing.js 의 startTrial) 그냥
-- subscriptions 행을 active 로, 기간을 1개월로 박아 두는 것뿐이다 — 카드도
-- 카카오페이도 필요 없다. 기간이 끝나면 기존 크론(renewDueSubscriptions)이
-- 그대로 집어서 결제수단이 없으니 markPastDue 로 떨어뜨린다 — 체험판
-- 종료를 위한 별도 로직이 필요 없다.
alter table public.subscriptions
  add column if not exists trial_used boolean not null default false;
