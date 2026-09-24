// 화면 안 꺼지게(Wake Lock API, 2026-09-24 요청).
//
// 운동 중에 화면이 꺼지면 타이머를 못 보고, 다시 켰을 때 이미 몇 스테이션이
// 지나가 있다 — "운동 관련된 건 다" 적용해 달라는 요청이라, 화면 하나마다
// 따로 부르지 않고 ui/nav.js 의 IMMERSIVE(운동 중이라 탭바를 감추는 화면)
// 판정에 그대로 얹는다. 새 운동 화면이 하나 늘어도 IMMERSIVE 에만 넣으면
// 자동으로 잠금까지 따라온다.
//
// 지원 안 하는 브라우저(구형 iOS Safari 등)에서는 조용히 아무 일도 안
// 한다 — 화면이 꺼지는 것 말고는 막을 방법이 없다.
//
// 탭이 백그라운드로 가면 브라우저가 스펙대로 알아서 잠금을 풀어 버린다.
// 다시 앞으로 돌아왔을 때 아직 운동 중이면(held 가 true) 잠금을 되잡는다.
let sentinel = null;
let held = false;

async function acquire() {
  if (!('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => { sentinel = null; });
  } catch (e) {
    // NotAllowedError(문서가 안 보이는 상태 등) — 조용히 넘어간다.
    sentinel = null;
  }
}

export function keepAwake() {
  held = true;
  if (!sentinel) acquire();
}

export function allowSleep() {
  held = false;
  if (sentinel) {
    const s = sentinel;
    sentinel = null;
    try { s.release().catch(() => {}); } catch (e) { /* 무시 */ }
  }
}

document.addEventListener('visibilitychange', () => {
  if (held && document.visibilityState === 'visible' && !sentinel) acquire();
});
