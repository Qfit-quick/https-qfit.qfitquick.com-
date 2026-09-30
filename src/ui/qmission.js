// Q-Mission·Q-Impact(2026-09-27) — 홈의 '오늘 두 칸'(운동·식단 체크
// 바로가기) 을 대신한다. 운동 밖에서 하는 작은 선행을 매일 몇 개
// 추천하고, 체크하면 그걸로 끝이다 — "당신은 착한 사람입니다" 같은
// 평가 문구를 안 쓴다(사용자 요청, 이 앱의 "카메라도 판정도 없다"
// 태그라인과도 같은 결). 완료한 것은 이번 달 카테고리별 집계로만
// 쌓인다(Q-Impact).
//
// 저장은 이 파일 안에서 끝난다 — src/health/store.js(신체정보·기록지)
// 나 myProfile(app.js, 운동 XP·완주)에 안 얹는다. 둘 다 이미 클라우드
// 동기화·병합 로직을 지고 있어서, 평가하지 않기로 한 이 점수를 거기
// 섞으면 그 복잡도를 그대로 물려받는다.
import { QM_CATEGORIES, QM_MISSIONS, QM_POINTS_PER_MISSION, QM_DAILY_PICK_COUNT, QM_DAILY_HEALTH_PICK_COUNT } from '../data/qmissions.js';
import { dayKey, shiftDay } from '../health/store.js';
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

const TODAY_KEY = 'qfit_qmission_v1';
const IMPACT_KEY = 'qfit_qimpact_v1';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : fallback;
  } catch (e) {
    console.error('qmission read failed:', key, e);
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error('qmission write failed:', key, e); }
}

// 날짜 문자열을 시드로 쓰는 아주 단순한 해시 PRNG(mulberry32). 그날 하루는
// 몇 번을 다시 그려도 같은 셋이 뽑혀야 한다 — Math.random() 을 그대로
// 쓰면 화면을 다시 열 때마다 추천이 바뀌어서 "오늘의 미션"이라는 말이
// 거짓이 된다.
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function takeRandom(pool, rand, count) {
  const picked = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

/** 그 날짜에 추천할 미션(항상 같은 결과) — 운동 관련(health) 을 먼저
 * QM_DAILY_HEALTH_PICK_COUNT 개 뽑고, 나머지는 다른 카테고리에서 채운다
 * (2026-09-27 요청 "운동 관련 하나 일반 하나"). */
function picksForDate(dateStr) {
  const rand = seededRandom(dateStr);
  const healthPool = QM_MISSIONS.filter((m) => m.category === 'health');
  const generalPool = QM_MISSIONS.filter((m) => m.category !== 'health');
  const health = takeRandom(healthPool, rand, QM_DAILY_HEALTH_PICK_COUNT);
  const general = takeRandom(generalPool, rand, Math.max(0, QM_DAILY_PICK_COUNT - health.length));
  return [...health, ...general];
}

function missionByKey(key) { return QM_MISSIONS.find((m) => m.key === key); }
function categoryByKey(key) { return QM_CATEGORIES.find((c) => c.key === key); }

// 2026-09-29 "일주일 것도 보이게" 요청 전에는 오늘 하루치 {date, done}
// 만 저장했다 — 날짜가 바뀌면 완료 표시가 통째로 사라져서, 지난 며칠에
// 뭘 골랐고 뭘 했는지 다시 볼 방법이 없었다. 날짜별 완료 목록을 두는
// 걸로 바꾼다. 추천 자체(어떤 미션 3개였는지)는 그대로 picksForDate()
// 가 날짜만으로 다시 계산하므로 안 쌓아 둬도 된다 — 쌓아 두는 건 "그중
// 뭘 체크했는지"뿐이다.
const HISTORY_DAYS_KEPT = 60; // 무한정 안 늘어나게. 주간 보기는 7일이면 된다.

function loadHistory() {
  const saved = read(TODAY_KEY, null);
  if (saved && saved.history && typeof saved.history === 'object') return saved.history;
  // 옛 판({date, done}) 을 만나면 그 하루치만 이어받는다 — 버리면 오늘
  // 이미 체크한 게 날아간다.
  if (saved && saved.date && Array.isArray(saved.done)) return { [saved.date]: saved.done };
  return {};
}
function saveHistory(history) {
  const keys = Object.keys(history).sort();
  if (keys.length > HISTORY_DAYS_KEPT) {
    keys.slice(0, keys.length - HISTORY_DAYS_KEPT).forEach((k) => delete history[k]);
  }
  write(TODAY_KEY, { history });
}

function doneForDate(dateStr) {
  const history = loadHistory();
  return Array.isArray(history[dateStr]) ? history[dateStr] : [];
}

function loadToday() {
  const today = dayKey();
  return { date: today, done: doneForDate(today) };
}
function saveToday(next) {
  const history = loadHistory();
  history[next.date] = next.done;
  saveHistory(history);
}

function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }

