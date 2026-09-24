// 타바타 타이머(2026-09-24 되살림).
//
// src/ 개편(a62f95f) 때 소스 없이 사라졌던 기능이다 — 그 직전 배포 번들
// (assets/index-BakHmDb3.js, 커밋 a62f95f^) 을 읽어 로직을 그대로 옮겼다.
// 운동 목록과 무관한 순수 운동·휴식 반복 타이머다: 운동 시간·휴식 시간·
// 라운드 수 셋만 정하면, 그 뒤로는 사람이 아무것도 누를 필요가 없다
// (건너뛰기는 옵션일 뿐 — 2026-09-24 요청, "다음 눌러야 넘어가는 거
// 다 없애라"). 화면 안 꺼짐은 여기서 따로 안 챙긴다 — ui/nav.js 가
// IMMERSIVE 판정으로 모든 운동 화면에 한 번에 건다(core/wakeLock.js).
import { Sound } from '../audio/sound.js';
import { speakExercise, speakTip, recordWorkoutSession } from '../app.js';
import { loadBody } from '../health/store.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let onShowScreen = () => {};

const el = (id) => document.getElementById(id);

const RING_R = 54;
const RING_CIRC = 2 * Math.PI * RING_R;
const PRESTART_SEC = 3;

let workSec = 20;
let restSec = 10;
let totalRounds = 8;
let round = 1;
let phase = 'work'; // 'work' | 'rest'
let phaseDurationMs = 0;
let phaseTargetAt = 0; // Date.now() 기준 이 시점에 이번 phase 가 끝난다
let halfAnnounced = false;
let beepedAt = new Set(); // 이번 phase 안에서 3·2·1 을 이미 말했는지
let paused = false;
let pausedAt = 0;
let finished = false;
let running = false;
let timerId = null;
let countdownId = null;
// 기록용 실제 경과 시간(2026-09-24) — 운동/휴식 phase 는 목표 종료 시각
// 기준이라 초를 따로 세지 않는다. 일시정지한 시간은 빼야 하므로
// 세션 시작 시각에서 지금까지 멈췄던 총 시간을 뺀다.
let sessionStartAt = 0;
let pausedMs = 0;

function fmtMin(totalSec) {
  return Math.round(totalSec / 6) / 10; // 분 단위, 소수 1자리
}

function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}
function stopCountdown() {
  if (countdownId) { clearInterval(countdownId); countdownId = null; }
}

function readSetupInputs() {
  const w = parseInt(el('tabata-work-value')?.value, 10);
  const r = parseInt(el('tabata-rest-value')?.value, 10);
  const n = parseInt(el('tabata-rounds-value')?.value, 10);
  workSec = Number.isFinite(w) ? Math.max(1, Math.min(600, w)) : 20;
  restSec = Number.isFinite(r) ? Math.max(0, Math.min(600, r)) : 10;
  totalRounds = Number.isFinite(n) ? Math.max(1, Math.min(99, n)) : 8;
}

// readSetupInputs() 가 채우는 workSec/restSec/totalRounds 는 '시작'을
// 누른 시점의 값이다 — 설정 화면에서 -/+ 를 누르는 동안 그 값을 그대로
// 쓰면(아직 안 눌렀으니) 총 소요 시간 안내가 입력칸과 따로 논다. 그래서
// 여기서는 항상 입력칸을 직접 다시 읽는다.
function renderSetup() {
  const w = parseInt(el('tabata-work-value')?.value, 10) || 0;
  const r = parseInt(el('tabata-rest-value')?.value, 10) || 0;
  const n = parseInt(el('tabata-rounds-value')?.value, 10) || 0;
  const totalSec = w * n + r * Math.max(0, n - 1);
  const hintEl = el('tabata-total-hint');
  if (hintEl) hintEl.textContent = t(S.tabataTotalHint).replace('%s', fmtMin(totalSec));
}

function bindStepper(valueId, minusId, plusId, min, max) {
  const input = el(valueId);
  const minus = el(minusId);
  const plus = el(plusId);
  if (!input) return;
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const step = (delta) => {
    const now = parseInt(input.value, 10);
    input.value = clamp((Number.isFinite(now) ? now : min) + delta);
    renderSetup();
  };
  minus?.addEventListener('click', () => step(-1));
  plus?.addEventListener('click', () => step(1));
  input.addEventListener('input', renderSetup);
  input.addEventListener('blur', () => {
    const now = parseInt(input.value, 10);
    input.value = clamp(Number.isFinite(now) ? now : min);
    renderSetup();
  });
}

function renderRing(elapsedMs, durationMs) {
  const ringProg = el('tabata-ring-prog');
  if (!ringProg) return;
  const pct = durationMs > 0 ? Math.min(1, Math.max(0, elapsedMs / durationMs)) : 0;
  ringProg.style.strokeDasharray = RING_CIRC;
  ringProg.style.strokeDashoffset = RING_CIRC * pct;
}

