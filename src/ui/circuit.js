// QCE(Qfit Championship Event) 실전 서킷 전용 화면.
//
// Cindy(ui/amrap.js)와 같은 이유로 공용 미션 엔진(세트 수 × 세트당 초)을
// 못 쓴다. 다만 그 화면과도 모양이 다르다 — 이건 '반복'이 아니라 '한
// 바퀴'다: 8개 스테이션을 순서대로 한 번씩 지나가고, 걸린 시간을 잰다
// (실제 대회의 '완주 기록'과 같은 개념). 그래서 시계는 20분에서 내려가는
// 게 아니라 0초에서 계속 올라간다 — 라운드도, 대체 동작도 없다.
//
// 스테이션마다 목표(예: 45초, 15회)를 보여준다. reps 스테이션은 자동으로
// 세지 않으므로(이 앱은 원래 카메라도 판정도 없다, FR-02) 사람이 보고
// 스스로 하다가 '다음 스테이션'을 눌러 넘긴다. 반면 time 스테이션(제자리
// 달리기·마운틴클라이머)은 목표가 '시간'이라 셀 필요가 없다 — 그래서
// 2026-09-24 부터 카운트다운을 직접 재고 다 되면 클릭 없이 넘어간다.
// '다음 스테이션' 버튼은 reps 스테이션에서만 보인다.

import { EXERCISES } from '../data/exercises.js';
import { EX_TO_GROUP } from '../data/muscle-groups.js';
import { clipThumb, disposeClipThumbs } from './clip-thumb.js';
import { getChallengeIcon } from '../data/challengeIcons.js';
import { loadBody } from '../health/store.js';
import { markProgramDayDone } from './programs.js';
import { recordWorkoutSession } from '../app.js';

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
let stationElapsed = 0; // time 스테이션 안에서 지난 초 — reps 스테이션에서는 안 쓴다
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

  const st = currentStation();
  if (st && st.mode === 'time') {
    stationElapsed++;
    renderStationTarget();
    if (stationElapsed >= st.target) nextStation();
  }
}

function renderClock() {
  const clockEl = el('circuit-clock');
  if (clockEl) clockEl.textContent = fmtClock(elapsedSec);
}

function renderStationTarget() {
  const st = currentStation();
  const targetEl = el('circuit-move-target');
  if (!targetEl || !st) return;
  targetEl.textContent = st.mode === 'time'
    ? t(S.circuitTimeRemain).replace('%s', Math.max(0, st.target - stationElapsed))
    : t(S.amrapRepsLabel).replace('%s', st.target);
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

  renderStationTarget();

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
  if (nextBtn) {
    // time 스테이션은 카운트다운이 다 되면 알아서 넘어간다 — 누를 게 없다.
    nextBtn.hidden = st.mode === 'time';
    nextBtn.textContent = t(isLast ? S.circuitFinishBtn : S.circuitNextBtn);
  }

  const pauseBtn = el('circuit-pause-btn');
  if (pauseBtn) pauseBtn.textContent = t(paused ? S.amrapResumeBtn : S.amrapPauseBtn);
}

function nextStation() {
  if (finished) return;
  if (stationIdx >= stations().length - 1) { finish(); return; }
  stationIdx++;
  stationElapsed = 0;
  render();
}

function estKcal(sts) {
  const weightKg = loadBody().weightKg;
  if (!weightKg) return 0;
  // 결과 화면·plan.js 의 sessionKcal() 과 같은 식(MET × 3.5 × 체중 ÷ 200 ×
  // 분) — 스테이션 기반 서킷이라 그 함수의 '세트 수' 인자에 맞지 않아
  // 직접 적었지만, 상수는 그대로 맞춘다. 중간에 그만뒀을 때(quit())는
  // 끝낸 스테이션만 넘겨 받는다 — 안 한 것까지 평균에 넣으면 부풀어진다.
  sts = sts || stations();
  const avgMet = sts.reduce((s, st) => s + ((EX_BY_KEY[st.key] || {}).met || st.met || 5), 0) / (sts.length || 1);
  const minutes = elapsedSec / 60;
  return Math.max(1, Math.round((avgMet * 3.5 * weightKg) / 200 * minutes));
}

// 끝낸 스테이션 목록에서 부위별 세트 수를 만든다. 완주(finish, 8개 전부)든
// 중간에 그만뒀을 때(quit, stationIdx 개)든 이 함수 하나로 만든다.
function groupsFor(list) {
  const g = {};
  list.forEach((st) => {
    const grp = EX_TO_GROUP[st.key];
    if (grp) g[grp] = (g[grp] || 0) + 1;
  });
  return g;
}

function finish() {
  if (finished) return;
  finished = true;
  paused = true;
  stopTimer();
  markProgramDayDone(program.id, dayIndex);
  try {
    recordWorkoutSession({ groups: groupsFor(stations()), seconds: elapsedSec, calories: estKcal(), xp: 20 });
  } catch (e) { console.error('circuit record failed:', e); }
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
  // 스테이션을 하나라도 끝냈으면 그만큼은 기록에 남는다(2026-09-24).
  const msg = stationIdx > 0 ? S.quitConfirmSaved : S.amrapQuitConfirm;
  if (!confirm(t(msg))) return;
  if (stationIdx > 0) {
    try {
      const done = stations().slice(0, stationIdx);
      recordWorkoutSession({ groups: groupsFor(done), seconds: elapsedSec, calories: estKcal(done), xp: 20 });
    } catch (e) { console.error('circuit partial quit record failed:', e); }
  }
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
  stationElapsed = 0;
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
