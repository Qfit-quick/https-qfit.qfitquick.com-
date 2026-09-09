// 기록지.
//
// 이 화면이 답하는 질문은 하나다 — **"오늘 운동과 식단, 무엇을 했나."**
// 그래서 맨 위에 그 답을 한 줄로 먼저 쓰고, 체크칸은 그 아래에 둔다.
// 체크를 다 훑어서 스스로 상태를 세게 만들면 기록지가 아니라 설문이 된다.
//
// 상태는 네 가지뿐이다: none · diet · workout · both. 판정은 화면이 하지 않고
// src/health/store.js 의 dayStatus() 하나가 한다 — 홈 카드와 기록지와 캘린더가
// 같은 함수를 읽어야, 세 자리가 서로 다른 말을 하는 날이 오지 않는다.

import {
  dayKey, loadDay, saveDay, dietState, dayStatus,
  recentDays, streakOf, monthTally, loadBody, saveBody,
} from '../health/store.js';
import { MEAL_SPLIT } from '../data/foods.js';
import { MOOD_OPTIONS, DRIVE_OPTIONS } from '../data/checkin.js';
import { nutritionPlan, mealPlan } from '../data/plan.js';
import { ICON } from './icons.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let goScreen = () => {};

const el = (id) => document.getElementById(id);

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 상태 → 무엇을 보여 줄지. 네 줄이 이 기능의 명세다.
const STATUS_TEXT = {
  both:    'logStatusBoth',
  workout: 'logStatusWorkout',
  diet:    'logStatusDiet',
  none:    'logStatusNone',
};

// ── 오늘 상태 카드 ────────────────────────────────────────────

function paintStatus(dateStr) {
  const box = el('log-status');
  if (!box) return;
  const day = loadDay(dateStr);
  const status = dayStatus(day);
  const diet = dietState(day);

  // kind 가 색을 가른다. 월간 캘린더에서 운동은 민트, 식단은 노랑인데
  // 여기만 둘 다 민트였다 — 같은 화면에서 같은 것을 두 색으로 부르고 있었다.
  const chip = (on, partial, label, kind) =>
    `<span class="log-chip ${kind}${on ? ' on' : partial ? ' partial' : ''}">` +
    `<span class="log-chip-mark" aria-hidden="true">${on ? ICON.check : ICON.minus}</span>` +
    `<span>${esc(label)}</span></span>`;

  box.dataset.status = status;
  box.innerHTML =
    `<div class="kick">${esc(t(S.logToday))}</div>` +
    `<div class="log-status-line">${esc(t(S[STATUS_TEXT[status]]))}</div>` +
    '<div class="log-chips">' +
    chip(!!day.workout, false, t(S.logWorkout), 'w') +
    chip(diet === 'done', diet === 'partial', t(S.logDiet), 'd') +
    '</div>' +
    (diet === 'partial'
      ? `<p class="dim log-partial">${esc(t(S.logDietPartial))}</p>`
      : '');
}

// ── 체크칸 ────────────────────────────────────────────────────

/**
 * 운동 한 칸과 끼니 네 칸.
 *
 * 운동 칸은 실제 완주가 켜 준다(app.js 의 recordCompletion → markWorkoutDone).
 * 손으로도 켤 수 있게 열어 두는 이유: 이 앱 밖에서 한 운동 — 헬스장에 간
 * 날, 등산한 날 — 도 그날의 운동이다. 앱에서 한 것만 세면 기록지가
 * 실제 생활과 어긋난다.
 */
function paintChecks(dateStr) {
  const box = el('log-check');
  if (!box) return;
  const day = loadDay(dateStr);
  const body = loadBody();
  const nut = nutritionPlan(body);
  const meals = nut ? mealPlan(nut, dateStr) : null;

  const row = (id, kind, on, title, sub) =>
    `<button class="log-row card${on ? ' on' : ''}" type="button" data-check="${kind}" data-id="${id}">` +
    `<span class="log-box" aria-hidden="true">${on ? ICON.check : ''}</span>` +
    '<span class="row-main">' +
    `<span class="row-t">${esc(title)}</span>` +
    (sub ? `<span class="row-d dim">${esc(sub)}</span>` : '') +
    '</span></button>';

  let html = `<div class="section-label">${esc(t(S.logWorkoutSection))}</div>`;
  html += row('workout', 'workout', !!day.workout, t(S.logWorkoutCheck), t(S.logWorkoutCheckSub));

  html += `<div class="section-label">${esc(t(S.logDietSection))}</div>`;
  MEAL_SPLIT.forEach((m) => {
    const planned = meals && meals.find((x) => x.id === m.id);
    const sub = planned
      ? planned.rows.slice(0, 2).map((r) => t(r.food.label)).join(', ') + ' · ' + planned.kcal + 'kcal'
      : t(S.logNoPlan);
    html += row(m.id, 'meal', !!(day.meals || {})[m.id], t(m.label), sub);
  });
  html += `<p class="dim log-note">${esc(t(S.logDietRule))}</p>`;

  box.innerHTML = html;
}