function renderPhase(remainSec) {
  const numEl = el('tabata-time-num');
  if (numEl) numEl.textContent = String(Math.max(0, remainSec)) + t(S.secUnit);
  const labelEl = el('tabata-phase-label');
  if (labelEl) {
    labelEl.textContent = t(phase === 'work' ? S.tabataPhaseWork : S.tabataPhaseRest);
    labelEl.classList.toggle('rest', phase === 'rest');
  }
  const roundEl = el('tabata-round-label');
  if (roundEl) roundEl.textContent = round + ' / ' + totalRounds;
  const skipBtn = el('tabata-skip-btn');
  if (skipBtn) skipBtn.textContent = t(phase === 'work' ? S.tabataSkipWorkBtn : S.tabataSkipRestBtn);
  const pauseBtn = el('tabata-pause-btn');
  if (pauseBtn) pauseBtn.textContent = t(paused ? S.amrapResumeBtn : S.amrapPauseBtn);
}

// 새 phase(운동/휴식)를 시작한다. 목표 종료 시각(phaseTargetAt)을 기준으로
// tick() 이 남은 시간을 계산한다 — 타이머 드리프트에도 실제 벽시계
// 기준으로 정확하다(공용 미션 엔진의 elapsed++ 방식과 다르게, 원래 이
// 기능이 쓰던 방식을 그대로 살렸다).
function startPhase(nextPhase) {
  phase = nextPhase;
  const durationSec = phase === 'work' ? workSec : restSec;
  phaseDurationMs = durationSec * 1000;
  phaseTargetAt = Date.now() + phaseDurationMs;
  halfAnnounced = false;
  beepedAt = new Set();
  renderPhase(durationSec);
  renderRing(0, phaseDurationMs);
  if (phase === 'work') speakExercise(t(S.tabataRoundAnnounce).replace('%s', round), null);
}

// work 든 rest 든, phase 하나가 다 됐을 때(타이머가 0 이 됐거나 건너뛰기를
// 눌렀을 때) 공통으로 지난다.
function onPhaseDone() {
  if (phase === 'work' && round < totalRounds && restSec > 0) {
    startPhase('rest');
  } else {
    advanceRound();
  }
}

function advanceRound() {
  if (round >= totalRounds) { finish(); return; }
  round++;
  startPhase('work');
}

function tick() {
  if (paused || finished) return;
  const remainMs = phaseTargetAt - Date.now();
  const remainSec = Math.ceil(Math.max(0, remainMs) / 1000);
  renderPhase(remainSec);
  renderRing(phaseDurationMs - Math.max(0, remainMs), phaseDurationMs);

  // 운동 phase 의 절반 지점 — 공용 미션 엔진의 speakTip(45%) 자리와 같은
  // 뜻으로, 원래 이 기능은 '절반!' 을 그 자리에 말했다.
  if (phase === 'work' && !halfAnnounced && phaseDurationMs > 0 && remainMs <= phaseDurationMs / 2) {
    halfAnnounced = true;
    speakTip(t(S.tabataHalfAnnounce));
  }
  // 마지막 3초 — 숫자를 그대로 말하고 비프도 같이 울린다.
  if (remainSec <= 3 && remainSec >= 1 && !beepedAt.has(remainSec)) {
    beepedAt.add(remainSec);
    speakTip(String(remainSec));
    Sound.countBeep(remainSec);
  }
  if (remainMs <= 0) onPhaseDone();
}

function finish() {
  if (finished) return;
  finished = true;
  paused = false;
  running = false;
  stopTimer();
  Sound.fanfare();
  speakTip(t(S.tabataGreatJob));
  try {
    const seconds = sessionElapsedSec();
    recordWorkoutSession({ groups: {}, seconds, calories: estKcal(seconds), xp: 20 });
  } catch (e) { console.error('tabata record failed:', e); }
  renderDone();
}

function renderDone() {
  const run = el('tabata-run');
  const head = el('tabata-head');
  const done = el('tabata-done');
  if (run) run.hidden = true;
  if (head) head.hidden = true;
  if (done) done.hidden = false;
}

function togglePause() {
  if (finished) return;
  paused = !paused;
  if (paused) {
    pausedAt = Date.now();
  } else if (pausedAt) {
    const gapMs = Date.now() - pausedAt;
    phaseTargetAt += gapMs;
    pausedMs += gapMs;
    pausedAt = 0;
  }
  renderPhase(Math.ceil(Math.max(0, phaseTargetAt - Date.now()) / 1000));
}

