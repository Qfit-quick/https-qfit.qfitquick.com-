// 신체정보 화면과 계획 화면.
//
// 두 화면을 한 파일에 둔 이유: 신체정보는 계획을 만들기 위한 입력이고,
// 계획은 그 입력의 출력이다. 나눠 두면 "무엇을 저장하면 무엇이 다시 그려지나"
// 가 두 파일에 흩어지는데, 그 관계가 이 기능의 전부다.
//
// 계산은 하지 않는다 — 전부 src/data/plan.js 의 순수 함수다. 여기는 그 값을
// 화면에 옮기는 일만 한다.

import {
  SEX_OPTIONS, ACTIVITY_OPTIONS, GOAL_OPTIONS,
  nutritionPlan, workoutPlan, mealPlan, mealPlanTotals,
  bmiOf, bmiBand, healthyWeightRange, todayIndex,
  FOCUS_LABEL, DOW_LABEL, ADD_ONS,
} from '../data/plan.js';
import { EATING_OUT } from '../data/foods.js';
import { INTENSITY } from '../data/checkin.js';
import { loadBody, saveBody, bodyReady, dayKey, loadDay } from '../health/store.js';
import { todaysIntensity, todaysQuote } from './gate.js';
import { EXERCISES } from '../data/exercises.js';
import { toast } from './toast.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let startRoutine = () => {};
let goScreen = () => {};

const el = (id) => document.getElementById(id);
const EX_LABEL = Object.fromEntries(EXERCISES.map((e) => [e.key, e.label]));

// 마크업을 문자열로 조립하므로, 사람이 넣은 값은 반드시 여기를 지나야 한다.
// 닉네임·메모처럼 자유 입력이 들어오는 자리가 이 화면에도 있다.
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── 신체정보 화면 ─────────────────────────────────────────────

let draft = null;

/** 두 갈래 토글(성별·경험). 세 개 이상은 sheet-rows 를 쓴다. */
function paintSeg(box, options, current, onPick) {
  if (!box) return;
  box.innerHTML = '';
  options.forEach((opt) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn' + (opt.id === current ? ' on' : '');
    b.setAttribute('aria-pressed', opt.id === current ? 'true' : 'false');
    b.textContent = t(opt.label);
    b.addEventListener('click', () => onPick(opt.id));
    box.appendChild(b);
  });
}

/** 세 갈래 이상은 줄(row44)로. 설명 한 줄이 붙어야 고를 수 있는 값들이다. */
function paintRows(box, options, current, onPick) {
  if (!box) return;
  box.innerHTML = '';
  options.forEach((opt) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'row44 card pick-row' + (opt.id === current ? ' on' : '');
    b.setAttribute('aria-pressed', opt.id === current ? 'true' : 'false');
    b.innerHTML =
      '<span class="row-main">' +
      `<span class="row-t">${esc(t(opt.label))}</span>` +
      (opt.sub ? `<span class="row-d dim">${esc(t(opt.sub))}</span>` : '') +
      '</span><span class="pick-mark" aria-hidden="true"></span>';
    b.addEventListener('click', () => onPick(opt.id));
    box.appendChild(b);
  });
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * 값이 사람의 몸일 수 있는 범위인가.
 *
 * 막지는 않고 알린다. 진짜로 키 210cm 인 사람이 있고, 막아 버리면 그 사람은
 * 앱을 못 쓴다. 다만 170 을 17 로 잘못 넣은 것은 계산 결과가 이상해지므로
 * 그 자리에서 보여야 한다 — 조용히 받아 두면 하루 400kcal 짜리 식단이 나온다.
 */
function checkRanges() {
  const warn = el('body-warn');
  if (!warn) return;
  const msgs = [];
  if (draft.age && (draft.age < 14 || draft.age > 100)) msgs.push(t(S.bodyWarnAge));
  if (draft.heightCm && (draft.heightCm < 120 || draft.heightCm > 220)) msgs.push(t(S.bodyWarnHeight));
  if (draft.weightKg && (draft.weightKg < 30 || draft.weightKg > 200)) msgs.push(t(S.bodyWarnWeight));
  warn.textContent = msgs.join(' ');
  warn.hidden = msgs.length === 0;
}

const LEVEL_OPTIONS = [
  { id:'novice', label:{ko:'처음이에요', en:'New to it', zh:'刚开始'} },
  { id:'pro', label:{ko:'해 봤어요', en:'Experienced', zh:'有经验'} },
];

