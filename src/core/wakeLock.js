// 운동 중 화면 꺼짐 방지(2026-09-24 요청, 2026-10-03 다시 짰다).
//
// "운동 중에는 화면이 절대 꺼지면 안 된다." 2026-10-03 전엔 두 군데가 샜다:
//
//  1. 걸어 두는 화면이 ui/nav.js 의 IMMERSIVE(카운트다운·운동·타바타 실행
//     등)뿐이었다. 도전(챌린지 트래커) 탭에서 타이머를 돌려도, 프로그램
//     탭에 있어도 잠금이 아예 안 걸렸다 — 사용자는 둘 다 운동 중이라고
//     분명히 말했었다.
//  2. Wake Lock API 하나만 믿었다. 아이폰 홈 화면 앱(PWA)에선 iOS 18.4 전까지
//     이 API 가 요청은 '성공'으로 끝나면서 실제로는 아무 효과가 없었다
//     (WebKit 버그). 실패가 안 보이니 고칠 길도 없었다.
//
// 그래서 지금은:
//  - 잠금을 거는 '이유'를 여럿 받는다(setAwake). 화면(nav.js)과 도전
//    타이머(challengeTracker.js)가 각자 켜고 끄고, 하나라도 켜져 있으면 잠근다.
//  - Wake Lock 을 걸고, 브라우저가 멋대로 풀면(배터리 절약 등) 바로 다시 건다.
//  - 아이폰·아이패드, 또는 Wake Lock 이 없거나 실패한 브라우저에선 소리 없는
//    아주 작은 영상(keepAwakeVideo.js)을 1px 짜리로 계속 돌린다. 영상이
//    재생 중이면 기기가 화면을 끄지 않는다 — NoSleep.js 가 오래 써 온 방법이다.
//    둘 다 거는 것은 일부러다: 한쪽이 조용히 안 먹어도 다른 쪽이 막는다.
//
// 앱이 백그라운드로 가면 브라우저가 둘 다 풀어 버린다(스펙). 다시 앞으로
// 오면 아직 운동 중일 때 다시 건다.
import { KEEP_AWAKE_MP4 } from './keepAwakeVideo.js';

const reasons = new Set();
let sentinel = null;
let lockFailed = false;
let video = null;
let waitingForGesture = false;

const IS_IOS = (() => {
  const ua = navigator.userAgent || '';
  // iPadOS 13+ 는 데스크톱 맥처럼 자기를 소개한다 — 터치 지점 수로 가른다.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
})();

function held() { return reasons.size > 0; }
function visible() { return document.visibilityState === 'visible'; }
function needVideo() { return IS_IOS || !('wakeLock' in navigator) || lockFailed; }

async function acquireLock() {
  if (!('wakeLock' in navigator) || sentinel || !visible()) return;
  try {
    const s = await navigator.wakeLock.request('screen');
    // 그 사이 운동이 끝났으면 바로 놓는다.
    if (!held()) { s.release().catch(() => {}); return; }
    sentinel = s;
    lockFailed = false;
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null;
      // 브라우저가 멋대로 풀었다(배터리 절약·OS 정책 등). 아직 운동 중이면 다시 건다.
      if (held() && visible()) setTimeout(acquireLock, 300);
    });
  } catch (e) {
    // NotAllowedError(권한 정책·저전력 모드 등) — 영상으로 막는다.
    lockFailed = true;
    startVideo();
  }
}

function releaseLock() {
  const s = sentinel;
  sentinel = null;
  if (s) { try { s.release().catch(() => {}); } catch (e) { /* 무시 */ } }
}

function ensureVideo() {
  if (video) return video;
  video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.src = KEEP_AWAKE_MP4;
  // display:none 이나 화면 밖이면 iOS 가 '재생 중'으로 안 쳐 주는 경우가 있다 —
  // 화면 안에 1px, 거의 투명하게 둔다.
  video.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
  // loop 를 무시하는 기기가 있어 끝나면 직접 되감는다.
  video.addEventListener('ended', () => { if (held()) { video.currentTime = 0; video.play().catch(() => {}); } });
  document.body.appendChild(video);
  return video;
}

function startVideo() {
  if (!needVideo() || !visible()) return;
  const v = ensureVideo();
  if (!v.paused) return;
  const p = v.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      // 사용자가 화면을 한 번도 안 건드렸으면 재생이 막힐 수 있다 — 다음 터치에서 다시.
      if (waitingForGesture) return;
      waitingForGesture = true;
      const retry = () => {
        waitingForGesture = false;
        document.removeEventListener('pointerdown', retry, true);
        document.removeEventListener('touchend', retry, true);
        document.removeEventListener('click', retry, true);
        if (held()) startVideo();
      };
      document.addEventListener('pointerdown', retry, true);
      document.addEventListener('touchend', retry, true);
      document.addEventListener('click', retry, true);
    });
  }
}

function stopVideo() {
  if (video && !video.paused) video.pause();
}

function apply() {
  if (held()) {
    acquireLock();
    startVideo();
  } else {
    releaseLock();
    stopVideo();
  }
}

/** 잠금 이유 하나를 켜거나 끈다. 하나라도 켜져 있으면 화면이 안 꺼진다. */
export function setAwake(reason, on) {
  const before = held();
  if (on) reasons.add(reason); else reasons.delete(reason);
  if (held() !== before || on) apply();
}

/** 지금 화면 꺼짐을 막고 있는가(검사·디버그용). */
export function isAwakeHeld() {
  return held();
}

// 예전 이름(ui/nav.js 가 쓰던 것) — 화면 이유 하나로 이어 둔다.
export function keepAwake() { setAwake('screen', true); }
export function allowSleep() { setAwake('screen', false); }

document.addEventListener('visibilitychange', () => {
  if (held() && visible()) apply();
});
// 뒤로가기 캐시에서 되살아난 경우엔 visibilitychange 가 안 올 수 있다.
window.addEventListener('pageshow', () => { if (held()) apply(); });
