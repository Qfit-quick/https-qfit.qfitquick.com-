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

// 화면 밖의 영상까지 다 돌리면 안 된다. 클립이 12개에 합쳐서 8MB 라,
// 고르기 화면을 열자마자 전부 재생하면 저가 단말에서 프레임이 떨어진다.
// 보이는 것만 돌리고 나가면 멈춘다.
const seen =
  typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            const v = e.target;
            if (e.isIntersecting) {
              // play() 는 프로미스다. 자동재생이 막힌 브라우저에서 거절되는데,
              // 그건 여기서 할 수 있는 일이 없으므로 조용히 삼킨다.
              if (v.paused) v.play().catch(() => {});
            } else if (!v.paused) {
              v.pause();
            }
          });
        },
        { rootMargin: '96px' },
      )
    : null;

/**
 * 운동 key 에 맞는 영상 요소를 만든다. 영상이 없으면 null —
 * 부르는 쪽이 빈자리를 어떻게 채울지 정한다.
 */
export function clipThumb(key) {
  const clip = clipFor(key);
  if (!clip) return null;

  const v = document.createElement('video');
  v.src = clipUrl(clip.file);
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
  // 첫 프레임만 받아 둔다. 목록을 열자마자 8MB 를 받게 두지 않는다.
  v.preload = 'metadata';
  v.disablePictureInPicture = true;
  // 장식이다. 이름과 설명이 옆에 글자로 있으므로 스크린리더는 건너뛴다.
  v.setAttribute('aria-hidden', 'true');
  v.tabIndex = -1;

  if (seen) seen.observe(v);
  else v.play().catch(() => {});

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
