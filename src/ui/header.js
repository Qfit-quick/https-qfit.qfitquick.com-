// 화면 머리 규칙 한 벌.
//
// 설계가 정한 것:
//   · 탭바로 바로 닿는 네 화면(홈·기록·회복·더보기) — 큰 제목
//   · 그 아래 화면 — 44px 뒤로 버튼 + 좌측 제목
//   · 운동 중 — 탭바를 감추고 나가는 길은 일시정지뿐
//
// 예전에는 화면마다 머리가 달랐고, 뒤로 가는 길이 화면 맨 아래 '닫기' 에
// 있었다. 스크롤을 끝까지 내려야 나가는 화면은, 깊이 들어갈수록 나가기 어렵다.
//
// 마크업을 여덟 군데 고치는 대신 여기서 만들어 넣는다. 뒤로 버튼은 원래
// 있던 '닫기' 를 대신 눌러 준다 — 그 버튼이 어디로 돌아갈지를 이미 알고 있고,
// 두 벌로 만들면 한쪽만 고쳤을 때 갈라진다.

// 화면 id → [사전 키, 원래 있던 뒤로 버튼]
const SUB_SCREENS = {
  // 'todayWod' 는 미리보기 화면의 이름이다. 두 화면에 같은 제목을 달면
  // 설정에서 미리보기로 넘어갔을 때 화면이 바뀐 것을 알 수 없다.
  'setup-screen': ['setupTitle', '#setup-back-btn'],
  'manual-select-screen': ['modeManual', '#manual-back-btn'],
  // 퀴즈만 제목이 없다(설계 04). 질문 자체가 화면의 큰 제목이라
  // 머리에도 이름을 달면 제목이 둘이 된다. 머리에는 진행 점과 건너뛰기만.
  'ai-quiz-screen': [null, '#ai-quiz-back-btn'],
  'routines-screen': ['routinesTitle', '#routines-back-btn'],
  'account-screen': ['accountEyebrow', '#account-back-btn'],
  'settings-screen': ['settingsBtn', '#settings-back-btn'],
  // 신체정보는 계획 아래 화면이다 — 저장하면 계획으로 나가므로 뒤로 갈 곳이
  // 있다. 계획·기록지는 탭으로 바로 닿으니 큰 제목 쪽(아래 목록)이다.
  'body-screen': ['bodyTitle', '#body-back-btn'],
  'video-gallery-screen': ['movesBtn', '#video-gallery-back-btn'],
  // 미리보기부터 탭바를 감춘다. 그러면 뒤로 버튼이 유일한 탈출구라
  // 이 화면에도 머리가 반드시 있어야 한다(설계의 주석 핀 4번).
  'wod-preview-screen': ['todayWod', '#preview-back-btn'],
};

let dict = null;
let translate = null;

function titleFor(key) {
  const entry = dict?.[key];
  return entry ? translate(entry) : '';
}

