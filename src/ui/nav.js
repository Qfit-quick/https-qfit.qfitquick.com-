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
import { isAmrapRunning, isAmrapPaused, pauseAmrap } from './amrap.js';
import { isCircuitRunning, isCircuitPaused, pauseCircuit } from './circuit.js';
import { isQuickRunning, isQuickPaused, pauseQuick } from './quickStart.js';
import { isTabataRunning, isTabataPaused, pauseTabata } from './tabata.js';
import { isViewingProgramDetail, backToProgramList } from './programs.js';
import { closeSheet, isSheetOpen } from './sheet.js';
import { keepAwake, allowSleep } from '../core/wakeLock.js';

let t = (o) => (o && o.ko) || '';
let S = {};

// 다섯 칸이 상한이다. 여섯이 되면 라벨이 두 자로 줄고, 두 자짜리 이름은
// 서로 구별이 안 된다('기록'과 '기록지'가 그랬다 — 그래서 하나는 '체크'다).
//
// 회복은 탭에서 뺐다. 다칠 때만 여는 화면이고 홈 타일과 더보기 줄로 이미
// 두 길이 있는데, 매일 쓰는 계획·체크를 그 자리 때문에 못 올리는 것이
// 순서가 뒤바뀐 것이었다.
//
// 기록도 탭에서 뺐다. 더보기 줄에 이미 있는 것과 같은 화면이라, 하단에
// 고정으로 자리를 차지할 이유가 없었다 — 매일 쓰는 홈·체크·프로그램·목표만 남긴다.
//
// 프로그램은 '목표' 탭의 자동 주간 계획과 다른 물건이다(2026-09-11) —
// 이름 붙여 고르는, 시작·끝이 있는 다주 루틴이라 따로 칸을 준다.
// 다섯 칸이 상한이라고 여기 오래 적어 뒀었지만, 턱걸이·플란체 같은
// 장기(수개월) 챌린지는 '프로그램'(2~3주짜리)과는 무게가 달라서
// 여섯째 칸 '도전'을 사용자 요청으로 추가했다(2026-09-13) — 라벨은
// 기존 '프로그램'(4자)보다 짧은 2자라 줄어들 폭이 없다.
const TABS = [
  { id: 'start-screen', labelKey: 'navHome', icon: 'home', via: null },
  { id: 'log-screen', labelKey: 'navCheck', icon: 'checklist', via: '#today-card-open' },
  { id: 'programs-screen', labelKey: 'programsEyebrow', icon: 'trophy', via: null },
  { id: 'plan-screen', labelKey: 'navGoal', icon: 'plan', via: null },
  { id: 'challenge-screen', labelKey: 'challengeEyebrow', icon: 'spark', via: null },
  { id: 'more-screen', labelKey: 'moreEyebrow', icon: 'more', via: '#open-more-btn' },
];

