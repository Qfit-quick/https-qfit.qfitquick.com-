// '3초 후 시작' 전용 화면(2026-09-23, 대규모 교체 + 같은 날 타이머·휴식·
// 음성 추가).
//
// 예전 'AI로 시작하기'(질문 2개 → 추천)를 대신한다. 이제는 질문이 없다 —
// 난이도 4단계(매우 쉬움·쉬움·어려움·매우 어려움) 중 하나를 고르면 3초
// 뒤 곧장 시작한다. 동작은 data/difficultyExercises.js 의 표(사용자가
// 준 xlsx 그대로)에서, 고른 난이도 열의 15개 계열을 순서대로 쓴다.
//
// 각 스테이션은 공용 미션 엔진(buildMissions → game-screen)과 같은
// 리듬으로 돈다 — 시작할 때 동작 이름을 말하고, 스테이션 시간의 45%·
// 75% 지점에 한 번씩 음성이 붙고, 다 되면 자동으로 다음으로 넘어간다.
// 다만 그 엔진을 그대로 쓰지는 않는다: missions 의 모든 동작은
// src/data/exercises.js 의 EXERCISES 에 있어야 한다는 전제가 있고(시연
// 영상·운동 중 사진이 거기 다 있어야 한다 — scripts/media.mjs 가 그걸
// 지킨다), 이 표의 동작은 그 24종과 다른 카탈로그라 영상이 아직 없다
// (사용자가 나중에 준다) — EXERCISES 에 넣으면 media 검사가 막혀
// 배포가 안 된다. 그래서 QCE 서킷(ui/circuit.js)과 같은 모양의, 영상
// 없이 이름만 보여주는 자체 화면에 타이머·음성만 옮겨 붙인다.
//
// 음성은 app.js 의 speakExercise/speakMotivation 을 그대로 가져와 쓴다
// (그 파일이 목소리 고르기·언어·중복 취소까지 다 갖고 있다 — 여기서
// 새로 만들면 그 로직이 두 벌이 된다). speakTip(기술 주의점)은 안
// 쓴다 — 이 표의 60개 동작 중 대다수(예: 피스톨 스쿼트, 웨이티드
// 풀업, 핸드스탠드 푸쉬업)는 src/data/exercises.js 에 없어 검증된
// 주의 문구가 없다. 없는 동작에 지어낸 기술 조언을 붙이는 것보다,
// 45%·75% 두 지점 다 speakMotivation() 의 범용 응원 문장을 쓰는 쪽이
// 안전하다.
import { DIFFICULTY_LEVELS, stationsForLevel } from '../data/difficultyExercises.js';
import { openSheet } from './sheet.js';
import { Sound } from '../audio/sound.js';
import { loadBody } from '../health/store.js';
import { speakExercise, speakMotivation, recordWorkoutSession, isPremiumUser } from '../app.js';

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

// 매우 쉬움·매우 어려움은 프리미엄 전용(2026-09-24 요청) — 일반은
// 쉬움/어려움 둘만 고를 수 있다.
const PREMIUM_LEVELS = new Set(['veryEasy', 'veryHard']);

// 시트를 열 때마다 지금 프리미엄인지 다시 본다 — 시트를 연 채로 프리미엄을
// 새로 사는 경로는 없지만(설정에서 활성화 후 돌아와 다시 열어야 한다),
// 매번 새로 판정해야 활성화 직후 바로 반영된다.
function renderLevelLocks() {
  const premium = isPremiumUser();
  PREMIUM_LEVELS.forEach((lvl) => {
    const lock = el('quick-level-' + lvl + '-lock');
    if (lock) lock.hidden = premium;
  });
}

// 스테이션 하나의 목표 시간. 첫 스테이션 10초에서 시작해 매 스테이션
// 1.1배씩 늘어난다(공용 미션 엔진의 dur *= 1.1 과 같은 식, 2026-09-23 요청
// "첫 라운드 10초"). REST_EVERY 마다(4스테이션) 한 번 쉰다.
const STATION_BASE_SEC = 10;
const STATION_GROWTH = 1.1;
const REST_EVERY = 4;
const REST_DURATION = 11; // app.js 의 세트 사이 휴식과 같은 길이
const PRESTART_SEC = 3; // '3초 후 시작' — 예전엔 10초였다