function loadImpact() {
  const impact = read(IMPACT_KEY, { totalQ: 0, monthly: {} });
  if (typeof impact.totalQ !== 'number') impact.totalQ = 0;
  if (!impact.monthly || typeof impact.monthly !== 'object') impact.monthly = {};
  return impact;
}
function saveImpact(next) { write(IMPACT_KEY, next); }

/** 체크·체크해제 — 완료 쪽으로 바뀔 때만 이번 달 집계·누적 Q 를 올리고,
 * 되돌리면 그만큼 내린다(잘못 눌러도 숫자가 영영 부풀지 않는다). */
function toggleMission(key) {
  const mission = missionByKey(key);
  if (!mission) return;
  const today = loadToday();
  const wasDone = today.done.includes(key);
  today.done = wasDone ? today.done.filter((k) => k !== key) : [...today.done, key];
  saveToday(today);

  const impact = loadImpact();
  const mk = monthKeyOf(today.date);
  const bucket = impact.monthly[mk] || {};
  const delta = wasDone ? -1 : 1;
  bucket[mission.category] = Math.max(0, (bucket[mission.category] || 0) + delta);
  impact.monthly[mk] = bucket;
  impact.totalQ = Math.max(0, impact.totalQ + delta * QM_POINTS_PER_MISSION);
  saveImpact(impact);
}

function thisMonthTally() {
  const impact = loadImpact();
  const bucket = impact.monthly[monthKeyOf(dayKey())] || {};
  const rows = QM_CATEGORIES.map((c) => ({ ...c, count: bucket[c.key] || 0 }));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return { rows, total, totalQ: impact.totalQ };
}

// ── 이번 주 ───────────────────────────────────────────────────
// 오늘이 든 월~일 이레 — 홈 화면 week-strip("이번 주")과 같은 기준으로
// 맞춘다. picksForDate() 는 날짜만 있으면 언제든 같은 결과를 다시
// 계산하므로, 지난 날뿐 아니라 이번 주 안의 앞으로 올 날도 미리 보여줄
// 수 있다 — 다만 완료 표시는 실제로 그 날을 산 기록(doneForDate)에서만
// 나온다.
let selectedWeekDate = null; // 주간 스트립에서 고른 날짜. null 이면 안 펼친 상태.

// programs.js 의 formatDate() 와 같은 방식 — 이 앱에서 날짜 하나를 보여줄
// 때 쓰는 정해진 모양이다.
function formatWeekDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return t({
    ko: `${m}월 ${d}일`,
    en: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    zh: `${m}月${d}日`,
  });
}

