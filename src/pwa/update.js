// 홈 화면 앱이 옛 판에 묶이던 것을 끊는다(2026-09-18).
//
// 사파리 탭에서는 새 판이 잘 내려가는데 홈 화면에 설치한 쪽만 몇 주째
// 옛 판인 일이 있었다. 같은 코드인데 다르게 구는 이유가 셋이다:
//
//  1. 홈 화면 앱은 사파리와 저장소가 통째로 다르다. 사파리에서 새로고침해
//     받은 새 판은 홈 화면 앱과 아무 상관이 없다.
//  2. 홈 화면 앱에는 주소창도 새로고침 버튼도 없다. 당겨서 새로고침도
//     안 된다 — body 가 position:fixed 라(base.css) 문서 자체가 안 밀린다.
//     즉 사람이 손으로 새 판을 부를 방법이 아예 없다.
//  3. 브라우저가 sw.js 를 다시 확인하는 것은 '새 주소를 여는' 순간인데,
//     iOS 는 홈 화면 앱을 껐다 켜도 대개 있던 화면을 그대로 되살린다.
//     그 순간이 며칠씩 안 온다.
//
// 그래서 두 가지를 여기서 한다: 앱이 앞으로 돌아올 때마다 새 판이 있는지
// 직접 묻고(update), 새 워커가 제어권을 가져가면 — 화면이 안 보이게 된
// 다음에 — 화면을 다시 띄운다.
//
// sw.js 는 skipWaiting + clientsClaim 이라 새 워커가 곧바로 제어권을
// 가져간다. 그런데 그것만으로는 **떠 있는 화면은 안 바뀐다** — 옛 HTML 과
// 옛 JS 가 그대로 돌고 있기 때문이다. 다시 띄우는 이 한 줄이 없어서
// 지금까지 새 판이 받아만 지고 보이지는 않았다.

// 너무 자주 묻지 않는다. 홈 화면 앱은 하루에도 몇 번씩 앞뒤로 오간다.
const MIN_GAP_MS = 60 * 1000;

export function initUpdate() {
  if (!('serviceWorker' in navigator)) return;

  // 첫 방문에는 다시 띄우지 않는다. clientsClaim 때문에 워커가 처음
  // 제어권을 잡는 순간에도 controllerchange 가 오는데, 그걸 '새 판' 으로
  // 읽으면 첫 방문자가 무한히 새로고침되는 화면을 보게 된다.
  const hadController = !!navigator.serviceWorker.controller;
  let pending = false;
  let last = 0;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || pending) return;
    pending = true;
    applyWhenSafe();
  });

  // 다시 띄우는 것은 **화면이 안 보일 때만** 한다(2026-10-01) — 앱을 내리거나
  // 다른 탭으로 갔을 때. 예전엔 새 판을 받자마자 다시 띄웠는데, 그 순간이
  // 대개 앱을 막 연 직후라 명언 카드(ui/gate.js)가 뜬 채였다. 사용자에게는
  // "명언을 눌렀더니 화면이 깜빡이고 명언이 또 뜬다"로 보였다. 안 보일 때
  // 다시 띄우면 아무도 그 순간을 못 보고, 돌아오면 새 판이 떠 있다.
  //
  // 운동 중에도 다시 띄우지 않는다. 세트 한가운데서 화면이 처음으로
  // 돌아가면 새 판을 받은 것보다 잃는 것이 크다. body.immersive 가
  // 그 상태를 이미 들고 있다(ui/nav.js 의 paint).
  function applyWhenSafe() {
    const safe = () => document.visibilityState === 'hidden'
      && !document.body.classList.contains('immersive');
    if (safe()) { location.reload(); return; }
    const tryNow = () => {
      if (!safe()) return;
      document.removeEventListener('visibilitychange', tryNow);
      window.removeEventListener('pagehide', tryNow);
      watch.disconnect();
      location.reload();
    };
    document.addEventListener('visibilitychange', tryNow);
    window.addEventListener('pagehide', tryNow);
    // 숨겨진 채로 운동이 끝나는 경우(드물다)까지 놓치지 않는다.
    const watch = new MutationObserver(tryNow);
    watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function check() {
    const now = Date.now();
    if (now - last < MIN_GAP_MS) return;
    last = now;
    navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update()).catch(() => {});
  }

  // 앱이 앞으로 돌아올 때. 홈 화면 앱에서 새 판을 받을 계기는 사실상
  // 이것뿐이다 — 주소를 새로 여는 일이 거의 없기 때문이다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  // 뒤로가기 캐시에서 되살아난 경우. visibilitychange 가 안 올 수 있다.
  window.addEventListener('pageshow', check);
  // 켠 직후 한 번. 등록이 끝난 뒤여야 하므로 ready 를 기다린다.
  navigator.serviceWorker.ready.then(check).catch(() => {});
}
