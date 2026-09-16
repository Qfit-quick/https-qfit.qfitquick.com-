// "오늘 몇 명 사용" — 랭킹 대신 보여 달라는 요청(2026-09-16, 접속자 수는
// 같은 날 빼기로 함). 로그인 여부와 무관하게 전부에게 켜져 있어야 해서, Supabase
// SDK(cloud/supabase.js, 약 219KB, 로그인할 때만 받음)는 쓰지 않는다.
// 서버 REST 엔드포인트를 순수 fetch() 로 직접 부른다 — 그러면 이 기능
// 하나 때문에 앱을 안 쓰는 로그인 기능까지 모두가 다운로드하게 되는 일이
// 없다.
//
// 서버 쪽은 devices 하나의 테이블 + RPC 함수 몇 개로 되어 있다
// (docs/sql/2026-09-devices-presence-push.sql). anon 키로는 RPC 함수만
// 실행 가능하고 devices 테이블 자체는 직접 열람할 수 없다 — 다른 기기의
// 익명 id 목록이 그대로 노출되지 않게 하기 위해서다.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';
import { getDeviceId } from '../core/device.js';

async function rpc(name, body) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    // 오프라인이거나 프로젝트가 잠들어 있는 등 — 통계 기능이라 실패해도
    // 조용히 넘어간다. 운동 기능과는 완전히 무관하다.
    return null;
  }
}

/** 이 기기가 살아 있다고 서버에 알린다. lastPlayDate 도 같이 보내서
 *  push 알림(reminder.js)이 "언제부터 쉬었는지" 를 서버에서도 알 수 있게 한다. */
export function heartbeat(lastPlayDate) {
  return rpc('heartbeat', { p_device_id: getDeviceId(), p_last_play_date: lastPlayDate || null });
}

/** 오늘 하루 하트비트를 한 번이라도 보낸 기기 수(자정 기준, 서버 UTC).
 *  null 이면 실패 — 부르는 쪽이 화면에 아무것도 안 띄우면 된다(0명이라고
 *  잘못 보여주는 것보다 낫다). */
export async function getTodayActiveCount() {
  const n = await rpc('get_today_active_count');
  return typeof n === 'number' ? n : null;
}

/** 4일 주기 푸시 알림(notify/reminder.js) 이 브라우저에서 받은 구독 정보를
 *  서버에 저장한다 — 실제로 발송하는 쪽(GitHub Actions → Supabase Edge
 *  Function)이 이 표를 읽는다. */
export function savePushSubscription(subscription, lastPlayDate) {
  const json = subscription.toJSON ? subscription.toJSON() : subscription;
  return rpc('save_push_subscription', {
    p_device_id: getDeviceId(),
    p_endpoint: json.endpoint,
    p_p256dh: json.keys && json.keys.p256dh,
    p_auth: json.keys && json.keys.auth,
    p_last_play_date: lastPlayDate || null,
  });
}

/** 알림을 끌 때 구독 정보만 지운다. */
export function removePushSubscription() {
  return rpc('remove_push_subscription', { p_device_id: getDeviceId() });
}
