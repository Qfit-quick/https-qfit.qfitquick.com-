// '10초 후 시작' 전용 화면(2026-09-23, 대규모 교체).
//
// 예전 'AI로 시작하기'(질문 2개 → 추천)를 대신한다. 이제는 질문이 없다 —
// 난이도 4단계(매우 쉬움·쉬움·어려움·매우 어려움) 중 하나를 고르면 10초
// 뒤 곧장 시작한다. 동작은 data/difficultyExercises.js 의 표(사용자가
// 준 xlsx 그대로)에서, 고른 난이도 열의 15개 계열을 순서대로 쓴다.
//
// 공용 미션 엔진(buildMissions → game-screen)을 쓰지 않는 이유: 그 엔진은
// missions 의 모든 동작이 src/data/exercises.js 의 EXERCISES 에 있다고
// 전제한다(시연 영상·운동 중 사진이 거기 다 있어야 한다 —
// scripts/media.mjs 가 그걸 지킨다). 이 표의 동작은 그 24종과 다른
// 카탈로그이고 영상이 아직 없다(사용자가 나중에 준다) — EXERCISES 에
// 넣으면 media 검사가 막혀 배포가 안 된다. 그래서 QCE 서킷(ui/circuit.js)
// 과 같은 모양의, 영상 없이 이름만 보여주는 자체 서킷 화면을 새로 둔다.
import { DIFFICULTY_LEVELS, stationsForLevel } from '../data/difficultyExercises.js';
import { openSheet } from './sheet.js';
import { Sound } from '../audio/sound.js';
import { loadBody } from '../health/store.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let onShowScreen = () => {};

const el = (id) => document.getElementById(id);

const LEVEL_LABEL_KEY = {
  veryEasy: 'quickLevelVeryEasy',
  easy: 'quickLevelEasy',
  hard: 'quickLevelHard',
  veryHard: 'quickLevelVeryHard',
};

let stations = [];
let level = 'easy';
let stationIdx = 0;
let elapsedSec = 0;
let timerId = null;
let countdownId = null;
let paused = true;
let finished = false;
let running = false; // 카운트다운이 끝나고 실제 서킷이 도는 중인가

function currentStation() {
  return stations[stationIdx];
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}
function stopCountdown() {
  if (countdownId) { clearInterval(countdownId); countdownId = null; }
}

function tick() {
  if (paused || finished) return;
  elapsedSec++;
  renderClock();
}

function renderClock() {
  const clockEl = el('quick-clock');
  if (clockEl) clockEl.textContent = fmtClock(elapsedSec);
}

function render() {
  const st = currentStation();
  if (!st) return;

  renderClock();
  const progEl = el('quick-progress');
  if (progEl) progEl.textContent = t(S.circuitProgressFmt).replace('%s', stationIdx + 1).replace('%s', stations.length);

  const familyEl = el('quick-move-family');
  if (familyEl) familyEl.textContent = st.family;
  const nameEl = el('quick-move-name');
  if (nameEl) nameEl.textContent = st.name;

  const isLast = stationIdx >= stations.length - 1;
  const nextBtn = el('quick-next-btn');
  if (nextBtn) nextBtn.textContent = t(isLast ? S.circuitFinishBtn : S.circuitNextBtn);

  const pauseBtn = el('quick-pause-btn');
  if (pauseBtn) pauseBtn.textContent = t(paused ? S.amrapResumeBtn : S.amrapPauseBtn);
}

function nextStation() {
  if (finished) return;
  if (stationIdx >= stations.length - 1) { finish(); return; }
  stationIdx++;
  render();
}

// 운동 중 사진이 없어 체중 기반 MET 추정을 할 표가 없다 — 칼로리 계산에
// 쓰는 건강 데이터(store.js)를 이 화면까지 끌어오지 않고, 보통 강도
// 칼리스테닉스 값(MET 5, circuit.js 의 기본 폴백과 같다)으로 어림한다.
const FALLBACK_MET = 5;
function estKcal(weightKg) {
  if (!weightKg) return 0;
  const minutes = elapsedSec / 60;
  return Math.max(1, Math.round((FALLBACK_MET * 3.5 * weightKg) / 200 * minutes));
}

function finish() {
  if (finished) return;
  finished = true;
  paused = true;
  running = false;
  stopTimer();
  renderDone();
}

function renderDone() {
  const run = el('quick-run');
  const done = el('quick-done');
  if (run) run.hidden = true;
  if (done) done.hidden = false;
  const timeEl = el('quick-done-time');
  if (timeEl) timeEl.textContent = t(S.circuitDoneTime).replace('%s', fmtClock(elapsedSec));
  const kcalEl = el('quick-done-kcal');
  const kcal = estKcal(loadBody().weightKg);
  // 체중을 아직 안 넣은 사람은 0 이다 — '약 0kcal 소모' 는 계산이 됐다는
  // 거짓 인상을 준다.
  if (kcalEl) kcalEl.hidden = !kcal;
  if (kcalEl && kcal) kcalEl.textContent = t(S.amrapDoneKcal).replace('%s', kcal);
}

