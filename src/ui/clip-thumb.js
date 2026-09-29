// 동작을 알려주는 자리에 붙이는 작은 영상.
//
// 규칙: **동작을 알려주는 것은 전부 영상이다.** 사진은 운동하는 중에만 쓴다
// (그쪽은 startPhotoDemo 가 맡는다). 예전에는 고르기 카드와 미리보기 줄이
// 사진 한 장을 썼는데, 정지된 한 장은 '무엇을 하는 동작인지'를 못 알려 준다 —
// 스쿼트 맨 아래 자세만 보면 앉아 있는 사람일 뿐이다.
//
// 소리 없이, 반복으로, 화면 안에 있을 때만 돈다.

import { VIDEO_CLIPS } from '../data/video-clips.js';
import { clipUrl } from '../core/assets.js';

export const clipFor = (key) => VIDEO_CLIPS.find((c) => c.key === key) || null;

// 화면 밖의 영상까지 다 돌리면 안 된다. 클립이 24개에 합쳐서 17MB 라,
// 고르기 화면을 열자마자 전부 재생하면 저가 단말에서 프레임이 떨어진다.
// 보이는 것만 돌리고 나가면 멈춘다.
//
// 이 앱의 화면 전환은 display:none 이 아니라 opacity:0 + pointer-events:
// none 이다(base.css 의 .screen/.screen.active — 탭 전환에 트랜지션을
// 주기 위해서다). 그 말은 "지금 안 보이는 화면"도 화면과 똑같은 자리
// (position:absolute; inset:0)를 차지하고 있다는 뜻이라, IntersectionObserver
// 는 그 화면 속 영상도 "뷰포트 안"이라고 본다 — opacity 는 교차 판정에
// 안 들어간다. 그래서 활성화 여부를 따로 확인해야 한다. 게다가 observer는
// 요소의 기하학적 위치가 바뀔 때만 다시 부르므로, 화면이 나중에
// active 로 바뀌는 것 자체로는(위치가 안 바뀌었으니) 새 이벤트가 안
// 온다 — screenchange 를 같이 들어서 그 순간에 한 번 더 봐야 한다
// (2026-09-28 경진대회 2차 재검토, 실측으로 발견 — 미리보기 줄의 영상이
// 홈 화면만 열어도 받아지고 있었다).
function isInActiveScreen(v) {
  const screen = v.closest('.screen');
  return !screen || screen.classList.contains('active');
}

function activate(v) {
  if (!v.src) v.src = v.dataset.clipSrc;
  // play() 는 프로미스다. 자동재생이 막힌 브라우저에서 거절되는데,
  // 그건 여기서 할 수 있는 일이 없으므로 조용히 삼킨다.
  if (v.paused) v.play().catch(() => {});
}

const seen =
  typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            const v = e.target;
            if (e.isIntersecting && isInActiveScreen(v)) {
              // src 를 여기서 처음 붙인다 — 그 전엔 아예 안 받는다. 예전엔
              // 요소를 만들 때 바로 src 를 붙이고 preload="metadata" 로만
              // 눌러 뒀는데, <video src> 는 뷰포트 밖이어도 그 순간부터
              // 네트워크 요청을 시작한다(재생 여부와 무관하다) — 관찰자는
              // 재생만 멈출 뿐 그 요청 자체는 못 막는다. 그래서 목록 하나를
              // 열면 화면 밖 카드까지 전부 동시에 받기 시작했다(2026-09-28
              // 경진대회 재검토에서 발견). 진짜로 화면에 들어왔을 때만
              // 받도록 옮긴다.
              activate(v);
            } else if (!v.paused) {
              v.pause();
            }
          });
        },
        { rootMargin: '96px' },
      )
    : null;

// 화면이 바뀌면(app.js 의 showScreen() 이 매번 쏜다) 방금 켜진 화면 안의
// 영상들 중 아직 안 받은 것을 다시 본다 — geometry 가 안 바뀌어서
// observer 가 스스로는 안 불러 주는 자리다. 뷰포트 교차는 간단히
// getBoundingClientRect 로 직접 잰다(활성화된 화면은 항상 뷰포트
// 크기라 이 정도로 충분하다).
if (typeof document !== 'undefined') {
  document.addEventListener('screenchange', (e) => {
    const screen = document.getElementById(e.detail?.id);
    if (!screen) return;
    const vh = window.innerHeight || 0;
    const margin = 96;
    screen.querySelectorAll('video[data-clip-src]').forEach((v) => {
      if (v.src) return;
      const rect = v.getBoundingClientRect();
      if (rect.bottom >= -margin && rect.top <= vh + margin) activate(v);
    });
  });
}

/**
 * 운동 key 에 맞는 영상 요소를 만든다. 영상이 없으면 null —
 * 부르는 쪽이 빈자리를 어떻게 채울지 정한다.
 */
export function clipThumb(key) {
  const clip = clipFor(key);
  if (!clip) return null;

  const v = document.createElement('video');
  // src 는 아직 안 붙인다 — 위 IntersectionObserver 가 실제로 화면(또는
  // rootMargin 안)에 들어왔을 때만 붙인다. 주소는 data 속성에 적어 둔다.
  v.dataset.clipSrc = clipUrl(clip.file);
  // muted 는 프로퍼티와 속성 둘 다 준다. 사파리는 속성이 없으면
  // 자동재생을 막는다 — 그러면 카드가 통째로 정지 화면이 된다.
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute('muted', '');
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.loop = true;
  v.autoplay = true;
  v.controls = false;
  // 첫 프레임만 받아 둔다. src 가 실제로 붙는 순간(위 관찰자) 8MB 를
  // 한꺼번에 받게 두지 않는다.
  v.preload = 'metadata';
  v.disablePictureInPicture = true;
  // 장식이다. 이름과 설명이 옆에 글자로 있으므로 스크린리더는 건너뛴다.
  v.setAttribute('aria-hidden', 'true');
  v.tabIndex = -1;

  if (seen) {
    seen.observe(v);
  } else {
    // IntersectionObserver 가 없는 아주 오래된 브라우저 — 여기선 가릴
    // 방법이 없으니 그냥 바로 받는다.
    v.src = v.dataset.clipSrc;
    v.play().catch(() => {});
  }

  return v;
}

/**
 * 목록을 비우기 전에 부른다.
 *
 * IntersectionObserver 는 보고 있는 요소를 붙잡고 있어서, innerHTML 로
 * 지우기만 하면 DOM 에서는 사라져도 관찰 대상으로는 남는다. 검색어를 칠
 * 때마다 다시 그리는 화면이라 그대로 두면 계속 쌓인다.
 */
export function disposeClipThumbs(root) {
  if (!root) return;
  root.querySelectorAll('video').forEach((v) => {
    if (seen) seen.unobserve(v);
    v.pause();
    // src 를 떼고 load() 를 불러야 받던 것을 실제로 끊는다.
    v.removeAttribute('src');
    v.load();
  });
}