function paintBodyForm() {
  draft = loadBody();

  // 네 묶음을 한 함수에서 같이 다시 칠한다. 고른 것을 표시하려면 그 묶음을
  // 다시 그려야 하는데, 묶음마다 자기를 다시 그리는 콜백을 따로 두면
  // 네 벌이 되고 한 벌만 고치는 사고가 난다.
  const repaintPicks = () => {
    paintSeg(el('body-sex'), SEX_OPTIONS, draft.sex, (id) => { draft.sex = id; repaintPicks(); });
    paintSeg(el('body-level'), LEVEL_OPTIONS, draft.level, (id) => { draft.level = id; repaintPicks(); });
    paintRows(el('body-activity'), ACTIVITY_OPTIONS, draft.activity, (id) => { draft.activity = id; repaintPicks(); });
    paintRows(el('body-goal'), GOAL_OPTIONS, draft.goal, (id) => { draft.goal = id; repaintPicks(); });
  };
  repaintPicks();

  const bind = (id, key) => {
    const input = el(id);
    if (!input) return;
    input.value = draft[key] == null ? '' : draft[key];
    input.addEventListener('input', () => {
      draft[key] = num(input.value);
      checkRanges();
    });
  };
  bind('body-age', 'age');
  bind('body-height', 'heightCm');
  bind('body-weight', 'weightKg');
  checkRanges();
}

function saveBodyForm() {
  const missing = [];
  if (!draft.age) missing.push(t(S.bodyAge));
  if (!draft.heightCm) missing.push(t(S.bodyHeight));
  if (!draft.weightKg) missing.push(t(S.bodyWeight));
  if (missing.length) {
    // 무엇이 비었는지 말한다. '입력해 주세요' 만 띄우면 세 칸 중 어느 것인지
    // 사용자가 하나씩 눌러 확인해야 한다.
    toast(t(S.bodyMissing).replace('%s', missing.join(', ')));
    return false;
  }
  saveBody(draft);
  toast(t(S.bodySaved));
  return true;
}

// ── 계획 화면 ─────────────────────────────────────────────────

let activeTab = 'today';

