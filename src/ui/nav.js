// 하단 탭바와 뒤로가기.
//
// 이걸 붙이기 전에는 홈에서 눌러 들어갔다가 화면마다 있는 "닫기"로 되돌아오는
// 구조였다. 화면이 열여섯 개인데 지금 어디에 있는지 알려 주는 것이 없었고,
// 안드로이드 뒤로가기를 누르면 앱이 그냥 종료됐다.
//
// 화면을 직접 켜지 않고 **원래 있던 버튼을 누른다**(via). 그 버튼들이 화면을
// 채우는 렌더까지 들고 있기 때문이다 — 건너뛰면 뱃지 막대가 꽉 차 있고
// 아바타가 비어 있는, 껍데기만 있는 화면이 뜬다.
import { ICON } from './icons.js';
import { showScreenById, isWorkoutRunning } from '../app.js';
import { closeSheet, isSheetOpen } from './sheet.js';

// 다섯 칸이 상한이다. 여섯이 되면 라벨이 두 자로 줄고, 두 자짜리 이름은
// 서로 구별이 안 된다('기록'과 '기록지'가 그랬다 — 그래서 하나는 '체크'다).
//
// 회복은 탭에서 뺐다. 다칠 때만 여는 화면이고 홈 타일과 더보기 줄로 이미
// 두 길이 있는데, 매일 쓰는 계획·체크를 그 자리 때문에 못 올리는 것이
// 순서가 뒤바뀐 것이었다.
//
// 기록도 탭에서 뺐다. 더보기 줄에 이미 있는 것과 같은 화면이라, 하단에
// 고정으로 자리를 차지할 이유가 없었다 — 매일 쓰는 홈·계획·체크만 남긴다.
const TABS = [
  { id: 'start-screen', label: '홈', icon: 'home', via: null },
  { id: 'log-screen', label: '체크', icon: 'checklist', via: '#today-card-open' },
  { id: 'plan-screen', label: '계획', icon: 'plan', via: null },
  { id: 'more-screen', label: '더보기', icon: 'more', via: '#open-more-btn' },
];

// 운동에 집중해야 하는 화면에서는 탭바를 감춘다.
// 여기서 나가는 길은 일시정지뿐이어야 한다 — 운동 중에 탭이 보이면 누른다.
const IMMERSIVE = new Set([
  'wod-preview-screen', 'warmup-screen', 'countdown-screen',
  'game-screen', 'result-screen',
]);

// 탭이 아닌 화면에 있을 때 어느 탭을 켜 둘지. 없으면 아무것도 안 켠다.
const BELONGS_TO = {
  'settings-screen': 'more-screen',
  'routines-screen': 'more-screen',
  'account-screen': 'more-screen',
  // 회복·동작 소개·기록은 탭에서 내려왔다. 탭을 하나도 안 켜 두면 지금 어디에
  // 있는지 알려 주는 것이 없어지므로, 들어온 문인 '더보기' 를 켜 둔다.
  'recovery-screen': 'more-screen',
  'video-gallery-screen': 'more-screen',
  'records-screen': 'more-screen',
  // 신체정보는 계획을 만들기 위한 입력이다. 더보기에서도 들어올 수 있지만
  // 저장하면 계획으로 나가므로, 켜 둘 탭은 계획이다.
  'body-screen': 'plan-screen',
  'setup-screen': 'start-screen',
  'manual-select-screen': 'start-screen',
  'ai-quiz-screen': 'start-screen',
};

let bar = null;
let ignoreNextPush = false;

function build() {
  bar = document.createElement('nav');
  bar.className = 'tabbar';
  bar.setAttribute('aria-label', '주요 화면');
  bar.innerHTML = TABS.map(
    (t) =>
      `<button class="tab" type="button" data-screen="${t.id}" aria-label="${t.label}">` +
      `<span class="tab-icon">${ICON[t.icon]}</span>` +
      `<span class="tab-label">${t.label}</span></button>`
  ).join('');

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    const id = btn.dataset.screen;
    if (document.querySelector('.screen.active')?.id === id) return;
    const tab = TABS.find((t) => t.id === id);
    const opener = tab?.via && document.querySelector(tab.via);
    if (opener) opener.click();
    else showScreenById(id);
  });

  document.getElementById('app')?.appendChild(bar);
}

function paint(id) {
  const active = BELONGS_TO[id] ?? id;
  bar?.querySelectorAll('.tab').forEach((b) => {
    b.classList.toggle('on', b.dataset.screen === active);
    b.setAttribute('aria-current', b.dataset.screen === active ? 'page' : 'false');
  });
  document.body.dataset.screen = id;
  document.body.classList.toggle('immersive', IMMERSIVE.has(id));
}

export function initNav() {
  build();

  document.addEventListener('screenchange', (e) => {
    const id = e.detail.id;
    // 시트에서 무언가를 골라 화면이 넘어간 경우. 안 닫으면 시트가 뜬 채로
    // 뒤 화면만 바뀌어서, 돌아왔을 때 이미 열려 있는 시트를 다시 만난다.
    const hadSheet = isSheetOpen();
    closeSheet({ keepHistory: true });
    paint(id);
    if (ignoreNextPush) {
      ignoreNextPush = false;
      return;
    }
    if (hadSheet) {
      // 시트가 쌓아 둔 칸을 새 화면으로 덮어쓴다. 새로 쌓으면 뒤로가기 한 번이
      // 이미 사라진 시트로 돌아가는 헛걸음이 된다.
      history.replaceState({ s: id }, '', '#' + id);
      return;
    }
    // 같은 화면을 두 번 쌓지 않는다 — 그러면 뒤로가기를 두 번 눌러야 한다
    if (history.state?.s === id) return;
    history.pushState({ s: id }, '', '#' + id);
  });

  window.addEventListener('popstate', (e) => {
    const current = document.querySelector('.screen.active')?.id;

    // 시트가 열려 있으면 뒤로가기는 시트만 닫는다. 화면까지 같이 넘어가면
    // 한 번 눌렀는데 두 단계가 되돌아간 것처럼 보인다.
    if (isSheetOpen()) {
      // 시트가 쌓아 둔 칸이 방금 빠진 것이다. 여기서 또 건드리지 않는다.
      closeSheet({ keepHistory: true });
      return;
    }

    // 운동 중에 뒤로가기를 누르면 나가는 대신 일시정지한다.
    // 그냥 나가면 타이머는 계속 돌고 화면만 바뀌어서, 돌아왔을 때
    // 몇 세트가 지나가 있다.
    if (current === 'game-screen' && isWorkoutRunning()) {
      history.pushState({ s: 'game-screen' }, '', '#game-screen');
      document.getElementById('pause-btn')?.click();
      return;
    }

    const target = e.state?.s || 'start-screen';
    if (target === current) return;
    ignoreNextPush = true;
    const tab = TABS.find((t) => t.id === target);
    const opener = tab?.via && document.querySelector(tab.via);
    if (opener) opener.click();
    else showScreenById(target);
  });

  // 첫 화면을 기록해 둔다. 이게 없으면 첫 뒤로가기가 앱을 나가 버린다.
  const first = document.querySelector('.screen.active')?.id || 'start-screen';
  history.replaceState({ s: first }, '', location.hash || '');
  paint(first);
}
