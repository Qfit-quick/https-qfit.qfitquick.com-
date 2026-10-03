// 다시 열게 만드는 장치들(2026-10-04 "어떤 걸 하면 사람들이 이 앱을 더
// 자주 볼지 생각해서" 요청).
//
// 자주 여는 앱은 세 가지를 준다 — 열 이유, 열었을 때의 보상, 잃기 싫은 것.
// 이 파일이 그 셋을 모은다:
//
//  - 잃기 싫은 것: 연속 기록(liveStreak). 예전 홈의 연속은 앱 안에서 완주한
//    운동만 셌고(도전 실천·체크 화면의 '오늘 운동했다'는 빠졌다), 며칠 쉬어
//    끊겨도 다음 운동 전까지 옛 숫자가 그대로 떠 있었다. 이제 기록지의 운동
//    칸(앱 완주·도전 체크·직접 체크가 모두 켜는 한 자리)과 옛 완주 기록을
//    합쳐 그 자리에서 센다. 오늘 아직 안 했으면 "오늘 하면 N일 연속"으로
//    걸려 있는 것을 보여 준다.
//  - 열 이유: 홈 화면 앱 아이콘 배지(updateAppBadge). 오늘 운동 전이면 ①,
//    하면 지운다. 알림(public/sw-push.js)이 오면 거기서도 켠다.
//  - 열었을 때의 보상: 연속 이정표 축하(maybeCelebrateStreak), 월요일의
//    지난주 리포트(renderWeeklyReport), 오늘 운동 전엔 졸고 있는 펫(app.js).
import { loadLog, dayKey, shiftDay } from '../health/store.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let historyFn = () => [];
let confettiFn = () => {};

export function initEngage({ translate, STATIC_UI, history, confetti } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (typeof history === 'function') historyFn = history;
  if (typeof confetti === 'function') confettiFn = confetti;
  // 앱이 앞으로 돌아오거나 내려갈 때 배지를 맞춘다 — 자정을 넘겨 다시
  // 열었으면 '오늘'이 바뀌어 있다.
  document.addEventListener('visibilitychange', () => updateAppBadge());
}

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 운동한 날(YYYY-MM-DD, 이 기기의 시간대) 모음. */
export function workoutDates() {
  const set = new Set();
  const log = loadLog();
  for (const [k, v] of Object.entries(log)) if (v && v.workout) set.add(k);
  // 기록지가 생기기 전(2026-09)의 완주는 완주 기록에만 있다.
  for (const e of historyFn() || []) {
    const ms = typeof e === 'number' ? e : (e && e.t) || 0;
    if (ms) set.add(dayKey(new Date(ms)));
  }
  return set;
}

/**
 * 지금 살아 있는 연속 기록.
 *  count     — 오늘 했으면 오늘까지, 아니면 어제까지 이어진 날 수
 *  doneToday — 오늘 이미 했나
 *  atRisk    — 어제까지 이어져 있는데 오늘 아직 안 했다(오늘 안 하면 끊긴다)
 *  ever      — 한 번이라도 운동한 적이 있나
 */
export function liveStreak(today = dayKey()) {
  const days = workoutDates();
  const doneToday = days.has(today);
  let cursor = doneToday ? today : shiftDay(today, -1);
  let count = 0;
  while (days.has(cursor) && count < 3650) {
    count++;
    cursor = shiftDay(cursor, -1);
  }
  return { count, doneToday, atRisk: !doneToday && count > 0, ever: days.size > 0 };
}

/** 홈 '이번 주' 카드 머리의 한 줄 — 상태에 따라 말이 바뀐다. */
export function streakLine() {
  const s = liveStreak();
  if (s.doneToday) return { text: t(S.streakToday).replace('%s', s.count), state: 'done' };
  if (s.atRisk) return { text: t(S.streakAtRisk).replace('%s', s.count + 1), state: 'risk' };
  if (s.ever) return { text: t(S.streakRestart), state: 'restart' };
  return { text: t(S.streakNone), state: 'none' };
}

// ── 앱 아이콘 배지 ─────────────────────────────────────────────
// Badging API(안드로이드 크롬 설치 앱, iOS 16.4+ 홈 화면 앱 — 알림 권한이
// 있을 때). 없는 브라우저에선 조용히 아무 일도 안 한다.
export function updateAppBadge() {
  try {
    if (!('setAppBadge' in navigator)) return;
    if (liveStreak().doneToday) navigator.clearAppBadge().catch(() => {});
    else navigator.setAppBadge(1).catch(() => {});
  } catch (e) { /* 무시 */ }
}

// ── 연속 이정표 축하 ───────────────────────────────────────────
const MILESTONES = [3, 7, 14, 21, 30, 50, 100, 200, 365];
const CELE_KEY = 'qfit_streak_celebrated_v1';

