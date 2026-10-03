// Supabase Edge Function: send-reminders
//
// 웹푸시 두 가지를 보낸다. GitHub Actions 스케줄러(.github/workflows/push-reminders.yml)가
// 매시 정각 이 함수를 부른다(2026-10-04 전엔 하루 한 번).
//
//  1. 4일 리마인더(2026-09-16) — 4일 넘게 쉰 기기에 "다시 시작해보세요". 한 번
//     쉬는 기간에 한 번만. 한국 시간 낮 12시에 부를 때만 돈다(예전처럼 하루 한 번).
//  2. 매일 알림(2026-10-04) — 앱 설정에서 시각을 고른 기기(devices.daily_hour)에,
//     그 시각에 오늘 아직 운동 전이면 한 번. docs/sql/2026-10-04-daily-reminder.sql
//     을 돌리기 전에는 그 칸이 없어 이 단계만 조용히 건너뛴다(1은 그대로 돈다).
//
// last_play_date 는 앱이 하트비트로 보내는 '마지막 운동 날짜'다 — 2026-10-04 부터
// 앱 완주뿐 아니라 도전 실천·직접 체크까지 포함한다(src/app.js 의 lastWorkoutDate).
// 날짜는 한국 날짜(앱이 기기 시간대로 적는다).
//
// 배포: 이 저장소에는 Supabase CLI 로 관리하는 마이그레이션이 없어서,
// 이 파일 내용을 Supabase 대시보드 → Edge Functions → send-reminders 에
// 그대로 붙여넣어 배포한다.
//
// 필요한 시크릿(대시보드 → Edge Functions → send-reminders → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (예: mailto:you@example.com)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 모든 Edge
// Function 에 자동으로 넣어준다 — 따로 등록할 필요 없다.
//
// 인증: GitHub Actions 는 공개 anon 키를 Authorization 헤더로 보낸다(그
// 키는 어차피 클라이언트 번들에도 있는 공개 값이다) — 이 함수 자체는
// SUPABASE_SERVICE_ROLE_KEY 로 devices 테이블에 접근하므로 별도 비밀을
// GitHub 쪽에 둘 필요가 없다.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const GAP_DAYS = 4;
const GAP_HOUR_KST = 12; // 4일 리마인더를 보내는 시각(한국 시간)

// 매일 알림 문구 — 날마다 돌려 쓴다(같은 말이 매일 오면 금방 안 읽는다).
const DAILY_BODIES = [
  '오늘 아직 운동 전이에요. 1분이면 끝나요 💪',
  '연속 기록이 기다려요 🔥 오늘 1분만 움직여요.',
  '알이 기다리고 있어요 🥚 오늘 1분 함께해요.',
  '오늘의 1분, 지금 하면 오늘 할 일 끝 ✓',
];

function kstNow() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours(), dayIndex: Math.floor(d.getTime() / 86400000) };
}

type Device = {
  device_id: string;
  last_play_date: string | null;
  last_notified_date?: string | null;
  push_endpoint: string;
  push_p256dh: string;
  push_auth: string;
};

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:qfit@example.com';

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const sb = createClient(supabaseUrl, serviceRoleKey);
  const now = kstNow();
  // 수동 실행(?gap=1)이면 시각과 상관없이 4일 리마인더도 돈다 — 배포 직후 시험용.
  const forceGap = new URL(req.url).searchParams.get('gap') === '1';

  const report: Record<string, unknown> = { kst: now };

  async function push(d: Device, body: string): Promise<'sent' | 'gone' | 'failed'> {
    try {
      await webpush.sendNotification(
        { endpoint: d.push_endpoint, keys: { p256dh: d.push_p256dh, auth: d.push_auth } },
        JSON.stringify({ title: 'Q-fit', body }),
      );
      return 'sent';
    } catch (e) {
      // 410 Gone/404 = 구독이 브라우저·OS 쪽에서 이미 만료됨 — 지워서 다음
      // 실행에서 아예 조회 대상에서 빠지게 한다.
      const status = e && ((e as { statusCode?: number }).statusCode || (e as { status?: number }).status);
      if (status === 410 || status === 404) {
        await sb.from('devices')
          .update({ push_endpoint: null, push_p256dh: null, push_auth: null })
          .eq('device_id', d.device_id);
        return 'gone';
      }
      console.error('push send failed for', d.device_id, e);
      return 'failed';
    }
  }

  // ── 1. 4일 리마인더 ──
  if (now.hour === GAP_HOUR_KST || forceGap) {
    const cutoff = new Date(Date.now() + 9 * 3600 * 1000 - GAP_DAYS * 86400000).toISOString().slice(0, 10);
    const { data, error } = await sb
      .from('devices')
      .select('device_id, last_play_date, last_notified_date, push_endpoint, push_p256dh, push_auth')
      .not('push_endpoint', 'is', null)
      .lte('last_play_date', cutoff);
    if (error) {
      report.gap = { ok: false, error: error.message };
    } else {
      let sent = 0, cleared = 0;
      for (const d of (data || []) as Device[]) {
        // 이번 공백에 대해 이미 보냈으면 건너뛴다.
        if (d.last_notified_date && d.last_play_date && d.last_notified_date >= d.last_play_date) continue;
        const r = await push(d, `${GAP_DAYS}일 쉬었습니다. 1분이면 다시 시작할 수 있어요.`);
        if (r === 'sent') {
          sent++;
          await sb.from('devices').update({ last_notified_date: now.date }).eq('device_id', d.device_id);
        } else if (r === 'gone') cleared++;
      }
      report.gap = { ok: true, checked: (data || []).length, sent, cleared };
    }
  }

  // ── 2. 매일 알림 ──
  {
    const { data, error } = await sb
      .from('devices')
      .select('device_id, last_play_date, push_endpoint, push_p256dh, push_auth, daily_sent_date')
      .eq('daily_hour', now.hour)
      .not('push_endpoint', 'is', null);
    if (error) {
      // 칸이 아직 없다(SQL 전) — 이 단계만 건너뛴다.
      report.daily = { ok: false, skipped: error.message };
    } else {
      let sent = 0, cleared = 0, alreadyDone = 0;
      const body = DAILY_BODIES[now.dayIndex % DAILY_BODIES.length];
      for (const d of (data || []) as (Device & { daily_sent_date: string | null })[]) {
        if (d.daily_sent_date === now.date) continue; // 오늘 이미 보냄
        if (d.last_play_date === now.date) { alreadyDone++; continue; } // 오늘 이미 운동함
        const r = await push(d, body);
        if (r === 'sent') {
          sent++;
          await sb.from('devices').update({ daily_sent_date: now.date }).eq('device_id', d.device_id);
        } else if (r === 'gone') cleared++;
      }
      report.daily = { ok: true, checked: (data || []).length, sent, cleared, alreadyDone };
    }
  }

  return new Response(JSON.stringify({ ok: true, ...report }), { headers: { 'Content-Type': 'application/json' } });
});