let stations = [];
let level = 'easy';
let stationIdx = 0;
let elapsedSec = 0; // 전체 경과(칼로리·완주 기록용) — 휴식 중에도 흐른다
let stationElapsed = 0; // 지금 스테이션 안에서 흐른 초
let stationDuration = STATION_BASE_SEC;
let nextDurationSec = STATION_BASE_SEC; // 다음 beginStation() 이 쓸 값(누적 성장)
let resting = false;
let restElapsed = 0;
let restCount = 0; // 지금까지 몇 번째 휴식인지 — 번개 인증은 1번째에만 보인다

// 휴식 인증(번개 꾹 누르기, 2026-09-24 요청) — app.js 의 게임 화면 것과
// 같은 상수·리듬이다. 첫 휴식에만 보이고(공용 엔진도 휴식이 한 번뿐이라
// 그 한 번이 곧 첫 휴식이었다), quick-rest-wrap 의 '아무 데나 눌러
// 건너뛰기'와 안 겹치게 별도 카드다.
const REST_TOUCH_HOLD_MS = 600;
const REST_TOUCH_R = 26;
const REST_TOUCH_CIRC = 2 * Math.PI * REST_TOUCH_R;
let restTouchVerified = false;
let restTouchPressStart = 0;
let restTouchRaf = null;
let timerId = null; // 스테이션·휴식 공용 1초 tick
let countdownId = null; // 시작 전 3초 카운트다운
let voiceTimeouts = [];
let paused = true;
let finished = false;
let running = false; // 시작 전 카운트다운이 끝나고 실제로 도는 중인가(휴식 포함)

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
function clearVoiceTimeouts() {
  voiceTimeouts.forEach((id) => clearTimeout(id));
  voiceTimeouts = [];
}

function renderClock() {
  const clockEl = el('quick-clock');
  if (clockEl) clockEl.textContent = fmtClock(elapsedSec);
}

// 동작 표시와 휴식 표시가 같은 자리(quick-move-group ↔ quick-rest-wrap)를
// 번갈아 쓴다 — 일시정지·종료 버튼은 그 바깥이라 휴식 중에도 그대로 눌린다.
function paintMoveOrRest() {
  const moveGroup = el('quick-move-group');
  const restWrap = el('quick-rest-wrap');
  if (moveGroup) moveGroup.hidden = resting;
  if (restWrap) restWrap.hidden = !resting;
}

function render() {
  renderClock();
  const progEl = el('quick-progress');
  if (progEl) progEl.textContent = t(S.circuitProgressFmt).replace('%s', stationIdx + 1).replace('%s', stations.length);

  paintMoveOrRest();

  if (!resting) {
    const st = currentStation();
    if (st) {
      const familyEl = el('quick-move-family');
      if (familyEl) familyEl.textContent = st.family;
      const nameEl = el('quick-move-name');
      if (nameEl) nameEl.textContent = st.name;
      renderStationTimer();
    }
    const isLast = stationIdx >= stations.length - 1;
    const nextBtn = el('quick-next-btn');
    if (nextBtn) nextBtn.textContent = t(isLast ? S.circuitFinishBtn : S.circuitNextBtn);
  } else {
    renderRestNum();
  }

  const pauseBtn = el('quick-pause-btn');
  if (pauseBtn) pauseBtn.textContent = t(paused ? S.amrapResumeBtn : S.amrapPauseBtn);
}

function renderStationTimer() {
  const timerEl = el('quick-move-timer');
  if (!timerEl) return;
  const remain = Math.max(0, stationDuration - stationElapsed);
  timerEl.textContent = remain + t(S.secUnit);
}

function renderRestNum() {
  const numEl = el('quick-rest-num');
  const goEl = el('quick-rest-go');
  const remain = Math.max(0, REST_DURATION - restElapsed);
  if (numEl) numEl.hidden = remain <= 0;
  if (numEl) numEl.textContent = String(remain);
  if (goEl) goEl.hidden = remain > 0;
}

// 스테이션 시간의 45%·75% 지점에 한 번씩(2026-09-23 요청 — 공용 미션
// 엔진의 speakTip(45%)·speakMotivation(75%) 과 같은 리듬). 위 머리
// 설명대로 두 지점 다 speakMotivation() 을 쓴다. paused/finished 를
// 시점에 다시 보는 이유는 공용 엔진과 같다 — 그 사이에 일시정지했거나
// 끝났으면 조용히 건너뛴다(타임아웃 자체를 늦추지는 않는다).
function scheduleStationVoice(durationSec) {
  clearVoiceTimeouts();
  const halfDelayMs = Math.max(2500, Math.round(durationSec * 1000 * 0.45));
  voiceTimeouts.push(setTimeout(() => {
    if (running && !paused && !finished && !resting) speakMotivation();
  }, halfDelayMs));
  if (durationSec >= 9) {
    const lateDelayMs = Math.max(5000, Math.round(durationSec * 1000 * 0.75));
    voiceTimeouts.push(setTimeout(() => {
      if (running && !paused && !finished && !resting) speakMotivation();
    }, lateDelayMs));
  }
}

