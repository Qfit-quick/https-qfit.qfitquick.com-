-- Q-fit 클라우드 프로필 병합 지원용 칼럼 추가.
--
-- 배경: src/cloud/supabase.js 의 CLOUD_ENABLED 를 켜기 전에 반드시 먼저
-- 실행해야 한다. 서버 profiles 테이블에 xp·achievements·totalCalories 등의
-- 칼럼이 없으면 src/app.js 의 syncProfileToCloud()/mergeCloudProfile() 이
-- 이 필드들을 보내거나 합칠 곳이 없어 조용히 누락된다(예외는 잡히지만
-- 기능이 반쪽으로 동작한다).
--
-- 실행 방법: Supabase 프로젝트 대시보드 → SQL Editor 에 아래를 그대로
-- 붙여넣고 실행. 이 리포는 마이그레이션을 자동 적용하는 CI 단계가 없으므로
-- 이 파일은 기록·재현용이며, 사람이 직접 한 번 실행해야 한다.
--
-- RLS: 기존 정책이 profiles.id = auth.uid() 같은 행 단위 정책이라면(코드
-- 주석상 이미 그렇게 동작 중) 새 칼럼에 별도 정책이 필요 없다. 실행 후
-- 한 번 확인할 것.

alter table public.profiles
  add column if not exists xp integer not null default 0,
  add column if not exists total_calories integer not null default 0,
  add column if not exists best_calories_ever integer not null default 0,
  add column if not exists total_workout_seconds integer not null default 0,
  add column if not exists achievements jsonb not null default '[]'::jsonb,
  add column if not exists comeback_count integer not null default 0,
  add column if not exists best_score_ever integer not null default 0,
  add column if not exists referred_by text;