// ── 물·체중·그날 기분 ─────────────────────────────────────────

function paintExtra(dateStr) {
  const box = el('log-extra');
  if (!box) return;
  const day = loadDay(dateStr);
  const body = loadBody();
  const nut = nutritionPlan(body);
  const cups = nut ? nut.waterCups : 8;
  const drank = Math.min(day.water || 0, cups);

  const mood = MOOD_OPTIONS.find((o) => o.id === day.mood);
  const drive = DRIVE_OPTIONS.find((o) => o.id === day.drive);

  let html = `<div class="kick">${esc(t(S.logExtra))}</div>`;

  // 물. 컵을 눌러서 채운다 — 숫자 입력칸으로 두면 아무도 안 적는다.
  html += '<div class="log-water-row">' +
    '<span class="log-water-head">' +
    `<span class="log-water-l">${esc(t(S.logWater))}</span>` +
    `<span class="log-water-n">${drank}/${cups}</span>` +
    '</span>' +
    '<span class="log-cups">' +
    Array.from({ length: cups }, (_, i) =>
      `<button class="log-cup${i < drank ? ' on' : ''}" type="button" data-cup="${i + 1}" ` +
      `aria-label="${esc(t(S.logWaterCup).replace('%s', i + 1))}"></button>`
    ).join('') +
    '</span>' +
    '</div>';

  // 오늘 체중. 여기서 적으면 신체정보의 체중도 같이 바뀐다 — 두 곳에 따로
  // 적게 두면 계획은 옛 체중으로 계산되고 기록지만 새 체중을 안다.
  html += '<div class="log-weight-row">' +
    `<label class="log-weight-l" for="log-weight-input">${esc(t(S.logWeight))}</label>` +
    '<span class="inp-wrap">' +
    `<input class="inp" id="log-weight-input" type="number" inputmode="decimal" min="25" max="250" step="0.1" ` +
    `value="${day.weightKg == null ? '' : day.weightKg}" placeholder="${body.weightKg == null ? '65' : body.weightKg}">` +
    '<span class="inp-unit">kg</span></span>' +
    '</div>';
  html += `<p class="dim log-note">${esc(t(S.logWeightNote))}</p>`;

  // 아침 설문 답. 버려지는 질문이 아니게 하려면 되돌아볼 자리가 있어야 한다.
  if (mood || drive) {
    html += '<div class="log-mood-row">' +
      `<span class="log-mood-l">${esc(t(S.logCheckin))}</span>` +
      `<span class="log-mood-v">${mood ? mood.emoji + ' ' + esc(t(mood.label)) : ''}` +
      `${drive ? ' · ' + drive.emoji + ' ' + esc(t(drive.label)) : ''}</span>` +
      '</div>';
  }

  box.innerHTML = html;
}

// ── 최근 14일 스트립 ──────────────────────────────────────────
//
// 칸 하나를 반으로 갈라 왼쪽이 운동, 오른쪽이 식단이다. 한 칸에 색 하나만
// 쓰면 '둘 다' 와 '하나만' 을 구별하려고 네 가지 색을 만들어야 하고,
// 색 네 개는 범례를 봐야 읽힌다. 반으로 가르면 채워진 개수가 곧 답이다.

