// 리마인더 — 나흘 동안 운동을 안 하면 한 번 알린다(FR-03).
//
// ── 지금 어디까지 되는가 (2026-09-16 갱신) ──────────────────────────────
//   · 언제 알릴지 판단하는 규칙        → 지금 동작한다(아래 dueAt/isDue)
//   · 권한을 받고 상태를 기억하는 UI    → 지금 동작한다
//   · 앱이 열려 있을 때 알림 띄우기      → 지금 동작한다
//   · 앱이 닫혀 있을 때 보내기(웹푸시)   → 이제 배포됐다 —
//     enable() 이 push 구독까지 받아 서버(devices 테이블)에 저장하고,
//     실제 발송은 GitHub Actions 스케줄러가 하루 한 번 Supabase Edge
//     Function 을 불러 처리한다(별도 저장소 밖 설정, docs/sql 참고).
//     iOS 는 조건이 하나 더 붙는다 — 홈 화면에 추가(PWA standalone)해야
//     Safari 가 웹푸시를 허용한다. 미지원 기기에서는 subscribePush() 가
//     조용히 실패해도 위 "앱이 열려 있을 때" 알림은 그대로 동작한다.
//
// 이렇게 두는 이유: 규칙과 UI 를 나중에 몰아서 만들면, 그때는 배포 문제와
// 로직 문제가 섞여 무엇이 안 되는지 가려내기 어려워진다.

import { savePushSubscription, removePushSubscription } from '../cloud/presence.js';

const KEY_ON = 'qfit_reminder_on_v1';
const KEY_LAST_SENT = 'qfit_reminder_sent_v1';

// VAPID 공개키 — 이 값 자체는 공개해도 되는 값이다(브라우저가 구독을 만들
// 때 서버 신원을 확인하는 용도). 개인키는 절대 이 저장소에 두지 않는다 —
// Supabase Edge Function 의 비밀(secret)로만 존재한다.
const VAPID_PUBLIC_KEY = 'BA3tDhF5tZuIQHRSWefYoeRjYU40iNUHIs-6ZfMRBJZTX-kkj-jkUk8lVhQYjr9MycglHGxfXWwVey30cKfcz-Y';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** 며칠 쉬면 알릴지. 명세서가 정한 값이다. */
export const GAP_DAYS = 4;
const DAY = 86400000;

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

export function isEnabled() {
  return read(KEY_ON) === '1';
}

/** 알림을 받을 수 있는 상태인가. 거절했거나 지원 안 하면 false. */
export function canNotify() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/** 다음에 알릴 시각. 마지막 운동이 없으면 null — 한 번도 안 한 사람을 재촉하지 않는다. */
export function dueAt(lastPlayMs) {
  if (!lastPlayMs) return null;
  return lastPlayMs + GAP_DAYS * DAY;
}

/** 지금 알릴 때인가.
 *  같은 공백에 대해 두 번 알리지 않는다 — 알림이 쌓이는 앱은 그 순간부터 꺼진다. */
export function isDue(lastPlayMs, now = Date.now()) {
  const due = dueAt(lastPlayMs);
  if (!due || now < due) return false;
  const sent = Number(read(KEY_LAST_SENT) || 0);
  // 마지막으로 보낸 시각이 이번 공백 안이면 이미 보낸 것이다
  return sent < (lastPlayMs || 0) || sent < due;
}

export function markSent(now = Date.now()) {
  write(KEY_LAST_SENT, String(now));
}

/** 켜기 — 권한을 여기서 묻는다. 부팅하자마자 묻지 않는 이유는,
 *  아직 앱이 뭘 하는지도 모르는 사람에게 알림부터 물으면 대부분 거절하고
 *  그 거절은 브라우저가 기억해서 되돌리기 어렵기 때문이다.
 *  lastPlayDate 는 서버에 구독을 저장할 때 같이 넣어 둔다 — 다음 하트비트를
 *  기다리지 않고 바로 "4일 계산"이 정확한 값에서 시작하게 하기 위해서다. */
export async function enable(lastPlayDate) {
  if (typeof Notification === 'undefined') return false;
  const res = await Notification.requestPermission();
  const ok = res === 'granted';
  write(KEY_ON, ok ? '1' : '0');
  if (ok) {
    // 웹푸시는 되면 좋은 것이지 필수가 아니다 — 미지원 기기(iOS 홈 화면
    // 미설치 등)에서 실패해도 위 checkOnOpen() 은 그대로 동작하므로
    // 실패를 삼킨다.
    try { await subscribePush(lastPlayDate); } catch (e) { console.error('push subscribe failed:', e); }
  }
  return ok;
}

export function disable() {
  write(KEY_ON, '0');
  try { removePushSubscription(); } catch (e) {}
  try {
    navigator.serviceWorker && navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => sub && sub.unsubscribe()).catch(() => {});
  } catch (e) {}
}

/** 앱이 열려 있는 동안 확인해서, 알릴 때면 알린다.
 *  닫혀 있는 사이는 아래 subscribePush() 로 받은 웹푸시가 대신 맡는다. */
export function checkOnOpen(lastPlayMs) {
  if (!isEnabled() || !canNotify()) return false;
  if (!isDue(lastPlayMs)) return false;
  try {
    new Notification('Q-fit', {
      body: GAP_DAYS + '일 쉬었습니다. 1분이면 다시 시작할 수 있어요.',
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      tag: 'qfit-reminder', // 같은 태그는 덮어쓴다 — 알림이 쌓이지 않는다
    });
    markSent();
    return true;
  } catch (e) {
    console.error('reminder failed:', e);
    return false;
  }
}

/** 브라우저의 푸시 구독을 만들어 서버(devices 테이블)에 저장한다.
 *  service worker·PushManager 를 지원하지 않는 기기(구형 iOS, 홈 화면
 *  미설치 iOS 등)에서는 조용히 실패한다 — enable() 이 이 실패를 삼키므로
 *  "앱이 열려 있을 때" 알림은 그 기기에서도 그대로 동작한다. */
export async function subscribePush(lastPlayDate) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await savePushSubscription(sub, lastPlayDate);
    return { ok: true };
  } catch (e) {
    console.error('push subscribe failed:', e);
    return { ok: false, reason: 'error' };
  }
}