// 운동에 집중해야 하는 화면에서는 탭바를 감춘다.
// 여기서 나가는 길은 일시정지뿐이어야 한다 — 운동 중에 탭이 보이면 누른다.
const IMMERSIVE = new Set([
  'wod-preview-screen', 'warmup-screen', 'countdown-screen',
  'game-screen', 'result-screen',
  // 큐피드 하트 슈팅(2026-09-12) — 이 화면도 탭에 집중해야 하니 탭바를 감춘다.
  'heartgame-screen',
  // 'Cindy' AMRAP·'QCE' 서킷(2026-09-19) — 타이머가 도는 화면이라 마찬가지로 감춘다.
  'amrap-screen', 'circuit-screen',
  // '10초 후 시작'(2026-09-23) — 카운트다운도 서킷 구간도 전부 타이머라 같은 이유.
  'quick-screen',
  // 타바타 타이머(2026-09-24 되살림) — 위와 같은 이유. 설정 화면
  // (tabata-setup-screen)은 고르는 중이라 안 넣는다.
  'tabata-run-screen',
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
  // 큐피드 하트 슈팅은 더보기 줄에서 연다.
  'heartgame-screen': 'more-screen',
  // Cindy AMRAP·QCE 서킷은 프로그램 탭에서 시작한다.
  'amrap-screen': 'programs-screen',
  'circuit-screen': 'programs-screen',
  // QCE 경기 규칙도 프로그램 탭에서 연다. 운동 중 화면이 아니라
  // IMMERSIVE 에는 안 넣는다 — 탭바가 그대로 보여야 자연스럽다.
  'qce-rulebook-screen': 'programs-screen',
  // '10초 후 시작'은 홈에서 연다. IMMERSIVE 라 탭바 자체가 숨어 실제로는
  // 안 보이지만, amrap-screen·circuit-screen 과 같은 이유로 명시해 둔다.
  'quick-screen': 'start-screen',
  // 타바타 타이머는 더보기 줄에서 연다. 설정 화면은 IMMERSIVE 가 아니라
  // 탭바가 그대로 보인다(qce-rulebook-screen 과 같은 이유) — 실행 화면은
  // IMMERSIVE 라 실제로는 안 보이지만 명시해 둔다.
  'tabata-setup-screen': 'more-screen',
  'tabata-run-screen': 'more-screen',
};

let bar = null;
let ignoreNextPush = false;

/** 라벨을 다시 그린다 — 처음 세울 때, 그리고 언어가 바뀔 때 둘 다 부른다. */
function paintLabels() {
  bar?.setAttribute('aria-label', t(S.navBarLabel));
  bar?.querySelectorAll('.tab').forEach((btn) => {
    const tab = TABS.find((tb) => tb.id === btn.dataset.screen);
    if (!tab) return;
    const label = t(S[tab.labelKey]);
    btn.setAttribute('aria-label', label);
    const span = btn.querySelector('.tab-label');
    if (span) span.textContent = label;
  });
}

function build() {
  bar = document.createElement('nav');
  bar.className = 'tabbar';
  bar.innerHTML = TABS.map(
    (tab) =>
      `<button class="tab" type="button" data-screen="${tab.id}">` +
      `<span class="tab-icon">${ICON[tab.icon]}</span>` +
      `<span class="tab-label"></span></button>`
  ).join('');
  paintLabels();

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    const id = btn.dataset.screen;
    if (document.querySelector('.screen.active')?.id === id) return;
    const tab = TABS.find((tb) => tb.id === id);
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
  const immersive = IMMERSIVE.has(id);
  document.body.classList.toggle('immersive', immersive);
  // 화면 안 꺼지게(2026-09-24 요청, src/core/wakeLock.js) — 운동 중이라
  // 탭바를 감추는 화면과 정확히 같은 판정을 쓴다. 새 운동 화면이 생겨도
  // IMMERSIVE 에만 넣으면 잠금이 자동으로 따라온다.
  if (immersive) keepAwake(); else allowSleep();
}

export function initNav({ translate, STATIC_UI } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) S = STATIC_UI;
  build();

  // 탭바는 build() 때 한 번만 세워지고 그 뒤로는 다시 만들지 않는다(클릭
  // 리스너를 새로 붙이는 것보다 그대로 두고 글자만 바꾸는 것이 안전하다).
  // 언어가 바뀌면 라벨만 새로 칠한다 — 예전엔 TABS 에 한국어를 그대로
  // 박아 둬서 언어를 바꿔도 탭바만 한국어로 남아 있었다(2026-09-15 확인).
  document.addEventListener('qfit:lang', () => paintLabels());

  // 탭바가 실제로 몇 px 인지 재서 --tabbar-h 에 되먹인다.
  //
  // 이 값은 화면들이 "내 아래쪽 몇 px 은 탭바가 덮으니 비워 두자" 로 쓰는
  // 숫자다(.screen 의 padding-bottom). 토큰에 54px 이라고 손으로 적혀
  // 있었는데 실제로는 62px 이었다 — 탭 자체 여백과 윗선이 더해진 것을
  // 안 센 값이다. 8px 이 모자라면 목록 맨 끝 줄이 탭바에 살짝 가리고,
  // 그 줄이 바로 화면이 안 넘어가는 것처럼 보이던 자리다.
  //
  // 손으로 적은 숫자는 글꼴이나 여백을 손대는 순간 또 어긋난다. 재서 쓰면
  // 어긋날 수가 없다. ResizeObserver 라 글자 크기가 바뀌어도 따라온다.
  const bar = document.querySelector('.tabbar');
  if (bar) {
    const sync = () => {
      const h = Math.round(bar.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty('--tabbar-h', h + 'px');
    };
    sync();
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(bar);
  }

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

    // Cindy AMRAP 도 같은 이유로 나가는 대신 멈춘다 — 그냥 나가면 타이머가
    // 계속 돌아서, 돌아왔을 때 몇 라운드가 그냥 지나가 있다.
    if (current === 'amrap-screen' && isAmrapRunning() && !isAmrapPaused()) {
      history.pushState({ s: 'amrap-screen' }, '', '#amrap-screen');
      pauseAmrap();
      return;
    }

    // QCE 서킷도 같은 이유로 멈춘다 — 완주 기록을 재는 스톱워치라 나가면
    // 그동안 계속 흘러서 기록이 부풀어 있다.
    if (current === 'circuit-screen' && isCircuitRunning() && !isCircuitPaused()) {
      history.pushState({ s: 'circuit-screen' }, '', '#circuit-screen');
      pauseCircuit();
      return;
    }

    // '10초 후 시작'도 같은 이유로 멈춘다(circuit-screen 과 같은 스톱워치
    // 구조 — ui/quickStart.js).
    if (current === 'quick-screen' && isQuickRunning() && !isQuickPaused()) {
      history.pushState({ s: 'quick-screen' }, '', '#quick-screen');
      pauseQuick();
      return;
    }

    // 타바타 타이머도 같은 이유로 멈춘다.
    if (current === 'tabata-run-screen' && isTabataRunning() && !isTabataPaused()) {
      history.pushState({ s: 'tabata-run-screen' }, '', '#tabata-run-screen');
      pauseTabata();
      return;
    }

    // 프로그램 상세(예: F45)를 보다가 뒤로가기를 누르면 목록으로 돌아가야
    // 하는데, 상세 보기는 viewingProgramId 만 바뀌는 재렌더라 화면 전환이
    // 안 따라오고 히스토리에도 안 쌓인다 — 그냥 두면 목록을 건너뛰고 그
    // 전 화면(홈)으로 나가 버린다(2026-09-24 발견). 운동 중 화면을 나가는
    // 대신 멈추는 것과 같은 방식으로, 여기서 목록으로만 되돌린다.
    if (current === 'programs-screen' && isViewingProgramDetail()) {
      history.pushState({ s: 'programs-screen' }, '', '#programs-screen');
      backToProgramList();
      return;
    }

    const target = e.state?.s || 'start-screen';
    if (target === current) return;
    ignoreNextPush = true;
    const tab = TABS.find((tb) => tb.id === target);
    const opener = tab?.via && document.querySelector(tab.via);
    if (opener) opener.click();
    else showScreenById(target);
  });

  // 첫 화면을 기록해 둔다. 이게 없으면 첫 뒤로가기가 앱을 나가 버린다.
  const first = document.querySelector('.screen.active')?.id || 'start-screen';
  history.replaceState({ s: first }, '', location.hash || '');
  paint(first);
}
