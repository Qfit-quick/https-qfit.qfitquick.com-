-- Q-fit "지금 접속자 수 · 오늘 사용자 수" + 4일 주기 푸시 알림용 테이블.
--
-- 배경: 랭킹 대신 실시간 접속자 수·오늘 사용자 수를 보여 달라는 요청과,
-- 4일 쉬면 앱이 닫혀 있어도(웹 푸시로) 알려 달라는 요청(둘 다 2026-09-16).
-- 두 기능 다 "누구"가 아니라 "몇 대"가 필요해서 로그인 계정과 엮지 않고,
-- 기기 하나당 익명 id(src/core/device.js) 로 구분한다.
--
-- 실행 방법: Supabase 프로젝트 대시보드 → SQL Editor 에 아래를 그대로
-- 붙여넣고 실행. 이 리포는 마이그레이션을 자동 적용하는 CI 단계가 없으므로
-- 이 파일은 기록·재현용이며, 사람이 직접 한 번 실행해야 한다.
--
-- 보안: devices 테이블 자체는 RLS 를 켜서 anon 이 직접 읽거나 쓸 수 없게
-- 막는다 — 대신 아래 RPC 함수들(SECURITY DEFINER)로만 접근한다. 그래서
-- "다른 기기의 익명 id 목록"이나 "누군가의 푸시 구독 정보"가 anon 키만으로
-- 그대로 노출되는 일이 없다. get_online_count/get_today_active_count 는
-- 개수(정수) 하나만 돌려준다.

create table if not exists public.devices (
  device_id text primary key,
  last_seen timestamptz not null default now(),
  last_play_date date,
  push_endpoint text,
  push_p256dh text,
  push_auth text,
  last_notified_date date,
  updated_at timestamptz not null default now()
);

alter table public.devices enable row level security;
-- 정책을 하나도 안 만든다 — RLS 가 켜진 테이블은 정책이 없으면 anon/authenticated
-- 어느 쪽도 직접 select/insert/update 를 못 한다. 아래 SECURITY DEFINER 함수들만
-- (테이블 소유자 권한으로 실행되므로) RLS 를 우회해 접근한다.

create index if not exists devices_last_seen_idx on public.devices (last_seen);
create index if not exists devices_last_play_date_idx on public.devices (last_play_date);

-- 하트비트: 접속자 수·오늘 사용자 수 집계용. 로그인 여부와 무관하게 앱을
-- 열어 둔 모든 기기가 주기적으로 부른다(src/cloud/presence.js).
create or replace function public.heartbeat(p_device_id text, p_last_play_date date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.devices (device_id, last_seen, last_play_date, updated_at)
  values (p_device_id, now(), p_last_play_date, now())
  on conflict (device_id) do update
    set last_seen = now(),
        last_play_date = coalesce(excluded.last_play_date, public.devices.last_play_date),
        updated_at = now();
end;
$$;
grant execute on function public.heartbeat(text, date) to anon, authenticated;

create or replace function public.get_online_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.devices where last_seen > now() - interval '90 seconds';
$$;
grant execute on function public.get_online_count() to anon, authenticated;

create or replace function public.get_today_active_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.devices where last_seen::date = current_date;
$$;
grant execute on function public.get_today_active_count() to anon, authenticated;

-- 푸시 구독 등록/갱신. 알림 설정을 켤 때 한 번 부른다(src/notify/reminder.js).
create or replace function public.save_push_subscription(
  p_device_id text, p_endpoint text, p_p256dh text, p_auth text, p_last_play_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.devices (device_id, push_endpoint, push_p256dh, push_auth, last_play_date, updated_at)
  values (p_device_id, p_endpoint, p_p256dh, p_auth, p_last_play_date, now())
  on conflict (device_id) do update
    set push_endpoint = excluded.push_endpoint,
        push_p256dh = excluded.push_p256dh,
        push_auth = excluded.push_auth,
        last_play_date = coalesce(excluded.last_play_date, public.devices.last_play_date),
        updated_at = now();
end;
$$;
grant execute on function public.save_push_subscription(text, text, text, text, date) to anon, authenticated;

-- 알림 설정을 끌 때 부른다 — 구독 정보만 지우고 접속 통계 행은 남긴다.
create or replace function public.remove_push_subscription(p_device_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devices
    set push_endpoint = null, push_p256dh = null, push_auth = null, updated_at = now()
    where device_id = p_device_id;
end;
$$;
grant execute on function public.remove_push_subscription(text) to anon, authenticated;