function beginStation() {
  stationElapsed = 0;
  stationDuration = Math.round(nextDurationSec);
  nextDurationSec *= STATION_GROWTH;

  render();
  const st = currentStation();
  if (st) speakExercise(st.name, null);
  scheduleStationVoice(stationDuration);
}

function startRest() {
  resting = true;
  restElapsed = 0;
  restCount++;
  clearVoiceTimeouts();
  render();
  const touchCard = el('quick-rest-touch-card');
  if (touchCard) touchCard.hidden = restCount !== 1;
  if (restCount === 1) resetRestTouch();
}

function endRest() {
  if (!resting) return;
  resting = false;
  stopRestTouchHold();
  // 인증을 안 끝내고(꾹 누르는 중간에) 건너뛴 경우 카드가 hidden 이
  // 아니게 남아, 다음 스테이션 화면 위에 그대로 걸쳐 보인다 — 항상
  // 여기서 확실히 감춘다.
  const touchCard = el('quick-rest-touch-card');
  if (touchCard) touchCard.hidden = true;
  beginStation();
}

function resetRestTouch() {
  restTouchVerified = false;
  restTouchPressStart = 0;
  if (restTouchRaf) { cancelAnimationFrame(restTouchRaf); restTouchRaf = null; }
  const zone = el('quick-rest-touch-zone');
  if (zone) zone.classList.remove('verified');
  const prog = el('quick-rest-touch-prog');
  if (prog) {
    prog.style.strokeDasharray = String(REST_TOUCH_CIRC);
    prog.style.strokeDashoffset = String(REST_TOUCH_CIRC);
  }
  const icon = el('quick-rest-touch-icon');
  if (icon) icon.textContent = '⚡';
  const label = el('quick-rest-touch-label');
  if (label) label.textContent = t(S.restTouchLabel);
}

function stepRestTouch() {
  if (restTouchVerified || !restTouchPressStart) return;
  const elapsed = Date.now() - restTouchPressStart;
  const pct = Math.min(1, elapsed / REST_TOUCH_HOLD_MS);
  const prog = el('quick-rest-touch-prog');
  if (prog) prog.style.strokeDashoffset = String(REST_TOUCH_CIRC * (1 - pct));
  if (pct >= 1) {
    restTouchVerified = true;
    restTouchPressStart = 0;
    const zone = el('quick-rest-touch-zone');
    if (zone) zone.classList.add('verified');
    const icon = el('quick-rest-touch-icon');
    if (icon) icon.textContent = '✅';
    const label = el('quick-rest-touch-label');
    if (label) label.textContent = t(S.restTouchDone);
    const card = el('quick-rest-touch-card');
    setTimeout(() => { if (card) card.hidden = true; }, 500);
    return;
  }
  restTouchRaf = requestAnimationFrame(stepRestTouch);
}

function stopRestTouchHold() {
  restTouchPressStart = 0;
  if (restTouchRaf) { cancelAnimationFrame(restTouchRaf); restTouchRaf = null; }
  if (!restTouchVerified) {
    const prog = el('quick-rest-touch-prog');
    if (prog) prog.style.strokeDashoffset = String(REST_TOUCH_CIRC);
  }
}

// 스테이션이 다 됐을 때(타이머가 0 이 됐거나 '다음 스테이션'을 눌렀을 때)
// 공통으로 지난다. 4스테이션마다 한 번 쉰다 — 마지막 스테이션 뒤에는
// 쉴 다음 스테이션이 없으므로 안 쉬고 바로 완주로 간다.
function advance() {
  clearVoiceTimeouts();
  if (stationIdx >= stations.length - 1) { finish(); return; }
  const completedCount = stationIdx + 1;
  stationIdx++;
  if (completedCount % REST_EVERY === 0) startRest();
  else beginStation();
}