function togglePause() {
  if (finished) return;
  paused = !paused;
  render();
}

function quit() {
  if (!confirm(t(S.amrapQuitConfirm))) return;
  stopTimer();
  running = false;
  onShowScreen('start-screen');
}

function beginRun() {
  const runEl = el('quick-run');
  const cdEl = el('quick-countdown');
  const headEl = el('quick-head');
  if (cdEl) cdEl.hidden = true;
  if (headEl) headEl.hidden = false;
  if (runEl) runEl.hidden = false;
  const doneEl = el('quick-done');
  if (doneEl) doneEl.hidden = true;

  stationIdx = 0;
  elapsedSec = 0;
  finished = false;
  paused = false;
  running = true;

  const titleEl = el('quick-title');
  if (titleEl) titleEl.textContent = t(S[LEVEL_LABEL_KEY[level]]);

  render();
  stopTimer();
  timerId = setInterval(tick, 1000);
}

const COUNTDOWN_SEC = 10;

/** 홈의 난이도 시트에서 고른 뒤 부른다. */
export function startQuickSession(pickedLevel) {
  level = DIFFICULTY_LEVELS.includes(pickedLevel) ? pickedLevel : 'easy';
  stations = stationsForLevel(level);
  finished = false;
  running = false;

  const cdEl = el('quick-countdown');
  const headEl = el('quick-head');
  const runEl = el('quick-run');
  const doneEl = el('quick-done');
  if (cdEl) cdEl.hidden = false;
  if (headEl) headEl.hidden = true;
  if (runEl) runEl.hidden = true;
  if (doneEl) doneEl.hidden = true;

  const levelEl = el('quick-countdown-level');
  if (levelEl) levelEl.textContent = t(S[LEVEL_LABEL_KEY[level]]);

  onShowScreen('quick-screen');

  stopCountdown();
  let n = COUNTDOWN_SEC;
  const numEl = el('quick-countdown-num');
  if (numEl) numEl.textContent = n;
  Sound.countBeep(n > 3 ? 1 : n); // 10초짜리라 처음부터 매초 울리면 시끄럽다 — 3 이하부터 실제 숫자로 비프
  countdownId = setInterval(() => {
    n--;
    if (n <= 0) {
      stopCountdown();
      Sound.countBeep(0);
      beginRun();
      return;
    }
    if (numEl) numEl.textContent = n;
    if (n <= 3) Sound.countBeep(n);
  }, 1000);
}

function cancelCountdown() {
  stopCountdown();
  onShowScreen('start-screen');
}

export function isQuickRunning() {
  return running && !finished;
}
export function isQuickPaused() {
  return paused;
}
export function pauseQuick() {
  if (running && !finished && !paused) togglePause();
}

export function initQuickStart({ translate, STATIC_UI, onShowScreen: showFn } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (showFn) onShowScreen = showFn;

  const modeQuickBtn = el('mode-quick-btn');
  const quickLevelPanel = el('quick-level-panel');
  if (modeQuickBtn && quickLevelPanel) {
    modeQuickBtn.addEventListener('click', () => {
      Sound.unlock();
      openSheet(quickLevelPanel, { title: t(S.quickLevelSheetTitle), from: modeQuickBtn });
    });
  }
  // closeSheet() 를 직접 부르지 않는다 — openSheet()/onShowScreen() 를
  // 그대로 잇는다. 시트가 열린 채로 다음 화면을 부르면 nav.js 의
  // screenchange 리스너가 알아서 keepHistory 로 닫아 준다. 여기서 먼저
  // 닫으면 그 닫기의 history.back() 이 비동기라 뒤이은 화면 전환의
  // history.pushState() 보다 늦게 도착해, 엉뚱한 칸을 밀어낸다
  // (ui/sheet.js openSheet() 의 2026-09-22 발견 주석과 같은 문제).
  quickLevelPanel?.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Sound.unlock();
      startQuickSession(btn.dataset.level);
    });
  });

  el('quick-countdown-cancel-btn')?.addEventListener('click', cancelCountdown);
  el('quick-next-btn')?.addEventListener('click', nextStation);
  el('quick-pause-btn')?.addEventListener('click', togglePause);
  el('quick-quit-btn')?.addEventListener('click', quit);
  el('quick-back-btn')?.addEventListener('click', () => {
    if (!finished) { pauseQuick(); return; }
    onShowScreen('start-screen');
  });
  el('quick-done-ok-btn')?.addEventListener('click', () => {
    stopTimer();
    running = false;
    onShowScreen('start-screen');
  });
}
