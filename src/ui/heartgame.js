// 큐피드 하트 슈팅 미니게임(2026-09-12).
//
// 사용자가 만들어 전달한 독립 HTML(cupid-heart-game.html)의 로직을 화면
// 하나로 그대로 옮긴 것이다 — 판정·점수·난이도 곡선은 원본과 동일하게
// 두고, 다음 세 가지만 이 앱에 맞춰 바꿨다.
//   1. IIFE로 즉시 실행되던 <script>를 initHeartGame() 하나로 감싸,
//      main.js가 다른 화면들과 같은 타이밍에 한 번만 불러 붙인다.
//   2. id·class 전부에 heartgame- 접두사를 붙였다(#game → #heartgame-root
//      등) — 기존 화면의 이름과 절대 겹치지 않게 하기 위해서다. 모듈
//      스코프 안 변수·함수 이름은 애초에 다른 모듈과 충돌할 수 없으므로
//      (ES 모듈은 파일마다 스코프가 갈린다) 그대로 두었다.
//   3. 화면에 박혀 있던 한글 문구는 기존 i18n 체계(STATIC_UI)로 옮겼다.
//      정적인 제목·버튼 글자는 마크업의 data-i18n이 처리하고, 점수처럼
//      매번 달라지는 문구만 여기서 t()로 짓는다.
//
// 최고 기록·음소거 여부는 지금처럼 localStorage에 그대로 둔다(계정 기반
// 저장으로 옮길지는 아직 결정 전 — 임의로 바꾸지 않는다). XP·펫 연동도
// 아직 결정 전이라 훅 자리만 남겨 둔다(endGame() 안 주석 참고).
//
// 원본과 다르게 둔 딱 한 가지: '나가기'가 원본에서는 이 게임밖에 없는
// 화면이라 자기 시작화면으로 돌아가는 것이 곧 나가는 것이었지만, 여기서는
// 다른 화면들도 있으므로 '나가기'를 누르면 더보기 화면으로 실제로 나간다
// (게임 판정·점수 로직은 손대지 않았다 — 이동 대상만 정한 것).
import { showScreenById } from '../app.js';

let t = (o) => (o && o.ko) || '';
let S = {};

const BEST_KEY = 'qfit_heartgame_best_score';
const MUTE_KEY = 'qfit_heartgame_muted';

const DIFFICULTY_RAMP_SECONDS = 30; // 이 시간에 걸쳐 속도/스폰이 최대치까지 올라감(게임 종료와는 무관)
const LANE_COUNT = 3;
const HITZONE_RATIO = 0.20; // 화면 폭 대비 판정구역 비율(좌측)

const SPAWN_START_MS = 950;
const SPAWN_MIN_MS = 380;
const SPEED_START = 90; // px/sec
const SPEED_MAX = 300; // px/sec

const TYPE_TABLE = [
  { type: 'heart', emoji: '❤️', weight: 70, score: 10 },
  { type: 'broken', emoji: '💔', weight: 18, score: -10 },
  { type: 'star', emoji: '⭐', weight: 12, score: 50 },
];

function loadBest() {
  try {
    const v = parseInt(localStorage.getItem(BEST_KEY), 10);
    return isNaN(v) ? 0 : v;
  } catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* 저장 실패 시 이번 세션에서만 표시 */ }
}
function loadMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
}
function saveMuted(v) {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) { /* 저장 실패 시 이번 세션에서만 유지 */ }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function pickType() {
  let total = 0;
  for (const entry of TYPE_TABLE) total += entry.weight;
  let r = Math.random() * total;
  for (const entry of TYPE_TABLE) {
    if (r < entry.weight) return entry;
    r -= entry.weight;
  }
  return TYPE_TABLE[0];
}

