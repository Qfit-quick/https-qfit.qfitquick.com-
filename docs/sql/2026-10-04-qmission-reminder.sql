-- Q-Mission 알림(2026-10-04) — 매일 알림을 '운동했나'가 아니라 '오늘 Q-Mission 을
-- 다 했나'로 보낸다(사용자 요청). 4일 리마인더는 그대로 '운동 알림'.
--
-- 앱(src/cloud/presence.js 의 reportQMission)이 Q-Mission 을 체크할 때와
-- 하트비트 때 오늘 진행(몇 개 중 몇 개)을 적는다 — Q-Mission 알림을 켠 기기만.
--
--   qm_date  — 진행을 적은 날(한국 날짜)
--   qm_done  — 그날 완료한 미션 수
--   qm_total — 그날 미션 수(보통 3)
--
-- 발송(supabase/functions/send-reminders)은 고른 시각에 qm_date 가 오늘이고
-- qm_done >= qm_total 이면 안 보낸다. 2026-10-04-daily-reminder.sql 다음에 돌린다.
--
-- 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

alter table public.devices add column if not exists qm_date date;
alter table public.devices add column if not exists qm_done smallint;
alter table public.devices add column if not exists qm_total smallint;

create or replace function public.report_qmission(
  p_device_id text, p_date date, p_done smallint, p_total smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_done < 0 or p_total < 0 or p_done > 20 or p_total > 20 then
    raise exception 'count out of range';
  end if;
  insert into public.devices (device_id, qm_date, qm_done, qm_total, updated_at)
  values (p_device_id, p_date, p_done, p_total, now())
  on conflict (device_id) do update
    set qm_date = excluded.qm_date,
        qm_done = excluded.qm_done,
        qm_total = excluded.qm_total,
        updated_at = now();
end;
$$;
grant execute on function public.report_qmission(text, date, smallint, smallint) to anon, authenticated;