export function initHeaders({ STATIC_UI, t, ICON }) {
  dict = STATIC_UI;
  translate = t;

  for (const [id, [key, backSel]] of Object.entries(SUB_SCREENS)) {
    const screen = document.getElementById(id);
    if (!screen || screen.querySelector('.hd')) continue;

    const hd = document.createElement('header');
    hd.className = 'hd';
    hd.innerHTML =
      `<button class="hd-back" type="button" aria-label="뒤로">${ICON.back}</button>` +
      (key ? `<h2 class="hd-title" data-hd-key="${key}"></h2>` : '');

    hd.querySelector('.hd-back').addEventListener('click', () => {
      const back = document.querySelector(backSel);
      if (back) back.click();
      else history.back();
    });

    // 오른쪽 액션 한 자리. 설계의 머리 규칙은 '뒤로 · 제목 · 오른쪽 하나' 이고,
    // 그 하나가 무엇인지는 화면마다 다르다(고른 개수, 예상 소요, 전체 개수).
    // 화면이 자기 마크업에 data-hd-aside 로 적어 두면 여기서 머리로 옮긴다 —
    // 종류마다 이 파일에 분기를 만들면 화면을 하나 늘릴 때마다 여기가 늘어난다.
    const aside = screen.querySelector(':scope > [data-hd-aside]');
    if (aside) hd.appendChild(aside);

    screen.prepend(hd);

    // 화면 맨 아래의 '닫기'·'이전' 은 헤더가 대신하므로 감춘다 — 목록이 길면
    // 스크롤을 끝까지 내려야 나가는 길이 보인다. 지우지는 않는다:
    // 헤더의 뒤로 버튼이 이 버튼을 눌러 원래 동작을 그대로 쓴다.
    //
    // 다만 '계정 없이 계속하기' 처럼 뜻이 있는 버튼은 남긴다. 그건 뒤로가
    // 아니라 선택지고, 감추면 그 선택이 화면에서 사라진다.
    const back = document.querySelector(backSel);
    const generic = back && ['lbBackBtn', 'backBtn'].includes(back.dataset.i18n);
    if (generic && back.closest('.screen') === screen) back.hidden = true;

    // 큰 제목은 탭바로 바로 닿는 네 화면의 것이다. 하위 화면에서는 헤더가
    // 이름을 대므로, 남겨 두면 같은 낱말이 위아래로 두 번 나온다 —
    // 두 자리가 같은 사전 키를 읽으니 우연이 아니라 늘 그렇다.
    // 눈꼬리(eyebrow)도 같이 접는다. 제목 없이 그것만 남으면 무엇의
    // 머리말인지 알 수 없는 한 줄이 된다.
    const hero = screen.querySelector(':scope > .lb-title');
    if (hero) hero.hidden = true;
    // 눈꼬리는 제목이 있든 없든 접는다. 설정 화면처럼 제목 없이 눈꼬리만
    // 있는 곳에서는 머리의 '설정' 바로 아래 '설정' 이 또 한 번 찍혔다.
    const eyebrow = screen.querySelector(':scope > .eyebrow');
    if (eyebrow) eyebrow.hidden = true;
  }

  // 탭바로 바로 닿는 화면은 큰 제목 하나로 시작한다. 눈꼬리(MY RECORDS 같은
  // 대문자 한 줄)와 화면 맨 아래 '닫기' 를 접는다 —
  //  · 눈꼬리는 바로 아래 제목과 같은 말을 두 번 하고, 영문 그대로 박혀 있어
  //    언어를 바꿔도 안 바뀌었다.
  //  · '닫기' 는 탭바가 이미 하는 일이다. 목록이 길면 스크롤을 끝까지 내려야
  //    나가는 길이 보이는데, 그 길은 화면 아래에 늘 떠 있는 탭바다.
  // 버튼은 지우지 않고 감춘다 — 다른 곳에서 눌러 이동하는 데 쓴다.
  for (const id of ['records-screen', 'recovery-screen', 'more-screen', 'plan-screen', 'log-screen']) {
    const screen = document.getElementById(id);
    if (!screen) continue;
    const eyebrow = screen.querySelector(':scope > .eyebrow');
    if (eyebrow) eyebrow.hidden = true;
    const close = screen.querySelector(':scope > [data-i18n="lbBackBtn"], :scope > [data-i18n="closeBtn"]');
    if (close) close.hidden = true;
  }

  paintTitles();

  // 언어를 바꾸면 제목도 바뀐다. app.js 의 applyStaticTranslations 는
  // 마크업에 적힌 자리만 훑는데, 이 제목들은 여기서 만들어 넣은 것이라
  // 그 목록에 없다 — 부르는 쪽이 기억해야 하는 구조로 두면 잊는다.
  document.addEventListener('qfit:lang', paintTitles);
}

/** 언어가 바뀌면 제목도 바뀐다. */
export function paintTitles() {
  if (!dict) return;
  document.querySelectorAll('.hd-title[data-hd-key]').forEach((el) => {
    el.textContent = titleFor(el.dataset.hdKey);
  });
}