export function initHeartGame({ translate, STATIC_UI } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;

  const root = document.getElementById('heartgame-root');
  if (!root) return; // 마크업이 아직 안 붙었으면 조용히 넘어간다

  const els = {
    root,
    lanes: root.querySelectorAll('.heartgame-lane'),
    score: document.getElementById('heartgame-score'),
    timer: document.getElementById('heartgame-timer'),
    comboLabel: document.getElementById('heartgame-combo-label'),
    startOverlay: document.getElementById('heartgame-start-overlay'),
    endOverlay: document.getElementById('heartgame-end-overlay'),
    startBtn: document.getElementById('heartgame-start-btn'),
    retryBtn: document.getElementById('heartgame-retry-btn'),
    finalScore: document.getElementById('heartgame-final-score'),
    finalLine: document.getElementById('heartgame-final-line'),
    best: document.getElementById('heartgame-best'),
    recordBadge: document.getElementById('heartgame-record-badge'),
    pauseBtn: document.getElementById('heartgame-pause-btn'),
    pauseOverlay: document.getElementById('heartgame-pause-overlay'),
    resumeBtn: document.getElementById('heartgame-resume-btn'),
    pauseMuteBtn: document.getElementById('heartgame-pause-mute-btn'),
    pauseRestartBtn: document.getElementById('heartgame-pause-restart-btn'),
    pauseExitBtn: document.getElementById('heartgame-pause-exit-btn'),
  };

  els.pauseBtn.setAttribute('aria-label', t(S.heartgamePauseLabel));

  let bestScore = loadBest();
  const paintBest = () => { els.best.textContent = t(S.heartgameBest).replace('%s', bestScore); };
  paintBest();

  let muted = loadMuted();
  const paintMuteBtn = () => { els.pauseMuteBtn.textContent = t(muted ? S.heartgameMuteOff : S.heartgameMuteOn); };
  paintMuteBtn();

  // BEST 수치·음소거 버튼 글자는 두고두고 보이는 자리라, 언어를 바꾼 순간
  // 옛 언어로 남아 있으면 홈의 연속기록 줄이 그랬던 것과 같은 문제가 된다.
  document.addEventListener('qfit:lang', () => {
    paintBest();
    paintMuteBtn();
    els.pauseBtn.setAttribute('aria-label', t(S.heartgamePauseLabel));
  });

  let state = null;
  function makeState() {
    return {
      running: false,
      score: 0,
      combo: 0,
      bestCombo: 0,
      elapsed: 0,
      items: [], // {id, lane, laneEl, el, x, type, hit}
      nextId: 1,
      lastSpawnAt: 0,
      lastFrameAt: 0,
      timerAccum: 0,
    };
  }

  function difficultyProgress() {
    // 0~1, DIFFICULTY_RAMP_SECONDS에 걸쳐 선형 진행(최대치 도달 후 고정, 게임은 안 끝남)
    return clamp(state.elapsed / DIFFICULTY_RAMP_SECONDS, 0, 1);
  }
  function currentSpeed() {
    const p = difficultyProgress();
    return SPEED_START + (SPEED_MAX - SPEED_START) * p;
  }
  function currentSpawnInterval() {
    const p = difficultyProgress();
    return SPAWN_START_MS - (SPAWN_START_MS - SPAWN_MIN_MS) * p;
  }

  function laneWidth() { return els.root.clientWidth; }
  function hitzoneRightEdge() { return laneWidth() * HITZONE_RATIO; }

  function spawnItem() {
    const laneIndex = Math.floor(Math.random() * LANE_COUNT);
    const laneEl = els.lanes[laneIndex];
    const type = pickType();

    const el = document.createElement('div');
    el.className = 'heartgame-item';
    el.textContent = type.emoji;
    const startX = laneWidth() - 10;
    el.style.left = startX + 'px';
    laneEl.appendChild(el);

    state.items.push({ id: state.nextId++, lane: laneIndex, laneEl, el, x: startX, type, hit: false });
  }

  function removeItem(item) {
    if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el);
    const idx = state.items.indexOf(item);
    if (idx !== -1) state.items.splice(idx, 1);
  }

  function spawnPopup(laneEl, x, text, color) {
    const p = document.createElement('div');
    p.className = 'heartgame-popup';
    p.textContent = text;
    p.style.left = x + 'px';
    p.style.top = '50%';
    p.style.color = color;
    laneEl.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 650);
  }

  function spawnArrow(laneEl) {
    const a = document.createElement('div');
    a.className = 'heartgame-arrow';
    laneEl.appendChild(a);
    setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 200);
  }

  function spawnBurst(laneEl, x, positive) {
    const b = document.createElement('div');
    b.className = 'heartgame-burst ' + (positive ? 'heartgame-burst-pos' : 'heartgame-burst-neg');
    b.style.left = x + 'px';
    laneEl.appendChild(b);
    setTimeout(() => { if (b.parentNode) b.parentNode.removeChild(b); }, 420);
  }

  function shakeScreen(intensity) {
    const el = els.root;
    el.style.transform = 'translateX(' + intensity + 'px)';
    setTimeout(() => { el.style.transform = 'translateX(-' + intensity + 'px)'; }, 40);
    setTimeout(() => { el.style.transform = ''; }, 90);
  }

  // ---- 사운드(Web Audio API로 즉석 생성, 파일 없음) ----
  // 오디오 컨텍스트는 반드시 사용자 제스처(시작하기/이어하기 클릭) 안에서만
  // 만들거나 재개한다 — 브라우저 자동재생 정책상 그 밖에서 만들면 소리가
  // 죽은 채로 붙어 아무 소리도 안 난다.
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
      } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      try { audioCtx.resume(); } catch (e) { /* 무시 */ }
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, startDelay, peakGain) {
    if (muted) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + (startDelay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peakGain || 0.2, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.03);
    } catch (e) { /* 오디오 미지원 환경 무시 */ }
  }
  function sfxHeart() { playTone(880, 0.12, 'sine', 0, 0.22); }
  function sfxStar() {
    playTone(1046, 0.09, 'triangle', 0, 0.22);
    playTone(1568, 0.14, 'triangle', 0.08, 0.2);
  }
  function sfxBroken() { playTone(160, 0.18, 'sawtooth', 0, 0.18); }
  function sfxGameOver() {
    playTone(440, 0.15, 'sine', 0, 0.2);
    playTone(330, 0.15, 'sine', 0.12, 0.2);
    playTone(220, 0.28, 'sine', 0.24, 0.2);
  }

  function toggleMute() {
    muted = !muted;
    saveMuted(muted);
    paintMuteBtn();
  }

  function playHitEffect(item, positive, intensity, vibratePattern) {
    // 이동 루프 대상에서 즉시 제외(더 이상 위치가 갱신되지 않도록)
    const idx = state.items.indexOf(item);
    if (idx !== -1) state.items.splice(idx, 1);

    item.el.classList.add('heartgame-pop');
    setTimeout(() => { if (item.el && item.el.parentNode) item.el.parentNode.removeChild(item.el); }, 260);

    spawnBurst(item.laneEl, item.x, positive);
    shakeScreen(intensity);

    if (navigator.vibrate) {
      try { navigator.vibrate(vibratePattern); } catch (e) { /* 진동 미지원 기기 무시 */ }
    }
  }

  let comboTimer = null;
  function showCombo() {
    if (state.combo >= 2) {
      els.comboLabel.textContent = t(S.heartgameCombo).replace('%s', state.combo);
      els.comboLabel.style.opacity = '1';
      clearTimeout(comboTimer);
      comboTimer = setTimeout(() => { els.comboLabel.style.opacity = '0'; }, 500);
    }
  }

  function onLaneTap(laneIndex, laneEl) {
    if (!state || !state.running) return;

    spawnArrow(laneEl);

    // 판정구역 안에 있는 아이템 중 큐피드에 가장 가까운 것을 명중 처리
    let best = null;
    for (const it of state.items) {
      if (it.lane !== laneIndex || it.hit) continue;
      if (it.x <= hitzoneRightEdge()) {
        if (best === null || it.x < best.x) best = it;
      }
    }
    if (!best) return; // 헛방 — 점수/콤보 변화 없음

    best.hit = true;
    const type = best.type;
    state.score = Math.max(0, state.score + type.score);
    els.score.textContent = state.score;

    if (type.type === 'broken') {
      state.combo = 0;
      spawnPopup(best.laneEl, best.x, type.score, 'var(--danger)');
      playHitEffect(best, false, 6, [10, 30, 10]);
      sfxBroken();
    } else {
      state.combo++;
      if (state.combo > state.bestCombo) state.bestCombo = state.combo;
      spawnPopup(best.laneEl, best.x, '+' + type.score, type.type === 'star' ? 'var(--accent)' : '#fff');
      showCombo();
      playHitEffect(best, true, type.type === 'star' ? 7 : 3, type.type === 'star' ? 20 : 10);
      if (type.type === 'star') sfxStar(); else sfxHeart();
    }
  }

  els.lanes.forEach((laneEl, idx) => {
    laneEl.addEventListener('pointerdown', () => onLaneTap(idx, laneEl));
  });

  function update(dt) {
    // 스폰
    state.lastSpawnAt += dt * 1000;
    if (state.lastSpawnAt >= currentSpawnInterval()) {
      state.lastSpawnAt = 0;
      spawnItem();
    }

    // 이동
    const speed = currentSpeed();
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.x -= speed * dt;
      it.el.style.left = it.x + 'px';
      if (it.x < -60) {
        if (it.type.type !== 'broken') {
          // ❤️ 또는 ⭐를 못 맞추고 놓침 → 즉시 게임 종료
          endGame();
          return;
        }
        removeItem(it); // 💔는 놓쳐도 안전 — 감점도 종료도 없음
      }
    }

    // 경과 시간(난이도 계산 + 스톱워치 표시용, 게임 종료와는 무관)
    state.elapsed += dt;
    state.timerAccum += dt;
    if (state.timerAccum >= 1) {
      state.timerAccum -= 1;
      els.timer.textContent = String(Math.floor(state.elapsed));
    }
  }

  function loop(ts) {
    if (!state.running) return;
    if (!state.lastFrameAt) state.lastFrameAt = ts;
    let dt = (ts - state.lastFrameAt) / 1000;
    dt = Math.min(dt, 0.05); // 탭 전환 등으로 인한 큰 점프 방지
    state.lastFrameAt = ts;

    update(dt);
    if (state.running) requestAnimationFrame(loop);
  }

  function clearBoard() {
    els.lanes.forEach((laneEl) => {
      laneEl.querySelectorAll('.heartgame-item, .heartgame-popup, .heartgame-arrow').forEach((n) => n.remove());
    });
  }

  function startGame() {
    getAudioCtx(); // 사용자 제스처(버튼 클릭) 안에서 오디오 컨텍스트를 미리 깨워둠

    clearBoard();
    state = makeState();
    state.running = true;

    els.score.textContent = '0';
    els.timer.textContent = '0';
    els.comboLabel.style.opacity = '0';

    els.startOverlay.hidden = true;
    els.endOverlay.hidden = true;
    els.pauseOverlay.hidden = true;

    requestAnimationFrame(loop);
  }

  function endGame() {
    state.running = false;
    clearBoard();
    sfxGameOver();

    const isNewRecord = state.score > bestScore;
    if (isNewRecord) {
      bestScore = state.score;
      saveBest(bestScore);
      paintBest();
    }

    // 여기에 XP 지급 훅을 추가하면 됩니다(기존 XP/펫 시스템 연동 여부는
    // 아직 결정되지 않았다 — state.score 가 이번 판 점수).

    els.finalScore.textContent = String(state.score);
    els.finalLine.textContent = t(S.heartgameResultLine).replace('%s', bestScore).replace('%s', state.bestCombo);
    els.recordBadge.hidden = !isNewRecord;
    els.endOverlay.hidden = false;
  }

  function pauseGame() {
    if (!state || !state.running) return;
    state.running = false;
    els.pauseOverlay.hidden = false;
  }

  function resumeGame() {
    if (!state) return;
    getAudioCtx(); // 백그라운드에서 중단됐을 수 있는 오디오 컨텍스트 재개
    state.running = true;
    state.lastFrameAt = 0; // 재개 시 큰 dt 점프 방지
    els.pauseOverlay.hidden = true;
    requestAnimationFrame(loop);
  }

  function exitGame() {
    // 플레이 중 나가기 — 기록/점수는 그대로 두고 조용히 시작화면으로 복귀
    if (state) {
      state.running = false;
      clearBoard();
    }
    els.endOverlay.hidden = true;
    els.pauseOverlay.hidden = true;
    els.startOverlay.hidden = false;
    showScreenById('more-screen');
  }

  els.startBtn.addEventListener('click', startGame);
  els.retryBtn.addEventListener('click', startGame);
  els.pauseBtn.addEventListener('click', pauseGame);
  els.resumeBtn.addEventListener('click', resumeGame);
  els.pauseRestartBtn.addEventListener('click', startGame);
  els.pauseExitBtn.addEventListener('click', exitGame);
  els.pauseMuteBtn.addEventListener('click', toggleMute);

  // 탭/앱이 백그라운드로 가면 자동으로 일시정지(돌아왔을 때 억울한 게임오버 방지).
  // app.js 에도 visibilitychange 리스너가 하나 있지만(오디오 컨텍스트 재개용) 그쪽과
  // 이 리스너는 서로 다른 addEventListener 호출이라 겹치지 않고 각자 돈다.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });

  // 앱 안에서 다른 화면으로 넘어갈 때도 같은 이유로 멈춘다 — 백그라운드
  // 전환이 아니라 '더보기'나 다른 탭으로 이동한 경우는 visibilitychange가
  // 안 뜨므로 따로 잡아야 한다. showScreen() 이 항상 이 이벤트를 쏜다.
  document.addEventListener('screenchange', (e) => {
    if (e.detail?.id !== 'heartgame-screen') pauseGame();
  });
}