function paintStrip(dateStr) {
  const strip = el('log-strip');
  if (!strip) return;
  const days = recentDays(14, dateStr);

  strip.innerHTML = days.map((d) => {
    const dt = new Date(d.date + 'T00:00:00');
    const isToday = d.date === dateStr;
    const diet = dietState(d.day);
    // 반쪽 두 개는 따로 감싼다. 처음에는 날짜 숫자를 칸 안에 절대배치로
    // 얹었는데, 칸의 overflow:hidden(반쪽의 둥근 모서리를 자르는 것)이
    // 숫자까지 잘라 버려서 날짜가 아예 안 보였다.
    return `<div class="log-day${isToday ? ' today' : ''}" data-status="${d.status}" ` +
      `title="${esc(d.date)}">` +
      '<span class="log-day-cells">' +
      '<span class="log-half w' + (d.day.workout ? ' on' : '') + '"></span>' +
      '<span class="log-half d' + (diet === 'done' ? ' on' : diet === 'partial' ? ' partial' : '') + '"></span>' +
      '</span>' +
      `<span class="log-day-n">${dt.getDate()}</span>` +
      '</div>';
  }).join('');

  const streaks = el('log-streaks');
  if (streaks) {
    streaks.textContent = t(S.logStreaks)
      .replace('%s', streakOf('workout', dateStr))
      .replace('%s', streakOf('diet', dateStr));
  }

  const legend = el('log-legend');
  if (legend) {
    legend.innerHTML =
      `<span class="lg-item"><i class="lg-sw w"></i>${esc(t(S.logWorkout))}</span>` +
      `<span class="lg-item"><i class="lg-sw d"></i>${esc(t(S.logDiet))}</span>` +
      `<span class="lg-item"><i class="lg-sw p"></i>${esc(t(S.logDietPartialShort))}</span>`;
  }
}

// ── 이번 달 캘린더 ────────────────────────────────────────────

function paintCalendar(dateStr) {
  const grid = el('log-cal-grid');
  if (!grid) return;
  const [y, m] = dateStr.split('-').map(Number);
  const today = Number(dateStr.split('-')[2]);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  const dow = t({
    ko: ['일', '월', '화', '수', '목', '금', '토'],
    en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    zh: ['日', '一', '二', '三', '四', '五', '六'],
  });

  let html = dow.map((d) => `<div class="cal-dow">${esc(d)}</div>`).join('');
  for (let i = 0; i < firstDow; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const day = loadDay(key);
    const status = dayStatus(day);
    const diet = dietState(day);
    // 앞으로 올 날은 '미완' 이 아니다 — 아직 오지 않았을 뿐이다.
    const when = d === today ? ' today' : d > today ? ' future' : '';
    html += `<div class="cal-day log-cal${when}" data-status="${status}">` +
      `<span class="log-cal-n">${d}</span>` +
      '<span class="log-cal-marks" aria-hidden="true">' +
      '<i class="lc-w' + (day.workout ? ' on' : '') + '"></i>' +
      '<i class="lc-d' + (diet === 'done' ? ' on' : diet === 'partial' ? ' partial' : '') + '"></i>' +
      '</span></div>';
  }
  grid.innerHTML = html;

  const monthEl = el('log-cal-month');
  if (monthEl) {
    monthEl.textContent = t({
      ko: `${y}년 ${m}월`,
      en: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      zh: `${y}年${m}月`,
    });
  }
  const sumEl = el('log-cal-sum');
  if (sumEl) {
    const tally = monthTally(dateStr);
    sumEl.textContent = t(S.logMonthSum)
      .replace('%s', tally.both)
      .replace('%s', tally.workout)
      .replace('%s', tally.diet);
  }
}

// ── 홈의 '오늘 두 칸' 카드 ────────────────────────────────────

export function renderTodayCard() {
  const card = el('today-card');
  if (!card) return;
  const date = dayKey();
  const day = loadDay(date);
  const status = dayStatus(day);
  const diet = dietState(day);

  const mark = (on, partial, kind) =>
    `<span class="tc-mark ${kind}${on ? ' on' : partial ? ' partial' : ''}" aria-hidden="true">${on ? ICON.check : ''}</span>`;

  card.dataset.status = status;
  card.innerHTML =
    '<div class="tc-head">' +
    `<span class="week-title">${esc(t(S.logToday))}</span>` +
    `<span class="dim tc-status">${esc(t(S[STATUS_TEXT[status]]))}</span>` +
    '</div>' +
    '<div class="tc-rows">' +
    `<span class="tc-row">${mark(!!day.workout, false, 'w')}<span>${esc(t(S.logWorkout))}</span></span>` +
    `<span class="tc-row">${mark(diet === 'done', diet === 'partial', 'd')}<span>${esc(t(S.logDiet))}` +
    (diet === 'partial' ? ` <em>${esc(t(S.logDietPartialShort))}</em>` : '') +
    '</span></span>' +
    '</div>' +
    `<button class="sec2 tc-open" type="button" id="today-card-open">${esc(t(S.logOpen))}</button>`;
}

