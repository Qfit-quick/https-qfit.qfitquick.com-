// 어르신·재활 모드(2026-09-27) — recovery-screen 의 "노인을 위한 운동"
// 카드에 있던 정적 문구 4줄을, 느린 템포·의자 동작 픽트그램·큰 글씨가
// 실제로 적용되는 진짜 운동 모드로 넓힌다.
//
// src/ui/quickStart.js 와 같은 모양의 자체 엔진이다(영상 없는 동작
// 카탈로그를 타이머로 돌리는 화면) — 다만 그보다 더 단순하게 줄였다:
// 난이도 선택 없음, 라운드마다 길어지는 성장 없음(느린 템포가 핵심이라
// 전부 고정 시간), 휴식 꾹 누르기 인증도 없음(손이 불편한 사람에게
// 그 조작 자체가 장벽이다). 대신 동작마다 픽트그램(seniorPictograms.js)
// 을 큰 글씨 옆에 보여준다 — 영상이 없는 자리를 그림으로 채운다.
import { SENIOR_EXERCISES, SENIOR_EXERCISE_DURATION_SEC, SENIOR_REST_DURATION_SEC } from '../data/seniorExercises.js';
import { seniorPictogramMarkup } from './seniorPictograms.js';
import { Sound } from '../audio/sound.js';
import { loadBody } from '../health/store.js';
import { speakExercise, recordWorkoutSession } from '../app.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let onShowScreen = () => {};

const el = (id) => document.getElementById(id);

let idx = 0;
let elapsedSec = 0; // 전체 경과(휴식 포함, 칼로리·기록용)
let phaseElapsed = 0; // 지금 동작/휴식 안에서 흐른 초
let resting = false;
let paused = true;
let finished = false;
let running = false;
let timerId = null;

function current() { return SENIOR_EXERCISES[idx]; }

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

function paintMoveOrRest() {
  const moveGroup = el('senior-move-group');
  const restGroup = el('senior-rest-group');
  if (moveGroup) moveGroup.hidden = resting;
  if (restGroup) restGroup.hidden = !resting;
}

function render() {
  const clockEl = el('senior-clock');
  if (clockEl) clockEl.textContent = fmtClock(elapsedSec);
  const progEl = el('senior-progress');
  if (progEl) progEl.textContent = t(S.circuitProgressFmt).replace('%s', idx + 1).replace('%s', SENIOR_EXERCISES.length);

  paintMoveOrRest();

  if (!resting) {
    const ex = current();
    if (ex) {
      const pic = el('senior-pictogram');
      if (pic) pic.innerHTML = seniorPictogramMarkup(ex.pictogram);
      const nameEl = el('senior-move-name');
      if (nameEl) nameEl.textContent = t(ex.name);
      const cueEl = el('senior-move-cue');
      if (cueEl) cueEl.textContent = t(ex.cue);
      const remain = Math.max(0, SENIOR_EXERCISE_DURATION_SEC - phaseElapsed);
      const timerEl = el('senior-move-timer');
      if (timerEl) timerEl.textContent = remain + t(S.secUnit);
    }
    const isLast = idx >= SENIOR_EXERCISES.length - 1;
    const nextBtn = el('senior-next-btn');
    if (nextBtn) nextBtn.textContent = t(isLast ? S.circuitFinishBtn : S.circuitNextBtn);
  } else {
    const remain = Math.max(0, SENIOR_REST_DURATION_SEC - phaseElapsed);
    const restEl = el('senior-rest-num');
    if (restEl) restEl.textContent = String(remain);
  }

  const pauseBtn = el('senior-pause-btn');
  if (pauseBtn) pauseBtn.textContent = t(paused ? S.amrapResumeBtn : S.amrapPauseBtn);
}

function beginExercise() {
  resting = false;
  phaseElapsed = 0;
  render();
  const ex = current();
  if (ex) speakExercise(t(ex.name), null);
}

function beginRest() {
  resting = true;
  phaseElapsed = 0;
  render();
}

// 동작이든 휴식이든 다 됐을 때(타이머가 0 이 됐거나 건너뛰기를 눌렀을 때)
// 공통으로 지난다 — quickStart.js 의 advance() 와 같은 모양.
function advance() {
  if (!resting) {
    if (idx >= SENIOR_EXERCISES.length - 1) { finish(); return; }
    beginRest();
    return;
  }
  idx++;
  beginExercise();
}

