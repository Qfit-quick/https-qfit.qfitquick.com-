-- 매일 알림(2026-10-04) — 고른 시각(한국 시간)에 오늘 아직 운동 전이면 웹푸시를
-- 한 번 보낸다. 4일 리마인더(2026-09-devices-presence-push.sql)와 같은 devices
-- 표·같은 구독을 쓰고, 칸 두 개와 함수 하나만 더한다.
--
--   daily_hour       — 0~23(한국 시간), null 이면 끔. 앱 설정의 '매일 알림'.
--   daily_sent_date  — 마지막으로 매일 알림을 보낸 날(한국 날짜). 하루 한 번만.
--
-- 앱(src/cloud/presence.js 의 setDailyReminder)이 set_daily_reminder 를 부른다.
-- 이 SQL 을 돌리기 전에는 그 호출이 실패하고, 앱은 고른 값을 기기에 들고 있다가
-- 하트비트 때마다 다시 시도한다 — 돌리고 나면 저절로 맞춰진다.
--
-- 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 실행. 그 다음
-- supabase/functions/send-reminders/index.ts 를 대시보드의 send-reminders 함수에
-- 다시 붙여넣어 배포한다(매일 알림 발송 로직이 거기 있다).

alter table public.devices add column if not exists daily_hour smallint;
alter table public.devices add column if not exists daily_sent_date date;

create index if not exists devices_daily_hour_idx on public.devices (daily_hour) where daily_hour is not null;

create or replace function public.set_daily_reminder(p_device_id text, p_hour smallint default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hour is not null and (p_hour < 0 or p_hour > 23) then
    raise exception 'hour out of range';
  end if;
  insert into public.devices (device_id, daily_hour, updated_at)
  values (p_device_id, p_hour, now())
  on conflict (device_id) do update
    set daily_hour = excluded.daily_hour,
        updated_at = now();
end;
$$;
grant execute on function public.set_daily_reminder(text, smallint) to anon, authenticated;

-- 발송 함수(service_role)는 devices 를 직접 읽고 쓴다. 2026-10-04 대시보드의
-- 호출 기록을 보니 send-reminders 가 정기 실행에서도 500 으로 끝나고 있었다 —
-- 2026-09-19-fix-send-reminders-grant.sql 이 아직 안 돌아가 있어 이 권한이
-- 없었던 것으로 보인다(4일 리마인더가 실제로는 한 번도 안 나갔을 수 있다).
-- 같은 줄을 여기 다시 둔다 — 이 파일 하나로 4일 리마인더도 살아난다.
grant select, update on public.devices to service_role;
