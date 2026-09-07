// 선 아이콘 몇 개.
//
// 이모지를 아이콘으로 쓰지 않는다. 이유가 셋이다:
//  - 플랫폼마다 그림이 다르다. 아이폰의 🔊 와 안드로이드의 🔊 는 다른 그림이고,
//    그래서 "우리 앱은 이렇게 생겼다"를 만들 수가 없다.
//  - 색이 박혀 있어 테마를 안 따라간다. 다크에서 혼자 튄다.
//  - 스크린리더가 "스피커 이모지"라고 읽는다.
//
// 그려야 할 뜻이 있는 자리에만 둔다. 장식으로는 쓰지 않는다 —
// 아이콘이 스무 개가 되면 그때부터는 글자보다 읽기 어렵다.

const svg = (paths, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" width="20" height="20" ` +
  `aria-hidden="true" focusable="false"${extra}>${paths}</svg>`;

export const ICON = {
  soundOn: svg(
    '<path d="M11 5 6 9H3v6h3l5 4V5Z"/>' +
    '<path d="M15.5 9a4 4 0 0 1 0 6"/>' +
    '<path d="M18.5 6.5a8 8 0 0 1 0 11"/>'
  ),
  soundOff: svg(
    '<path d="M11 5 6 9H3v6h3l5 4V5Z"/>' +
    '<path d="m16 9 5 6"/><path d="m21 9-5 6"/>'
  ),
  close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  pause: svg('<path d="M10 5v14"/><path d="M15 5v14"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none"/>'),
  back: svg('<path d="M15 5 8 12l7 7"/>'),

  // 하단 탭
  home: svg('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z"/>'),
  chart: svg('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
  recovery: svg('<path d="M20.8 6.6a4.9 4.9 0 0 0-7 0L12 8.4l-1.8-1.8a4.9 4.9 0 1 0-7 7l8.8 8.8 8.8-8.8a4.9 4.9 0 0 0 0-7Z"/>'),
  more: svg('<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>'),
  // 계획 탭 — 달력. '주 단위로 정해 둔 것' 이라는 뜻이라 목록(more)과 구별된다.
  plan: svg('<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 3v3M16 3v3M4 10h16"/>'),
  // 체크 탭 — 오늘 두 칸(운동·식단)에 표시하는 일. 체크 두 개가 곧 그 뜻이다.
  checklist: svg('<path d="m3 7 2 2 3-3"/><path d="m3 16 2 2 3-3"/><path d="M12 8h9"/><path d="M12 17h9"/>'),

  // 홈 머리와 두 바로가기. 설계 파일의 path 를 그대로 옮겼다 —
  // 비슷하게 다시 그리면 같은 뜻의 아이콘이 두 벌이 된다.
  settings: svg(
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  ),
  heart: svg('<path d="M12 21s-7-4.4-7-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7 3.4C19 16.6 12 21 12 21z"/>'),
  moves: svg('<path d="m10 8 6 4-6 4z"/><rect x="3" y="4" width="18" height="16" rx="2"/>'),

  // 시작 시트의 네 갈래. 이것도 설계 파일의 path 를 그대로 옮겼다.
  grid: svg('<path d="M4 6h7v7H4zM13 6h7v7h-7zM4 15h7v3H4zM13 15h7v3h-7z"/>'),
  dice: svg(
    '<rect x="3" y="3" width="18" height="18" rx="3"/>' +
    '<circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>' +
    '<circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>' +
    '<circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>'
  ),
  spark: svg('<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>'),
  repeat: svg('<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/>'),
  chevron: svg('<path d="m9 18 6-6-6-6"/>'),
  check: svg('<path d="m4 12 6 6L20 6"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/>'),
  send: svg('<path d="M3 11l18-8-8 18-2-8z"/>'),
  share: svg('<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M8 7l4-4 4 4"/>'),
  // 식단. 포크와 숟가락 — 접시(원)로 그리면 '완료' 체크의 원과 헷갈린다.
  food: svg('<path d="M6 3v7a2.5 2.5 0 0 0 5 0V3"/><path d="M8.5 12v9"/><path d="M17 3c-1.4 2-2 3.6-2 6 0 2 .8 3 2 3s2-1 2-3c0-2.4-.6-4-2-6Z"/><path d="M17 12v9"/>'),
  // 신체정보. 사람 하나 — 몸에 관한 값이라는 뜻이다.
  body: svg('<circle cx="12" cy="5" r="2.4"/><path d="M12 7.4V14"/><path d="M7 10h10"/><path d="m9.5 21 2.5-7 2.5 7"/>'),
};

// 마크업에 data-icon="close" 라고 적어 두면 부팅할 때 채워 넣는다.
// HTML 안에 SVG 를 손으로 붙여 넣으면 같은 아이콘이 여러 벌이 되고,
// 하나를 고쳤을 때 나머지가 안 따라온다.
export function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.dataset.icon;
    if (ICON[name]) el.innerHTML = ICON[name];
  });
}