function tick() {
  if (paused || finished) return;
  elapsedSec++;
  phaseElapsed++;
  const limit = resting ? SENIOR_REST_DURATION_SEC : SENIOR_EXERCISE_DURATION_SEC;
  render();
  if (phaseElapsed >= limit) advance();
}

// 운동 중 사진이 없어(영상도 없다, 머리 설명 참고) 체중 기반 MET 표를 못
// 쓴다 — quickStart.js 와 같은 이유로 저강도 고정값(MET 2.5, 걷기 이하
// 수준)으로 어림한다. 이 모드는 칼로리보다 "끝까지 했다"가 더 중요하다.
const FALLBACK_MET = 2.5;
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
  resting = false;
  stopTimer();
  // 이 표의 동작은 src/data/exercises.js 밖이라 부위별 groups 는 못
  // 만든다(quickStart.js 와 같은 사정) — 시간·칼로리만 기록에 남긴다.
  try {
    recordWorkoutSession({ groups: {}, seconds: elapsedSec, calories: estKcal(loadBody().weightKg), xp: 15 });
  } catch (e) { console.error('seniorMode record failed:', e); }
  renderDone();
}

function renderDone() {
  const run = el('senior-run');
  const done = el('senior-done');
  if (run) run.hidden = true;
  if (done) done.hidden = false;
  const timeEl = el('senior-done-time');
  if (timeEl) timeEl.textContent = t(S.circuitDoneTime).replace('%s', fmtClock(elapsedSec));
}

function togglePause() {
  if (finished) return;
  paused = !paused;
  render();
}

function quit() {
  if (!confirm(t(idx > 0 || resting ? S.quitConfirmSaved : S.amrapQuitConfirm))) return;
  if (idx > 0 || resting) {
    try {
      recordWorkoutSession({ groups: {}, seconds: elapsedSec, calories: estKcal(loadBody().weightKg), xp: 15 });
    } catch (e) { console.error('seniorMode partial quit record failed:', e); }
  }
  stopTimer();
  running = false;
  onShowScreen('recovery-screen');
}

/** 회복 화면의 "어르신·재활 모드 시작" 버튼이 부른다. */
export function startSeniorMode() {
  Sound.unlock();
  idx = 0;
  elapsedSec = 0;
  phaseElapsed = 0;
  resting = false;
  finished = false;
  paused = false;
  running = true;

  const runEl = el('senior-run');
  const doneEl = el('senior-done');
  if (runEl) runEl.hidden = false;
  if (doneEl) doneEl.hidden = true;

  onShowScreen('senior-run-screen');
  beginExercise();
  stopTimer();
  timerId = setInterval(tick, 1000);
}

export function isSeniorModeRunning() { return running && !finished; }
export function isSeniorModePaused() { return paused; }
export function pauseSeniorMode() { if (running && !finished && !paused) togglePause(); }

export function initSeniorMode({ translate, STATIC_UI, onShowScreen: showFn } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (showFn) onShowScreen = showFn;

  // 시작 버튼은 recovery-screen 안에서 app.js 가 데이터로 그린다(언어가
  // 바뀌면 다시 그려진다) — 한 번만 붙이면 다시 그려진 뒤엔 못 잡으므로,
  // 절대 다시 안 그려지는 recovery-screen 자체에 위임해 둔다.
  document.getElementById('recovery-screen')?.addEventListener('click', (e) => {
    if (e.target.closest('#senior-mode-start-btn')) startSeniorMode();
  });

  el('senior-back-btn')?.addEventListener('click', () => {
    if (!finished) { pauseSeniorMode(); return; }
    onShowScreen('recovery-screen');
  });
  el('senior-next-btn')?.addEventListener('click', () => {
    if (finished) return;
    advance();
  });
  el('senior-pause-btn')?.addEventListener('click', togglePause);
  el('senior-quit-btn')?.addEventListener('click', quit);
  // 쉬는 시간도 quickStart.js 처럼 눌러서 바로 건너뛸 수 있다 — 다만 꾹
  // 누르는 인증(번개)은 없다(머리 설명 참고, 손이 불편한 사람에게 그
  // 조작 자체가 장벽이라 뺐다). 그냥 한 번 누르면 넘어간다.
  el('senior-rest-group')?.addEventListener('click', () => { if (resting) advance(); });
  el('senior-done-ok-btn')?.addEventListener('click', () => {
    stopTimer();
    running = false;
    onShowScreen('recovery-screen');
  });
}
