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
import { QM_CATEGORIES, QM_MISSIONS, QM_POINTS_PER_MISSION, QM_DAILY_PICK_COUNT } from '../data/qmissions.js';
import { dayKey } from '../health/store.js';
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

/** 그 날짜에 추천할 미션(항상 같은 결과) — QM_MISSIONS 안에서 서로 다른 count 개. */
function picksForDate(dateStr) {
  const rand = seededRandom(dateStr);
  const pool = [...QM_MISSIONS];
  const picked = [];
  for (let i = 0; i < QM_DAILY_PICK_COUNT && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function missionByKey(key) { return QM_MISSIONS.find((m) => m.key === key); }
function categoryByKey(key) { return QM_CATEGORIES.find((c) => c.key === key); }

function loadToday() {
  const today = dayKey();
  const saved = read(TODAY_KEY, null);
  // 날짜가 바뀌었으면(자정을 넘겨 켜 둔 채였거나 다음날 처음 열었거나)
  // 완료 표시만 새로 비운다 — 추천 자체는 picksForDate() 가 날짜로부터
  // 다시 계산하므로 따로 저장할 게 없다.
  if (!saved || saved.date !== today) return { date: today, done: [] };
  return saved;
}
function saveToday(next) { write(TODAY_KEY, next); }

function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }

function loadImpact() { return read(IMPACT_KEY, { totalQ: 0, monthly: {} }); }
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

// ── 홈 카드 ───────────────────────────────────────────────────

export function renderQMissionCard() {
  const card = el('qmission-card');
  if (!card) return;
  const today = loadToday();
  const picks = picksForDate(today.date);
  const doneCount = picks.filter((m) => today.done.includes(m.key)).length;
  const preview = picks
    .map((m) => `${categoryByKey(m.category)?.icon || ''} ${esc(t(m.label))}`)
    .join(' · ');

  card.innerHTML =
    '<div class="tc-head">' +
    `<span class="week-title">${esc(t(S.qmCardTitle))}</span>` +
    `<span class="dim tc-status">${esc(t(S.qmCardStatus).replace('%s', doneCount).replace('%s', picks.length))}</span>` +
    '</div>' +
    `<p class="dim">${preview}</p>` +
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
    return `<button class="log-row card${on ? ' on' : ''}" type="button" data-mission="${m.key}">` +
      `<span class="log-box" aria-hidden="true">${on ? ICON.check : ''}</span>` +
      '<span class="row-main">' +
      `<span class="row-t">${esc(t(m.label))}</span>` +
      `<span class="row-d dim">${cat ? cat.icon + ' ' + esc(t(cat.label)) : ''}</span>` +
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
      `<li>${r.icon} ${esc(t(r.label))} — ${r.count}</li>`
    ).join('') +
    '</ul>' +
    `<p class="dim">${esc(t(S.qmPointsLabel).replace('%s', totalQ))}</p>`;
}

export function renderQMissionScreen() {
  renderMissionList();
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
    renderImpactSection();
    renderQMissionCard();
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