function weekDates() {
  const today = dayKey();
  const mondayOffset = (new Date().getDay() + 6) % 7; // 월=0 … 일=6
  const monday = shiftDay(today, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}

function renderWeekSection() {
  const strip = el('qmission-week-strip');
  const detail = el('qmission-week-detail');
  if (!strip) return;
  const today = dayKey();
  const dow = t({ ko: ['월', '화', '수', '목', '금', '토', '일'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], zh: ['一', '二', '三', '四', '五', '六', '日'] });

  strip.innerHTML = weekDates().map((date, i) => {
    const picks = picksForDate(date);
    const doneKeys = doneForDate(date);
    const doneCount = picks.filter((m) => doneKeys.includes(m.key)).length;
    const isToday = date === today;
    const isFuture = date > today;
    const state = isToday ? 'today' : isFuture ? 'future' : (doneCount === picks.length ? 'done' : 'miss');
    const dotContent = doneCount === picks.length && picks.length > 0 ? ICON.check : (doneCount > 0 ? String(doneCount) : '');
    const on = date === selectedWeekDate ? ' on' : '';
    return `<button class="week-day ${state}${on}" type="button" data-date="${esc(date)}" aria-pressed="${date === selectedWeekDate}">` +
      `<span class="wd-label">${esc(dow[i])}</span>` +
      `<span class="wd-dot">${dotContent}</span>` +
      '</button>';
  }).join('');

  if (!detail) return;
  if (!selectedWeekDate) {
    detail.innerHTML = '';
    detail.hidden = true;
    return;
  }
  detail.hidden = false;
  const picks = picksForDate(selectedWeekDate);
  const doneKeys = doneForDate(selectedWeekDate);
  const label = formatWeekDate(selectedWeekDate);
  detail.innerHTML =
    `<p class="qm-week-detail-date">${esc(label)}</p>` +
    '<ul class="qm-card-list">' +
    picks.map((m) => {
      const on = doneKeys.includes(m.key);
      return `<li class="qm-card-row${on ? ' on' : ''}">` +
        `<span class="qm-card-mark" aria-hidden="true">${on ? ICON.check : ''}</span>` +
        `<span>${esc(t(m.label))}</span></li>`;
    }).join('') +
    '</ul>';
}

// ── 홈 카드 ───────────────────────────────────────────────────

export function renderQMissionCard() {
  const card = el('qmission-card');
  if (!card) return;
  const today = loadToday();
  const picks = picksForDate(today.date);
  const doneCount = picks.filter((m) => today.done.includes(m.key)).length;
  // "A · B · C" 한 줄로 이어붙이던 것을(2026-09-27 가독성 요청으로 바꿈)
  // 세로 목록으로 바꿨다 — 회색 글자를 가운뎃점으로 이은 한 문장은 눈이
  // 어디서 끊어 읽어야 할지 매번 다시 찾아야 한다.
  const previewRows = picks.map((m) => {
    const on = today.done.includes(m.key);
    return `<li class="qm-card-row${on ? ' on' : ''}">` +
      `<span class="qm-card-mark" aria-hidden="true">${on ? ICON.check : ''}</span>` +
      `<span>${esc(t(m.label))}</span></li>`;
  }).join('');

  card.innerHTML =
    '<div class="tc-head">' +
    `<span class="week-title">${esc(t(S.qmCardTitle))}</span>` +
    `<span class="dim tc-status">${esc(t(S.qmCardStatus).replace('%s', doneCount).replace('%s', picks.length))}</span>` +
    '</div>' +
    `<ul class="qm-card-list">${previewRows}</ul>` +
    `<button class="sec2 tc-open" type="button" id="qmission-card-open">${esc(t(S.qmCardOpenBtn))}</button>`;
}

// ── 전체 화면 ─────────────────────────────────────────────────

function renderMissionList() {
  const box = el('qmission-list');
  if (!box) return;
  const today = loadToday();
  const picks = picksForDate(today.date);
  box.innerHTML = picks.map((m) => {
    const on = today.done.includes(m.key);
    const cat = categoryByKey(m.category);
    return `<button class="log-row card${on ? ' on' : ''}" type="button" data-mission="${esc(m.key)}">` +
      `<span class="log-box" aria-hidden="true">${on ? ICON.check : ''}</span>` +
      '<span class="row-main">' +
      `<span class="row-t">${esc(t(m.label))}</span>` +
      (cat ? `<span class="qm-cat-tag">${esc(t(cat.label))}</span>` : '') +
      '</span></button>';
  }).join('');
}

function renderImpactSection() {
  const box = el('qmission-impact');
  if (!box) return;
  const { rows, total, totalQ } = thisMonthTally();
  if (!total) {
    box.innerHTML = `<p class="dim">${esc(t(S.qmImpactEmpty))}</p>`;
    return;
  }
  box.innerHTML =
    `<p class="qm-impact-lead">${esc(t(S.qmImpactNarrative).replace('%s', total))}</p>` +
    '<ul class="recovery-list">' +
    rows.filter((r) => r.count > 0).map((r) =>
      `<li>${esc(t(r.label))} — ${r.count}</li>`
    ).join('') +
    '</ul>' +
    `<p class="dim">${esc(t(S.qmPointsLabel).replace('%s', totalQ))}</p>`;
}

export function renderQMissionScreen() {
  // 화면에 새로 들어올 때마다 펼침 상태를 접어 둔다 — 어제 펼쳐 뒀던
  // 날짜가 다음에 열었을 때도 그대로 펼쳐져 있으면 어색하다.
  selectedWeekDate = null;
  renderMissionList();
  renderWeekSection();
  renderImpactSection();
}

export function initQMission({ translate, STATIC_UI, onShowScreen } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (typeof onShowScreen === 'function') goScreen = onShowScreen;

  // 홈 카드 열기 — log.js 의 today-card-open 과 같은 자리(위임 리스너를
  // start-screen 에 건다. 카드는 언어가 바뀌면 다시 그려지므로).
  el('start-screen')?.addEventListener('click', (e) => {
    if (!e.target.closest('#qmission-card-open')) return;
    renderQMissionScreen();
    goScreen('q-mission-screen');
  });

  el('qmission-back-btn')?.addEventListener('click', () => goScreen('start-screen'));

  el('qmission-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mission]');
    if (!btn) return;
    toggleMission(btn.dataset.mission);
    renderMissionList();
    renderWeekSection();
    renderImpactSection();
    renderQMissionCard();
  });

  // 이번 주 스트립 — 같은 날을 다시 누르면 접는다(토글), 다른 날을
  // 누르면 그 날로 바뀐다.
  el('qmission-week-strip')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-date]');
    if (!btn) return;
    selectedWeekDate = selectedWeekDate === btn.dataset.date ? null : btn.dataset.date;
    renderWeekSection();
  });

  document.addEventListener('qfit:lang', () => {
    renderQMissionCard();
    if (document.getElementById('q-mission-screen')?.classList.contains('active')) renderQMissionScreen();
  });
  // 자정을 넘겨 앱을 켜 둔 채로 돌아오면 어제 추천이 보이는 것을 막는다
  // (log.js 의 같은 이유의 screenchange 리스너 참고).
  document.addEventListener('screenchange', (e) => {
    if (e.detail.id === 'start-screen') renderQMissionCard();
    if (e.detail.id === 'q-mission-screen') renderQMissionScreen();
  });
}
