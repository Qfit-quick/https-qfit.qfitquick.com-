// '스파이더맨 Cindy' 전용 AMRAP(정해진 시간 안에 최대한 많이) 세션 화면.
//
// 이 앱의 다른 모든 운동은 하나의 엔진(app.js 의 미션 게임)을 쓴다 —
// '세트 수 × 세트당 초' 로 뽑힌 동작을 순서대로 도는 구조다. Cindy 는
// 모양이 다르다: 정해진 세 동작(풀업 5·푸쉬업 10·스쿼트 15)을 정확한
// 반복수로 20분 동안 몇 바퀴 도는지가 전부라, 세트·초 기반 엔진에
// 끼워 맞추면 반복수도 시간 상한도 표현할 수 없다. 그래서 이 화면은
// 완전히 따로 두고 타이머·바퀴 수·동작 전환을 직접 관리한다.
//
// 반복수는 사람이 스스로 센다 — 이 앱은 원래 카메라도 판정도 없다
// (FR-02, app.js 의 showRemain 주석과 같은 전제). 화면은 목표 반복수만
// 보여주고, 다 하면 사람이 '다음 동작'을 눌러 넘긴다.

import { CINDY_MOVES } from '../data/programs.js';
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

let program = null;
let dayIndex = 0;
let capSec = 20 * 60;
let remainSec = capSec;
let round = 0; // 완료한 바퀴 수
let moveIdx = 0; // 이번 바퀴에서 지금 몇 번째 동작인지
let subPullup = false; // 철봉 없음 → 남은 시간 동안 버피로 대체
let timerId = null;
let paused = true;
let finished = false;

function moves() {
  return (program && program.amrap && program.amrap.moves) || CINDY_MOVES;
}

// 지금 보여줄 동작. 풀업 차례인데 대체를 켰으면 버피로 바꿔 보여준다 —
// reps 목표(5회)는 그대로 두고 동작만 바뀐다. 원본(sub 필드)을 찾을 때는
// 대체 여부와 무관하게 항상 필요하므로 baseMove() 로 따로 둔다.
function baseMove() {
  return moves()[moveIdx];
}
function displayKey(m) {
  return m.key === 'PULLUP' && subPullup ? m.sub : m.key;
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
  remainSec = Math.max(0, remainSec - 1);
  renderClock();
  if (remainSec <= 0) finish();
}

function renderClock() {
  const clockEl = el('amrap-clock');
  if (clockEl) clockEl.textContent = fmtClock(remainSec);
}

function render() {
  if (finished) { renderDone(); return; }

  const run = el('amrap-run');
  const done = el('amrap-done');
  if (run) run.hidden = false;
  if (done) done.hidden = true;

  const m = baseMove();
  const key = displayKey(m);
  const ex = EX_BY_KEY[key];

  renderClock();
  const roundEl = el('amrap-round');
  if (roundEl) roundEl.textContent = String(round);

  const nameEl = el('amrap-move-name');
  if (nameEl) nameEl.textContent = t((key === m.key ? m.label : null) || (ex && ex.label) || m.label);

  const repsEl = el('amrap-move-reps');
  if (repsEl) repsEl.textContent = t(S.amrapRepsLabel).replace('%s', m.reps);

  const shot = el('amrap-move-shot');
  if (shot) {
    disposeClipThumbs(shot);
    shot.innerHTML = '';
    if (key === 'PULLUP') {
      shot.innerHTML = getChallengeIcon('pull');
    } else {
      const thumb = clipThumb(key);
      if (thumb) shot.appendChild(thumb);
    }
  }

  const subBtn = el('amrap-sub-btn');
  if (subBtn) subBtn.hidden = !(m.key === 'PULLUP' && m.sub && !subPullup);

  const pauseBtn = el('amrap-pause-btn');
  if (pauseBtn) pauseBtn.textContent = t(paused ? S.amrapResumeBtn : S.amrapPauseBtn);
}

function nextMove() {
  if (finished) return;
  moveIdx++;
  if (moveIdx >= moves().length) {
    moveIdx = 0;
    round++;
  }
  render();
}

function estKcal() {
  const weightKg = loadBody().weightKg;
  if (!weightKg) return 0;
  // 결과 화면·plan.js 의 sessionKcal() 과 같은 식(MET × 3.5 × 체중 ÷ 200 ×
  // 분) — 라운드 수 기반 서킷이라 그 함수의 '세트 수' 인자에 맞지 않아
  // 직접 적었지만, 상수는 그대로 맞춘다.
  const usedKeys = [...new Set(moves().map((m) => displayKey(m)))];
  const avgMet = usedKeys.reduce((s, k) => s + ((EX_BY_KEY[k] || {}).met || 5), 0) / usedKeys.length;
  const elapsedMin = (capSec - remainSec) / 60;
  return Math.max(1, Math.round((avgMet * 3.5 * weightKg) / 200 * elapsedMin));
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
  const run = el('amrap-run');
  const done = el('amrap-done');
  if (run) run.hidden = true;
  if (done) done.hidden = false;
  const roundsEl = el('amrap-done-rounds');
  if (roundsEl) roundsEl.textContent = t(S.amrapDoneRounds).replace('%s', round).replace('%s', moveIdx);
  const kcalEl = el('amrap-done-kcal');
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

/** programs.js 의 '시작하기'가 부른다. program 은 amrap 필드가 있는 PROGRAMS 항목. */
export function startAmrap({ program: p, dayIndex: d }) {
  program = p;
  dayIndex = d;
  capSec = Math.max(60, Math.round((p.amrap.capMin || 20) * 60));
  remainSec = capSec;
  round = 0;
  moveIdx = 0;
  subPullup = false;
  finished = false;
  paused = false;

  const nameEl = el('amrap-title');
  if (nameEl) nameEl.textContent = t(p.name);

  render();
  stopTimer();
  timerId = setInterval(tick, 1000);
  onShowScreen('amrap-screen');
}

export function isAmrapRunning() {
  return !!program && !finished;
}

export function isAmrapPaused() {
  return paused;
}

export function pauseAmrap() {
  if (program && !finished && !paused) togglePause();
}

export function initAmrap({ translate, STATIC_UI, onShowScreen: showFn } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (showFn) onShowScreen = showFn;

  el('amrap-next-btn')?.addEventListener('click', nextMove);
  el('amrap-sub-btn')?.addEventListener('click', () => { subPullup = true; render(); });
  el('amrap-pause-btn')?.addEventListener('click', togglePause);
  el('amrap-quit-btn')?.addEventListener('click', quit);
  el('amrap-back-btn')?.addEventListener('click', () => {
    if (!finished) { pauseAmrap(); return; }
    onShowScreen('programs-screen');
  });
  el('amrap-done-ok-btn')?.addEventListener('click', () => {
    stopTimer();
    onShowScreen('programs-screen');
  });
}