function tick() {
  if (paused || finished) return;
  elapsedSec++;
  if (resting) {
    restElapsed++;
    renderClock();
    renderRestNum();
    return;
  }
  stationElapsed++;
  renderClock();
  renderStationTimer();
  if (stationElapsed >= stationDuration) advance();
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
  resting = false;
  clearVoiceTimeouts();
  stopTimer();
  // 이 표의 동작은 src/data/exercises.js 카탈로그 밖이라(머리 설명 참고)
  // 부위별 groups 는 못 만든다 — 시간·칼로리만 기록에 남긴다.
  if (stationIdx > 0) {
    try {
      recordWorkoutSession({ groups: {}, seconds: elapsedSec, calories: estKcal(loadBody().weightKg), xp: 20 });
    } catch (e) { console.error('quickStart record failed:', e); }
  }
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
  // 스테이션을 하나라도 끝냈으면 그만큼은 기록에 남는다(2026-09-24).
  const msg = stationIdx > 0 ? S.quitConfirmSaved : S.amrapQuitConfirm;
  if (!confirm(t(msg))) return;
  if (stationIdx > 0) {
    try {
      recordWorkoutSession({ groups: {}, seconds: elapsedSec, calories: estKcal(loadBody().weightKg), xp: 20 });
    } catch (e) { console.error('quickStart partial quit record failed:', e); }
  }
  clearVoiceTimeouts();
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
  nextDurationSec = STATION_BASE_SEC;
  restCount = 0;
  finished = false;
  resting = false;
  paused = false;
  running = true;

  const titleEl = el('quick-title');
  if (titleEl) titleEl.textContent = t(S[LEVEL_LABEL_KEY[level]]);

  beginStation();
  stopTimer();
  timerId = setInterval(tick, 1000);
}

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
  let n = PRESTART_SEC;
  const numEl = el('quick-countdown-num');
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
      renderLevelLocks();
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
      const lvl = btn.dataset.level;
      // 프리미엄 전용인데 아직 아니면 시작 대신 결제 유도 시트를 연다 —
      // ex-card 의 잠긴 카드와 같은 문(window.openPremiumUpsell).
      if (PREMIUM_LEVELS.has(lvl) && !isPremiumUser()) {
        window.openPremiumUpsell?.();
        return;
      }
      startQuickSession(lvl);
    });
  });

  el('quick-countdown-cancel-btn')?.addEventListener('click', cancelCountdown);
  // '다음 스테이션' = 지금 스테이션을 건너뛴다(공용 엔진의 skipMission() 과
  // 같은 뜻) — 남은 시간을 0 으로 치고 advance() 로 그대로 넘긴다.
  el('quick-next-btn')?.addEventListener('click', () => {
    if (finished || resting) return;
    advance();
  });
  el('quick-pause-btn')?.addEventListener('click', togglePause);
  el('quick-quit-btn')?.addEventListener('click', quit);
  el('quick-back-btn')?.addEventListener('click', () => {
    if (!finished) { pauseQuick(); return; }
    onShowScreen('start-screen');
  });
  // 휴식은 어디를 눌러도(카운트다운이 남았어도) 바로 건너뛴다 — 공용
  // 엔진의 세트 사이 휴식과 같은 이유(물 마시러 간 사이에 그냥 지나가면
  // 안 된다)로 자동으로는 안 넘어가지만, 쉬는 시간을 원치 않는 사람도
  // 있어서(app.js skipMission() 주석 참고) 탭 한 번으로 끝낸다.
  el('quick-rest-wrap')?.addEventListener('click', endRest);
  el('quick-rest-wrap')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); endRest(); }
  });
  const restTouchZone = el('quick-rest-touch-zone');
  if (restTouchZone) {
    restTouchZone.addEventListener('pointerdown', (e) => {
      if (restTouchVerified) return;
      e.preventDefault();
      restTouchPressStart = Date.now();
      restTouchRaf = requestAnimationFrame(stepRestTouch);
    });
    restTouchZone.addEventListener('pointerup', stopRestTouchHold);
    restTouchZone.addEventListener('pointerleave', stopRestTouchHold);
    restTouchZone.addEventListener('pointercancel', stopRestTouchHold);
  }
  // 카운트다운 중에 뒤로가기(하드웨어 back)를 누르면 다른 화면으로 넘어가는데,
  // countdownId 를 안 멈추면 3초가 다 찼을 때 beginRun() 이 onShowScreen('quick-screen')
  // 을 불러 사용자를 보고 있던 화면에서 억지로 끌고 온다 — running 상태만
  // isQuickRunning() 으로 막아서 nav.js 가 지켜주지만, 카운트다운은 아직
  // running=false 라 그 방어를 안 탄다. 화면이 바뀔 때마다 직접 본다.
  document.addEventListener('screenchange', (e) => {
    if (countdownId && e.detail.id !== 'quick-screen') stopCountdown();
  });

  el('quick-done-ok-btn')?.addEventListener('click', () => {
    stopTimer();
    running = false;
    onShowScreen('start-screen');
  });
}