function loadCelebrated() {
  try { const v = JSON.parse(localStorage.getItem(CELE_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}

/**
 * 오늘 운동으로 이정표(3·7·14…일)에 닿았으면 한 번만 축하한다. 같은 이정표를
 * 다시 넘어도(끊겼다 다시 이어도) 그 연속의 시작일이 다르면 또 축하한다.
 */
export function maybeCelebrateStreak() {
  const s = liveStreak();
  if (!s.doneToday || !MILESTONES.includes(s.count)) return false;
  const startDay = shiftDay(dayKey(), -(s.count - 1));
  const done = loadCelebrated();
  const id = s.count + '@' + startDay;
  if (done[id]) return false;
  done[id] = true;
  try { localStorage.setItem(CELE_KEY, JSON.stringify(done)); } catch (e) { /* 이번만 */ }
  showCelebration(s.count);
  return true;
}

function showCelebration(n) {
  document.getElementById('streak-cele')?.remove();
  const box = document.createElement('div');
  box.id = 'streak-cele';
  box.className = 'streak-cele';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML =
    '<div class="streak-cele-card">' +
    `<div class="streak-cele-n">${n}</div>` +
    `<h3 class="streak-cele-t">${esc(t(S.streakMilestoneTitle).replace('%s', n))}</h3>` +
    `<p class="streak-cele-d">${esc(t(S.streakMilestoneBody).replace('%s', n))}</p>` +
    '<div class="streak-cele-btns">' +
    (navigator.share ? `<button type="button" class="sec2" data-cele-share>${esc(t(S.streakMilestoneShare))}</button>` : '') +
    `<button type="button" class="primary" data-cele-close>${esc(t(S.streakMilestoneClose))}</button>` +
    '</div></div>';
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-cele-share]')) {
      navigator.share({ text: t(S.streakShareText).replace('%s', n), url: location.origin + location.pathname }).catch(() => {});
      return;
    }
    if (e.target === box || e.target.closest('[data-cele-close]')) box.remove();
  });
  (document.getElementById('app') || document.body).appendChild(box);
  try { confettiFn(); } catch (e) { /* 연출일 뿐 */ }
}

// ── 지난주 리포트 ─────────────────────────────────────────────
// 새 주(월요일 시작)의 첫 사흘 동안 홈 위쪽에 지난주를 한 번 돌아보게 한다.
// 닫으면 그 주엔 다시 안 뜬다. 지난주·그 전 주 둘 다 0일이면 안 띄운다 —
// "0일" 은 성적표처럼 읽혀서 쉬던 사람을 쫓아낸다.
const WEEKLY_KEY = 'qfit_weekly_seen_v1';

function mondayOf(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 월=0
  return shiftDay(dateKey, -dow);
}

function weekStats(monday) {
  const days = workoutDates();
  let n = 0;
  for (let i = 0; i < 7; i++) if (days.has(shiftDay(monday, i))) n++;
  const sunday = shiftDay(monday, 6);
  let sessions = 0;
  for (const e of historyFn() || []) {
    const ms = typeof e === 'number' ? e : (e && e.t) || 0;
    if (!ms) continue;
    const k = dayKey(new Date(ms));
    if (k >= monday && k <= sunday) sessions++;
  }
  return { days: n, sessions };
}

export function renderWeeklyReport() {
  const box = document.getElementById('home-weekly');
  if (!box) return;
  const today = dayKey();
  const thisMon = mondayOf(today);
  const dayIdx = (() => { const [y, m, d] = today.split('-').map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; })();
  let seen = '';
  try { seen = localStorage.getItem(WEEKLY_KEY) || ''; } catch (e) { /* 무시 */ }
  const last = weekStats(shiftDay(thisMon, -7));
  const before = weekStats(shiftDay(thisMon, -14));
  if (seen === thisMon || dayIdx > 2 || (last.days === 0 && before.days === 0)) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const diff = last.days - before.days;
  const cmp = diff > 0 ? t(S.weeklyUp).replace('%s', diff)
    : diff < 0 ? t(S.weeklyDown).replace('%s', -diff)
    : t(S.weeklySame);
  const dots = Array.from({ length: 7 }, (_, i) => workoutDates().has(shiftDay(shiftDay(thisMon, -7), i)));
  box.hidden = false;
  box.innerHTML =
    '<div class="home-weekly-main">' +
    `<span class="home-weekly-k">${esc(t(S.weeklyTitle))}</span>` +
    // 도전·직접 체크로만 운동한 주는 앱 완주가 0이다 — '완주 0회'는 운동을
    // 안 한 것처럼 읽히니 그땐 일수만 말한다.
    `<span class="home-weekly-t">${esc(last.sessions > 0
      ? t(S.weeklyLine).replace('%s', last.days).replace('%s', last.sessions)
      : t(S.weeklyDaysOnly).replace('%s', last.days))}</span>` +
    '<span class="home-weekly-dots" aria-hidden="true">' + dots.map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('') + '</span>' +
    `<span class="home-weekly-cmp${diff < 0 ? ' down' : ''}">${esc(cmp)}</span>` +
    '</div>' +
    `<button type="button" class="home-weekly-x" data-weekly-close aria-label="${esc(t(S.weeklyClose))}">✕</button>`;
  box.onclick = (e) => {
    if (!e.target.closest('[data-weekly-close]')) return;
    try { localStorage.setItem(WEEKLY_KEY, thisMon); } catch (err) { /* 무시 */ }
    box.hidden = true;
  };
}

/** 홈에 돌아올 때마다 한 번에 부른다. */
export function refreshEngagement() {
  updateAppBadge();
  renderWeeklyReport();
  maybeCelebrateStreak();
}
