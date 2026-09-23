// QCE(Qfit Championship Event) 실전 서킷 전용 화면.
//
// Cindy(ui/amrap.js)와 같은 이유로 공용 미션 엔진(세트 수 × 세트당 초)을
// 못 쓴다. 다만 그 화면과도 모양이 다르다 — 이건 '반복'이 아니라 '한
// 바퀴'다: 8개 스테이션을 순서대로 한 번씩 지나가고, 걸린 시간을 잰다
// (실제 대회의 '완주 기록'과 같은 개념). 그래서 시계는 20분에서 내려가는
// 게 아니라 0초에서 계속 올라간다 — 라운드도, 대체 동작도 없다.
//
// 스테이션마다 목표(예: 45초, 15회)를 보여주지만 자동으로 재거나 세지
// 않는다 — 이 앱은 원래 카메라도 판정도 없다(FR-02). 사람이 목표를 보고
// 스스로 하다가 '다음 스테이션'을 눌러 넘긴다.

import { EXERCISES } from '../data/exercises.js';
import { clipThumb, disposeClipThumbs } from './clip-thumb.js';
import { getChallengeIcon } from '../data/challengeIcons.js';
import { loadBody } from '../health/store.js';
import { markProgramDayDone } from './programs.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let onShowScreen = () => {};

const EX_BY_KEY = Object.fromEntries(EXERCISES.map((e) => [e.key, e]));
const el = (id) => document.getElementById(id);

// PLANKJACK·JUMPLUNGE 는 EXERCISES 에 없어(시연 영상이 없어서 —
// programs.js 의 QCE_STATIONS 주석 참고) 영상 대신 이 픽토그램을 쓴다.
const NO_VIDEO_ICON = { PLANKJACK: 'plank', JUMPLUNGE: 'lungeJump' };

let program = null;
let dayIndex = 0;
let stationIdx = 0;
let elapsedSec = 0;
let timerId = null;
let paused = true;
let finished = false;

function stations() {
  return (program && program.circuit && program.circuit.stations) || [];
}
function currentStation() {
  return stations()[stationIdx];
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}

function tick() {
  if (paused || finished) return;
  elapsedSec++;
  renderClock();
}

function renderClock() {
  const clockEl = el('circuit-clock');
  if (clockEl) clockEl.textContent = fmtClock(elapsedSec);
}

function render() {
  if (finished) { renderDone(); return; }

  const run = el('circuit-run');
  const done = el('circuit-done');
  if (run) run.hidden = false;
  if (done) done.hidden = true;

  const st = currentStation();
  const ex = EX_BY_KEY[st.key];

  renderClock();
  const progEl = el('circuit-progress');
  if (progEl) progEl.textContent = t(S.circuitProgressFmt).replace('%s', stationIdx + 1).replace('%s', stations().length);

  const nameEl = el('circuit-move-name');
  if (nameEl) nameEl.textContent = t((ex && ex.label) || st.label || { ko: st.key });

  const targetEl = el('circuit-move-target');
  if (targetEl) {
    targetEl.textContent = st.mode === 'time'
      ? t(S.circuitTimeTarget).replace('%s', st.target)
      : t(S.amrapRepsLabel).replace('%s', st.target);
  }

  const shot = el('circuit-move-shot');
  if (shot) {
    disposeClipThumbs(shot);
    shot.innerHTML = '';
    if (NO_VIDEO_ICON[st.key]) {
      shot.innerHTML = getChallengeIcon(NO_VIDEO_ICON[st.key]);
    } else {
      const thumb = clipThumb(st.key);
      if (thumb) shot.appendChild(thumb);
    }
  }

  const isLast = stationIdx >= stations().length - 1;
  const nextBtn = el('circuit-next-btn');
  if (nextBtn) nextBtn.textContent = t(isLast ? S.circuitFinishBtn : S.circuitNextBtn);

  const pauseBtn = el('circuit-pause-btn');
  if (pauseBtn) pauseBtn.textContent = t(paused ? S.amrapResumeBtn : S.amrapPauseBtn);
}

function nextStation() {
  if (finished) return;
  if (stationIdx >= stations().length - 1) { finish(); return; }
  stationIdx++;
  render();
}

function estKcal() {
  const weightKg = loadBody().weightKg;
  if (!weightKg) return 0;
  // 결과 화면·plan.js 의 sessionKcal() 과 같은 식(MET × 3.5 × 체중 ÷ 200 ×
  // 분) — 스테이션 기반 서킷이라 그 함수의 '세트 수' 인자에 맞지 않아
  // 직접 적었지만, 상수는 그대로 맞춘다.
  const sts = stations();
  const avgMet = sts.reduce((s, st) => s + ((EX_BY_KEY[st.key] || {}).met || st.met || 5), 0) / (sts.length || 1);
  const minutes = elapsedSec / 60;
  return Math.max(1, Math.round((avgMet * 3.5 * weightKg) / 200 * minutes));
}

function finish() {
  if (finished) return;
  finished = true;
  paused = true;
  stopTimer();
  markProgramDayDone(program.id, dayIndex);
  render();
}

function renderDone() {
  const run = el('circuit-run');
  const done = el('circuit-done');
  if (run) run.hidden = true;
  if (done) done.hidden = false;
  const timeEl = el('circuit-done-time');
  if (timeEl) timeEl.textContent = t(S.circuitDoneTime).replace('%s', fmtClock(elapsedSec));
  const kcalEl = el('circuit-done-kcal');
  if (kcalEl) kcalEl.textContent = t(S.amrapDoneKcal).replace('%s', estKcal());
}

function quit() {
  if (!confirm(t(S.amrapQuitConfirm))) return;
  stopTimer();
  onShowScreen('programs-screen');
}

function togglePause() {
  if (finished) return;
  paused = !paused;
  render();
}

/** programs.js 의 '시작하기'가 부른다. program 은 circuit 필드가 있는 PROGRAMS 항목. */
export function startCircuit({ program: p, dayIndex: d }) {
  program = p;
  dayIndex = d;
  stationIdx = 0;
  elapsedSec = 0;
  finished = false;
  paused = false;

  const nameEl = el('circuit-title');
  if (nameEl) nameEl.textContent = t(p.name);

  render();
  stopTimer();
  timerId = setInterval(tick, 1000);
  onShowScreen('circuit-screen');
}

export function isCircuitRunning() {
  return !!program && !finished;
}

export function isCircuitPaused() {
  return paused;
}

export function pauseCircuit() {
  if (program && !finished && !paused) togglePause();
}

export function initCircuit({ translate, STATIC_UI, onShowScreen: showFn } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (showFn) onShowScreen = showFn;

  el('circuit-next-btn')?.addEventListener('click', nextStation);
  el('circuit-pause-btn')?.addEventListener('click', togglePause);
  el('circuit-quit-btn')?.addEventListener('click', quit);
  el('circuit-back-btn')?.addEventListener('click', () => {
    if (!finished) { pauseCircuit(); return; }
    onShowScreen('programs-screen');
  });
  el('circuit-done-ok-btn')?.addEventListener('click', () => {
    stopTimer();
    onShowScreen('programs-screen');
  });
}