// 운동 목록과 무관한 순수 인터벌이라 부위별 MET 표가 없다 — quickStart.js
// 의 같은 문제와 같은 답(보통 강도 칼리스테닉스 값으로 어림).
const FALLBACK_MET = 5;
function sessionElapsedSec() {
  if (!sessionStartAt) return 0;
  return Math.max(0, Math.round((Date.now() - sessionStartAt - pausedMs) / 1000));
}
function estKcal(seconds) {
  const weightKg = loadBody().weightKg;
  if (!weightKg) return 0;
  const minutes = seconds / 60;
  return Math.max(1, Math.round((FALLBACK_MET * 3.5 * weightKg) / 200 * minutes));
}

function quit() {
  // 실제로 몇 초라도 움직였으면 그만큼은 기록에 남는다(2026-09-24).
  const seconds = sessionElapsedSec();
  const msg = seconds >= 5 ? S.quitConfirmSaved : S.amrapQuitConfirm;
  if (!confirm(t(msg))) return;
  if (seconds >= 5) {
    try {
      recordWorkoutSession({ groups: {}, seconds, calories: estKcal(seconds), xp: 20 });
    } catch (e) { console.error('tabata partial quit record failed:', e); }
  }
  stopTimer();
  running = false;
  onShowScreen('more-screen');
}

function beginRun() {
  const cdEl = el('tabata-countdown');
  const headEl = el('tabata-head');
  const runEl = el('tabata-run');
  const doneEl = el('tabata-done');
  if (cdEl) cdEl.hidden = true;
  if (headEl) headEl.hidden = false;
  if (runEl) runEl.hidden = false;
  if (doneEl) doneEl.hidden = true;

  round = 1;
  finished = false;
  paused = false;
  pausedAt = 0;
  sessionStartAt = Date.now();
  pausedMs = 0;
  running = true;

  startPhase('work');
  stopTimer();
  timerId = setInterval(tick, 200);
}

function startTabataSession() {
  readSetupInputs();
  finished = false;
  running = false;

  const cdEl = el('tabata-countdown');
  const headEl = el('tabata-head');
  const runEl = el('tabata-run');
  const doneEl = el('tabata-done');
  if (cdEl) cdEl.hidden = false;
  if (headEl) headEl.hidden = true;
  if (runEl) runEl.hidden = true;
  if (doneEl) doneEl.hidden = true;

  onShowScreen('tabata-run-screen');

  stopCountdown();
  let n = PRESTART_SEC;
  const numEl = el('tabata-countdown-num');
  if (numEl) numEl.textContent = n;
  Sound.countBeep(n);
  countdownId = setInterval(() => {
    n--;
    if (n <= 0) {
      stopCountdown();
      Sound.countBeep(0);
      beginRun();
      return;
    }
    if (numEl) numEl.textContent = n;
    Sound.countBeep(n);
  }, 1000);
}

function cancelCountdown() {
  stopCountdown();
  onShowScreen('tabata-setup-screen');
}

export function isTabataRunning() {
  return running && !finished;
}
export function isTabataPaused() {
  return paused;
}
export function pauseTabata() {
  if (running && !finished && !paused) togglePause();
}

export function initTabata({ translate, STATIC_UI, onShowScreen: showFn } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (showFn) onShowScreen = showFn;

  el('open-tabata-btn')?.addEventListener('click', () => {
    Sound.unlock();
    renderSetup();
    onShowScreen('tabata-setup-screen');
  });
  el('tabata-setup-back-btn')?.addEventListener('click', () => onShowScreen('more-screen'));

  bindStepper('tabata-work-value', 'tabata-work-minus', 'tabata-work-plus', 4, 300);
  bindStepper('tabata-rest-value', 'tabata-rest-minus', 'tabata-rest-plus', 0, 300);
  bindStepper('tabata-rounds-value', 'tabata-rounds-minus', 'tabata-rounds-plus', 1, 99);

  el('tabata-start-btn')?.addEventListener('click', () => {
    Sound.unlock();
    startTabataSession();
  });
  el('tabata-countdown-cancel-btn')?.addEventListener('click', cancelCountdown);
  // screenchange 를 직접 듣는 이유는 ui/quickStart.js 의 같은 장치와
  // 같다 — 카운트다운 중에 뒤로가기로 다른 화면에 가 있어도 countdownId
  // 를 안 멈추면 3초 뒤 beginRun() 이 그 화면에서 억지로 끌고 온다.
  document.addEventListener('screenchange', (e) => {
    if (countdownId && e.detail.id !== 'tabata-run-screen') stopCountdown();
  });

  el('tabata-skip-btn')?.addEventListener('click', () => {
    if (finished) return;
    onPhaseDone();
  });
  el('tabata-pause-btn')?.addEventListener('click', togglePause);
  el('tabata-quit-btn')?.addEventListener('click', quit);
  el('tabata-back-btn')?.addEventListener('click', () => {
    if (!finished) { pauseTabata(); return; }
    onShowScreen('more-screen');
  });
  el('tabata-done-ok-btn')?.addEventListener('click', () => {
    stopTimer();
    running = false;
    onShowScreen('more-screen');
  });
}