// ── 다시 그리기 ───────────────────────────────────────────────

export function renderLogScreen(dateStr = dayKey()) {
  try { paintStatus(dateStr); } catch (e) { console.error('paintStatus failed:', e); }
  try { paintChecks(dateStr); } catch (e) { console.error('paintChecks failed:', e); }
  try { paintExtra(dateStr); } catch (e) { console.error('paintExtra failed:', e); }
  try { paintStrip(dateStr); } catch (e) { console.error('paintStrip failed:', e); }
  try { paintCalendar(dateStr); } catch (e) { console.error('paintCalendar failed:', e); }
}

// ── 붙이기 ────────────────────────────────────────────────────

export function initLog({ translate, STATIC_UI, onShowScreen } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (typeof onShowScreen === 'function') goScreen = onShowScreen;

  // 안쪽은 다시 그릴 때마다 새로 만들어진다. 화면 하나에서 한 번만 듣고
  // 위임한다 — 버튼마다 듣게 하면 다시 그릴 때마다 리스너가 쌓인다.
  try {
    el('log-screen')?.addEventListener('click', (e) => {
      const date = dayKey();

      const check = e.target.closest('[data-check]');
      if (check) {
        const day = loadDay(date);
        if (check.dataset.check === 'workout') {
          saveDay(date, { workout: !day.workout });
        } else {
          const id = check.dataset.id;
          saveDay(date, { meals: { [id]: !(day.meals || {})[id] } });
        }
        renderLogScreen(date);
        renderTodayCard();
        return;
      }

      const cup = e.target.closest('[data-cup]');
      if (cup) {
        const n = Number(cup.dataset.cup);
        const day = loadDay(date);
        // 같은 컵을 다시 누르면 거기까지 지운다. 잘못 누른 것을 되돌리는
        // 길이 없으면 사람들은 아예 안 누른다.
        saveDay(date, { water: day.water === n ? n - 1 : n });
        paintExtra(date);
      }
    });

    // 체중은 입력이 끝났을 때 한 번만 저장한다. 글자마다 저장하면
    // '6' 을 넣는 순간 체중 6kg 이 신체정보로 넘어간다.
    el('log-screen')?.addEventListener('change', (e) => {
      if (e.target.id !== 'log-weight-input') return;
      const v = Number(e.target.value);
      if (!Number.isFinite(v) || v <= 0) return;
      const date = dayKey();
      saveDay(date, { weightKg: v });
      saveBody({ weightKg: v });
    });

    el('log-back-btn')?.addEventListener('click', () => goScreen('start-screen'));
  } catch (e) {
    console.error('log screen setup failed:', e);
  }

  // 홈 카드
  try {
    el('start-screen')?.addEventListener('click', (e) => {
      if (!e.target.closest('#today-card-open')) return;
      renderLogScreen();
      goScreen('log-screen');
    });
  } catch (e) {
    console.error('today card setup failed:', e);
  }

  // 운동을 끝내면 두 자리가 같이 갱신된다. 결과 화면에서 홈으로 돌아왔을 때
  // 기록지가 옛 상태를 들고 있으면 방금 한 운동이 없는 것처럼 보인다.
  document.addEventListener('qfit:completed', () => {
    try { renderTodayCard(); renderLogScreen(); } catch (e) { console.error('log repaint failed:', e); }
  });
  document.addEventListener('qfit:daylog', () => {
    try { renderTodayCard(); } catch (e) { console.error('today card repaint failed:', e); }
  });
  document.addEventListener('qfit:lang', () => {
    try { renderTodayCard(); renderLogScreen(); } catch (e) { console.error('log repaint failed:', e); }
  });
  // 화면이 열릴 때마다 다시 그린다. 자정을 넘겨 앱을 켜 둔 채로 들어오면
  // 어제 기록지를 보게 되는데, 그게 제일 알아채기 어려운 오류다.
  document.addEventListener('screenchange', (e) => {
    if (e.detail.id === 'log-screen') renderLogScreen();
    if (e.detail.id === 'start-screen') renderTodayCard();
  });

  try { renderTodayCard(); renderLogScreen(); } catch (e) { console.error('initial log render failed:', e); }
}
