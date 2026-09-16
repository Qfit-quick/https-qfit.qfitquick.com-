// Supabase Edge Function: send-reminders
//
// 4일 넘게 쉰 기기에 "다시 시작해보세요" 웹푸시를 보낸다(2026-09-16 요청).
// GitHub Actions 스케줄러(.github/workflows/push-reminders.yml)가 하루
// 한 번 이 함수를 호출한다.
//
// 배포: 이 저장소에는 Supabase CLI 로 관리하는 마이그레이션이 없어서,
// 이 파일 내용을 Supabase 대시보드 → Edge Functions → New function
// ("send-reminders" 라는 이름으로) 에 그대로 붙여넣어 배포한다.
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

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:qfit@example.com';

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const cutoff = new Date(Date.now() - GAP_DAYS * 86400000).toISOString().slice(0, 10);

  const { data: devices, error } = await sb
    .from('devices')
    .select('device_id, last_play_date, last_notified_date, push_endpoint, push_p256dh, push_auth')
    .not('push_endpoint', 'is', null)
    .lte('last_play_date', cutoff);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  let cleared = 0;

  for (const d of devices || []) {
    // 이번 공백에 대해 이미 보냈으면 건너뛴다 — last_notified_date 가
    // last_play_date 이후(같은 날 포함)면 이번 쉬는 기간엔 이미 보낸 것.
    if (d.last_notified_date && d.last_play_date && d.last_notified_date >= d.last_play_date) continue;

    const subscription = {
      endpoint: d.push_endpoint,
      keys: { p256dh: d.push_p256dh, auth: d.push_auth },
    };
    const payload = JSON.stringify({
      title: 'Q-fit',
      body: `${GAP_DAYS}일 쉬었습니다. 1분이면 다시 시작할 수 있어요.`,
    });

    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
      await sb.from('devices')
        .update({ last_notified_date: new Date().toISOString().slice(0, 10) })
        .eq('device_id', d.device_id);
    } catch (e) {
      // 410 Gone/404 = 구독이 브라우저·OS 쪽에서 이미 만료됨 — 다시 시도할
      // 필요가 없으니 지워서 다음 실행에서 아예 조회 대상에서 빠지게 한다.
      const status = e && (e.statusCode || e.status);
      if (status === 410 || status === 404) {
        await sb.from('devices')
          .update({ push_endpoint: null, push_p256dh: null, push_auth: null })
          .eq('device_id', d.device_id);
        cleared++;
      } else {
        console.error('push send failed for', d.device_id, e);
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, checked: (devices || []).length, sent, cleared }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