function tabTo(name) {
  activeTab = name;
  document.querySelectorAll('#plan-screen .plan-tab').forEach((b) => {
    const on = b.dataset.planTab === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  ['today', 'week', 'diet', 'numbers'].forEach((k) => {
    const pane = el('plan-pane-' + k);
    if (pane) pane.hidden = k !== name;
  });
}

const kcal = (n) => `${n}<span class="num-u">kcal</span>`;
const grams = (n) => `${n}<span class="num-u">g</span>`;

/** 큰 숫자 한 칸. 기록 화면의 통계 타일과 같은 모양을 쓴다. */
function statTile(label, value, sub) {
  return '<div class="tile plan-stat">' +
    `<div class="stat-label">${esc(label)}</div>` +
    `<div class="stat-val">${value}</div>` +
    (sub ? `<div class="val-sub">${esc(sub)}</div>` : '') +
    '</div>';
}

function routineLine(exKeys) {
  return exKeys.map((k) => esc(t(EX_LABEL[k] || { ko: k }))).join(' · ');
}

// 오늘 카드의 동작 이름은 한 줄로 이어 붙이면 서로 안 구별된다(가독성
// 피드백, 2026-09-10) — 동작마다 칩으로 나눠서 눈에 걸리는 자리를 준다.
// 주간 판(routineLine)은 한 줄에 요일 일곱 개를 다 넣어야 해서 칩이 안
// 맞으므로 그쪽은 그대로 둔다.
function routineChips(exKeys) {
  return '<div class="plan-day-chips">' +
    exKeys.map((k) => `<span class="plan-day-chip">${esc(t(EX_LABEL[k] || { ko: k }))}</span>`).join('') +
    '</div>';
}

// ── 오늘 판 ───────────────────────────────────────────────────

function paintToday(body, nut, week, meals) {
  const pane = el('plan-pane-today');
  if (!pane) return;
  const idx = todayIndex();
  const day = week[idx];
  const level = INTENSITY[todaysIntensity()] || INTENSITY.normal;
  const quote = todaysQuote();
  const log = loadDay();

  let html = '';

  // 아침 설문이 정한 강도를 먼저 말한다. 계획은 주 단위로 세워 두지만
  // 오늘 얼마나 할지는 오늘 컨디션이 정한다 — 그 연결을 여기서 보여 준다.
  html += '<div class="card plan-intensity">' +
    `<div class="kick">${esc(t(S.planTodayIntensity))}</div>` +
    `<div class="plan-intensity-row"><b>${esc(t(level.label))}</b><span class="dim">${esc(t(level.note))}</span></div>` +
    (quote ? `<p class="plan-quote">&ldquo;${esc(t(quote.text))}&rdquo; <span class="dim">— ${esc(t(quote.author))}</span></p>` : '') +
    '</div>';

  // 오늘 운동
  if (day.focus === 'rest') {
    html += '<div class="card plan-day-card rest">' +
      `<div class="kick">${esc(t(S.planTodayWorkout))}</div>` +
      `<div class="plan-day-t">${esc(t(FOCUS_LABEL.rest))}</div>` +
      `<p class="dim">${esc(t(S.planRestNote))}</p>` +
      (day.add ? `<p class="plan-add">${esc(t(ADD_ONS[day.add].label))}</p>` : '') +
      '</div>';
  } else {
    html += '<div class="card plan-day-card">' +
      `<div class="kick">${esc(t(S.planTodayWorkout))}</div>` +
      `<div class="plan-day-t">${esc(t(FOCUS_LABEL[day.focus]))}</div>` +
      routineChips(day.exKeys) +
      `<p class="dim plan-day-meta">${esc(
        t(S.planDayMeta).replace('%s', day.sets).replace('%s', day.secPerSet).replace('%s', day.kcal)
      )}</p>` +
      `<button class="primary plan-start-btn" type="button" data-plan-start="${idx}">${esc(t(S.planStartBtn))}</button>` +
      (day.add ? `<p class="plan-add">${esc(t(ADD_ONS[day.add].label))}</p>` : '') +
      '</div>';
  }

  // 오늘 식단 요약 — 끼니 넷과 목표 열량. 자세한 것은 식단 판에 있다.
  const totals = mealPlanTotals(meals);
  html += '<div class="card plan-diet-card">' +
    `<div class="kick">${esc(t(S.planTodayDiet))}</div>` +
    '<div class="plan-meal-mini">' +
    meals.map((m) => {
      const done = !!(log.meals || {})[m.id];
      return '<div class="plan-meal-mini-row' + (done ? ' done' : '') + '">' +
        `<span class="pm-name">${esc(t(m.label))}</span>` +
        `<span class="pm-food">${esc(m.rows.slice(0, 2).map((r) => t(r.food.label)).join(', '))}</span>` +
        `<span class="pm-kcal">${m.kcal}</span>` +
        '</div>';
    }).join('') +
    '</div>' +
    `<p class="dim plan-diet-sum">${esc(
      t(S.planDietSum).replace('%s', totals.kcal).replace('%s', nut.target).replace('%s', totals.p)
    )}</p>` +
    `<button class="sec2 plan-jump" type="button" data-plan-goto="diet">${esc(t(S.planSeeDiet))}</button>` +
    '</div>';

  pane.innerHTML = html;
  void body;
}

// ── 주간 운동 판 ──────────────────────────────────────────────

function paintWeek(body, week) {
  const pane = el('plan-pane-week');
  if (!pane) return;
  const idx = todayIndex();
  const active = week.filter((d) => d.focus !== 'rest');
  const weekKcal = active.reduce((s, d) => s + d.kcal, 0);
  const addMin = week.reduce((s, d) => s + (ADD_ONS[d.add] ? ADD_ONS[d.add].min : 0), 0);

  let html = '<div class="records-grid">' +
    statTile(t(S.planWeekDays), String(active.length), t(S.planWeekDaysSub)) +
    statTile(t(S.planWeekKcal), kcal(weekKcal), t(S.planWeekKcalSub)) +
    statTile(t(S.planWeekAdd), `${addMin}<span class="num-u">min</span>`, t(S.planWeekAddSub)) +
    '</div>';

  // WHO 지침을 그대로 적는다. 앱 세션만으로는 주 150분에 못 닿는다 —
  // 그 사실을 숨기면 앱이 충분하다고 거짓말하는 것이 된다.
  html += `<p class="plan-note">${t(S.planWhoNote)}</p>`;

  html += '<div class="plan-week-list">';
  week.forEach((d, i) => {
    const isToday = i === idx;
    html += `<div class="card plan-week-row${d.focus === 'rest' ? ' rest' : ''}${isToday ? ' today' : ''}">` +
      `<span class="pw-dow">${esc(t(DOW_LABEL[i]))}</span>` +
      '<span class="pw-main">' +
      `<span class="pw-focus">${esc(t(FOCUS_LABEL[d.focus]))}${isToday ? ` <em>${esc(t(S.planToday))}</em>` : ''}</span>` +
      `<span class="pw-list dim">${d.focus === 'rest'
        ? esc(t(ADD_ONS[d.add].label))
        : routineLine(d.exKeys) + ' · ' + esc(t(ADD_ONS[d.add].label))}</span>` +
      '</span>' +
      (d.focus === 'rest'
        ? '<span class="pw-kcal dim">—</span>'
        : `<button class="pw-go" type="button" data-plan-start="${i}" aria-label="${esc(t(S.planStartBtn))}">${d.kcal}<span class="num-u">kcal</span></button>`) +
      '</div>';
  });
  html += '</div>';

  pane.innerHTML = html;
  void body;
}

// ── 식단 판 ───────────────────────────────────────────────────

function paintDiet(nut, meals) {
  const pane = el('plan-pane-diet');
  if (!pane) return;
  const totals = mealPlanTotals(meals);
  const log = loadDay();

  let html = '<div class="records-grid plan-macro-head">' +
    statTile(t(S.planTargetKcal), kcal(nut.target), t(S.planTargetKcalSub)) +
    statTile(t(S.macroProtein), grams(nut.protein), `${Math.round((nut.protein * 4 / nut.target) * 100)}%`) +
    statTile(t(S.macroCarb), grams(nut.carb), `${Math.round((nut.carb * 4 / nut.target) * 100)}%`) +
    statTile(t(S.macroFat), grams(nut.fat), `${Math.round((nut.fat * 9 / nut.target) * 100)}%`) +
    '</div>';

  // 짠 식단이 목표에 얼마나 닿았는지 그대로 적는다. 1인분 단위를 0.25 로
  // 끊기 때문에 오차가 남는데, 그 오차를 감추면 목표 숫자가 장식이 된다.
  const gap = totals.kcal - nut.target;
  html += `<p class="plan-note plan-gap${Math.abs(gap) > nut.target * 0.06 ? ' warn' : ''}">` +
    esc(t(S.planActual)
      .replace('%s', totals.kcal)
      .replace('%s', (gap >= 0 ? '+' : '') + gap)
      .replace('%s', totals.p)) +
    '</p>';

  if (nut.floored) html += `<p class="plan-note warn">${esc(t(S.planFloorNote))}</p>`;
  if (nut.carbFloored) html += `<p class="plan-note warn">${esc(t(S.planCarbFloorNote))}</p>`;

  meals.forEach((m) => {
    const done = !!(log.meals || {})[m.id];
    html += `<div class="card plan-meal${done ? ' done' : ''}">` +
      '<div class="plan-meal-head">' +
      `<span class="plan-meal-name">${esc(t(m.label))}</span>` +
      `<span class="plan-meal-kcal">${m.kcal}<span class="num-u">kcal</span></span>` +
      '</div>' +
      '<div class="plan-meal-rows">' +
      m.rows.map((r) =>
        '<div class="pmr">' +
        `<span class="pmr-name">${esc(t(r.food.label))}</span>` +
        `<span class="pmr-amt">${esc(portionText(r))}</span>` +
        `<span class="pmr-kcal">${r.kcal}</span>` +
        '</div>'
      ).join('') +
      '</div>' +
      `<p class="dim plan-meal-macro">${esc(
        t(S.planMealMacro).replace('%s', m.p).replace('%s', m.c).replace('%s', m.f)
      )}</p>` +
      '</div>';
  });

  html += `<p class="dim plan-water">${esc(t(S.planWater).replace('%s', nut.waterMl).replace('%s', nut.waterCups))}</p>`;

  // 외식 표. 집밥만 적어 두면 이 계획은 실제 하루에 안 붙는다.
  html += '<div class="card plan-out">' +
    `<div class="kick">${esc(t(S.planEatOut))}</div>` +
    `<p class="dim">${esc(t(S.planEatOutSub))}</p>` +
    '<div class="plan-out-rows">' +
    EATING_OUT.map((o) =>
      '<div class="por">' +
      `<span class="por-name">${esc(t(o.label))}</span>` +
      `<span class="por-kcal">${o.kcal}<span class="num-u">kcal</span></span>` +
      `<span class="por-tip dim">${esc(t(o.tip))}</span>` +
      '</div>'
    ).join('') +
    '</div></div>';

  html += `<p class="plan-source">${esc(t(S.planDietSource))}</p>`;

  pane.innerHTML = html;
}

/** '1공기(210g)' 를 배수에 맞춰 고쳐 쓴다. 1배면 그대로 둔다. */
function portionText(row) {
  const base = t(row.food.serve);
  if (row.mult === 1) return base;
  const g = Math.round((row.food.serveG * row.mult) / 5) * 5;
  return `${base.replace(/\(.*\)/, '').trim()} x${row.mult} (${g}g)`;
}

// ── 내 숫자 판 ────────────────────────────────────────────────

function paintNumbers(body, nut) {
  const pane = el('plan-pane-numbers');
  if (!pane) return;
  const bmi = bmiOf(body);
  const band = bmiBand(bmi);
  const range = healthyWeightRange(body.heightCm);
  const act = ACTIVITY_OPTIONS.find((a) => a.id === body.activity) || ACTIVITY_OPTIONS[1];
  const goal = GOAL_OPTIONS.find((g) => g.id === body.goal) || GOAL_OPTIONS[1];

  let html = '<div class="records-grid plan-num-head">' +
    statTile(t(S.numBmi), String(bmi), t(band.label)) +
    statTile(t(S.numBmr), kcal(nut.bmr), t(S.numBmrSub)) +
    statTile(t(S.numTdee), kcal(nut.tdee), `x${act.factor}`) +
    statTile(t(S.numTarget), kcal(nut.target), t(goal.label)) +
    '</div>';

  if (range) {
    html += '<div class="card plan-range">' +
      `<div class="kick">${esc(t(S.numHealthyRange))}</div>` +
      `<div class="plan-range-line"><b>${range.min} ~ ${range.max}<span class="num-u">kg</span></b>` +
      `<span class="dim">${esc(t(S.numNowWeight).replace('%s', body.weightKg))}</span></div>` +
      `<p class="dim">${esc(t(S.numBmiStandard))}</p>` +
      '</div>';
  }

  html += '<div class="card plan-basis">' +
    `<div class="kick">${esc(t(S.numBasis))}</div>` +
    '<ul class="plan-basis-list">' +
    [S.numBasisBmr, S.numBasisTdee, S.numBasisProtein, S.numBasisCarb, S.numBasisWho]
      .map((k) => `<li>${t(k)}</li>`).join('') +
    '</ul></div>';

  html += `<button class="sec2 plan-edit" type="button" id="plan-edit-body">${esc(t(S.numEdit))}</button>`;
  html += `<p class="plan-source">${esc(t(S.planDisclaimer))}</p>`;

  pane.innerHTML = html;
}

// ── 다시 그리기 ───────────────────────────────────────────────

export function renderPlanScreen() {
  const body = loadBody();
  const empty = el('plan-empty');
  const main = el('plan-body');
  if (!bodyReady(body)) {
    if (empty) empty.hidden = false;
    if (main) main.hidden = true;
    return;
  }
  if (empty) empty.hidden = true;
  if (main) main.hidden = false;

  const nut = nutritionPlan(body);
  const week = workoutPlan(body, todaysIntensity());
  const meals = mealPlan(nut, dayKey());

  try { paintToday(body, nut, week, meals); } catch (e) { console.error('paintToday failed:', e); }
  try { paintWeek(body, week); } catch (e) { console.error('paintWeek failed:', e); }
  try { paintDiet(nut, meals); } catch (e) { console.error('paintDiet failed:', e); }
  try { paintNumbers(body, nut); } catch (e) { console.error('paintNumbers failed:', e); }
  tabTo(activeTab);

  // 계획을 만든 뒤에는 세션의 기본 루틴도 오늘 것으로 맞춘다. 이렇게 해 두면
  // 홈의 '1분 시작' 이 계획과 다른 운동을 내놓는 일이 없다.
  planCache = { body, nut, week, meals };
}

let planCache = null;

/** 더보기 메뉴의 '신체정보' 줄 아래 한 줄. */
export function bodySummaryLine() {
  const body = loadBody();
  if (!bodyReady(body)) return t(S.bodyNotSet);
  const nut = nutritionPlan(body);
  const goal = GOAL_OPTIONS.find((g) => g.id === body.goal);
  return t(S.bodySummary)
    .replace('%s', body.heightCm)
    .replace('%s', body.weightKg)
    .replace('%s', nut ? nut.target : '—')
    .replace('%s', goal ? t(goal.label) : '');
}

// ── 붙이기 ────────────────────────────────────────────────────

export function initPlan({ translate, STATIC_UI, onStartRoutine, onShowScreen } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (typeof onStartRoutine === 'function') startRoutine = onStartRoutine;
  if (typeof onShowScreen === 'function') goScreen = onShowScreen;

  // 신체정보 화면
  try {
    paintBodyForm();
    el('body-save-btn')?.addEventListener('click', () => {
      if (!saveBodyForm()) return;
      renderPlanScreen();
      goScreen('plan-screen');
    });
    el('body-back-btn')?.addEventListener('click', () => goScreen('more-screen'));
  } catch (e) {
    console.error('body form setup failed:', e);
  }

  // 계획 화면
  try {
    document.querySelectorAll('#plan-screen .plan-tab').forEach((b) => {
      b.addEventListener('click', () => tabTo(b.dataset.planTab));
    });
    el('plan-empty-btn')?.addEventListener('click', () => {
      paintBodyForm();
      goScreen('body-screen');
    });
    el('plan-back-btn')?.addEventListener('click', () => goScreen('start-screen'));

    // 판 안쪽은 다시 그릴 때마다 새로 만들어지므로, 버튼마다 듣게 하면
    // 리스너가 쌓인다. 화면 하나에서 한 번만 듣고 위임한다.
    el('plan-screen')?.addEventListener('click', (e) => {
      const start = e.target.closest('[data-plan-start]');
      if (start) {
        const i = Number(start.dataset.planStart);
        const day = planCache?.week?.[i];
        if (day && day.exKeys.length) {
          startRoutine({ keys: day.exKeys, totalSets: day.sets, durationPreset: day.preset });
        }
        return;
      }
      const goto = e.target.closest('[data-plan-goto]');
      if (goto) { tabTo(goto.dataset.planGoto); return; }
      if (e.target.closest('#plan-edit-body')) {
        paintBodyForm();
        goScreen('body-screen');
      }
    });
  } catch (e) {
    console.error('plan screen setup failed:', e);
  }

  // 더보기 메뉴의 두 줄
  try {
    el('open-body-btn')?.addEventListener('click', () => {
      paintBodyForm();
      goScreen('body-screen');
    });
  } catch (e) {
    console.error('open body button failed:', e);
  }

  // 신체정보가 바뀌면 계획이 따라 바뀐다. 부르는 쪽이 기억해야 하는 구조로
  // 두면 반드시 한 곳을 잊는다 — 저장소가 알림을 쏘고 여기서 듣는다.
  document.addEventListener('qfit:body', () => {
    try { renderPlanScreen(); } catch (e) { console.error('plan repaint failed:', e); }
  });
  document.addEventListener('qfit:daylog', () => {
    // 기록지에서 끼니를 체크하면 계획 화면의 '먹었음' 표시도 따라와야 한다.
    if (document.querySelector('.screen.active')?.id !== 'plan-screen') return;
    try { renderPlanScreen(); } catch (e) { console.error('plan repaint failed:', e); }
  });
  document.addEventListener('qfit:lang', () => {
    try { renderPlanScreen(); } catch (e) { console.error('plan repaint failed:', e); }
  });
  // 탭바는 이 화면을 여는 버튼 없이 곧장 켠다(via: null). 그래서 화면이
  // 켜지는 신호를 여기서 듣는다 — 안 그러면 자정을 넘겨 다시 들어왔을 때
  // 어제 식단이 그대로 남아 있고, 그건 알아채기가 제일 어렵다.
  document.addEventListener('screenchange', (e) => {
    if (e.detail.id !== 'plan-screen') return;
    try { renderPlanScreen(); } catch (err) { console.error('plan repaint failed:', err); }
  });
  // 더보기 메뉴의 '신체정보' 줄 아래 한 줄.
  const paintSummary = () => {
    const sub = el('body-summary-sub');
    if (sub) sub.textContent = bodySummaryLine();
  };
  document.addEventListener('screenchange', (e) => {
    if (e.detail.id === 'more-screen') paintSummary();
  });
  document.addEventListener('qfit:body', paintSummary);
  paintSummary();

  try { renderPlanScreen(); } catch (e) { console.error('initial plan render failed:', e); }
}
