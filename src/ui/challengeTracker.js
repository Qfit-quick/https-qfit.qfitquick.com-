// 챌린지 트래커(2026-09-13).
//
// 사용자가 만든 독립 HTML(qfit-challenge-tracker.html)의 렌더링·상태
// 로직을 화면 하나로 그대로 옮긴 것이다 — 진행 계산·필터·저장 방식은
// 원본과 동일하게 두고, 다음만 이 앱에 맞춰 바꿨다.
//   1. IIFE를 initChallengeTracker() 로 감싸 main.js가 다른 화면들과
//      같은 타이밍에 한 번만 불러 붙인다.
//   2. id·class 전부에 challenge- 접두사를 붙였다. ES 모듈이라 내부
//      함수 이름(renderTabs 등)은 다른 파일과 겹칠 수 없다.
//   3. 화면 뼈대 문구(탭 라벨·시작일·진행 문구·버튼)는 STATIC_UI로
//      옮겼다. 운동 이름·목표·비고·쉬운 설명은 challengeTracks.js·
//      challengeGloss.js 에 한국어 전용으로 그대로 둔다(그 파일들의
//      머리 설명 참고).
import { CHALLENGE_TRACK_ORDER, CHALLENGE_TRACKS } from '../data/challengeTracks.js';
import { getChallengeIcon } from '../data/challengeIcons.js';
import { getChallengeGloss } from '../data/challengeGloss.js';
import { dayKey, shiftDay, markWorkoutDone } from '../health/store.js';
import { setAwake } from '../core/wakeLock.js';

let t = (o) => (o && o.ko) || '';
let S = {};

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (e) { return fallback; }
}
function saveJSON(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* 저장 실패 시 이번 세션에서만 유지 */ }
}
function loadStart(key) {
  try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
}
function saveStart(key, v) {
  try { localStorage.setItem(key, v); } catch (e) { /* 무시 */ }
}
function getLogs(track) { return loadJSON(track.logsKey, {}); }

// ── 오늘 체크(2026-09-27) ──────────────────────────────────────
// 주차별 성공/실패·숫자 기록(challenge-week-log-row)과는 다른 자리다 —
// 저건 "몇 주째 어땠나"를 나중에 훑어보는 표고, 이건 "오늘 했다"를
// 그 자리에서 바로 누르는 하루 단위 체크다. 트랙마다 logsKey 옆에
// ':days' 를 붙인 새 키 하나만 쓴다 — challengeTracks.js 의 9개 트랙
// 항목을 전부 고칠 필요가 없다.
function dailyKey(track) { return track.logsKey + ':days'; }
function getDailyChecks(track) { return loadJSON(dailyKey(track), {}); }

function renderDailyCheck(track) {
  const btn = document.getElementById('challenge-daily-check-btn');
  const note = document.getElementById('challenge-daily-check-note');
  if (!btn || !note) return;
  const today = dayKey();
  const done = !!getDailyChecks(track)[today];
  btn.textContent = t(done ? S.challengeDailyCheckedBtn : S.challengeDailyCheckBtn);
  btn.classList.toggle('done', done);
  note.textContent = t(done ? S.challengeDailyCheckedNote : S.challengeDailyCheckNote);
}

// 하루 체크를 켜고 끈다(오늘 버튼·실천 달력 공용). 켤 때는 그날 기록지의
// 운동 칸도 같이 켠다 — 도전도 운동이다(2026-09-27 요청). 시작일이 아직
// 없으면 처음 체크한 날을 시작일로 잡는다 — 그래야 주별로 나눌 수 있다.
function toggleDay(track, date) {
  const days = getDailyChecks(track);
  if (days[date]) {
    delete days[date];
  } else {
    days[date] = true;
    try { markWorkoutDone(date); } catch (e) { console.error('challenge markWorkoutDone failed:', e); }
    if (!loadStart(track.startKey)) saveStart(track.startKey, date);
  }
  saveJSON(dailyKey(track), days);
}

function toggleDailyCheck(track) {
  toggleDay(track, dayKey());
}

// ── 자유 타이머(2026-09-27) ────────────────────────────────────
// 특정 트랙·동작에 안 묶인 스톱워치다 — 쉬는 시간이든 세트 사이든
// 사용자가 직접 시작·종료한다. 화면을 나가도 계속 흐른다(실제
// 스톱워치가 그렇듯 — 여기서 멈추면 "쟀는데 안 잰 셈"이 된다).
// 2026-10-03: 시각으로 잰다. 예전엔 setInterval 로 1초씩 세서 메모리에만
// 들고 있었는데, 홈 화면으로 오래 나가 있으면 폰이 앱을 메모리에서 지우고
// 다시 열 때 처음부터 떠서 타이머가 00:00 으로 돌아갔다("오래 나가면 운동한
// 게 초기화된다"). 이제 시작한 시각·쌓인 시간을 저장해 두고 그 차이로
// 보여 준다 — 앱이 완전히 닫혔다 열려도 이어지고, 백그라운드에서 setInterval
// 이 느려져도 시간이 밀리지 않는다.
const TIMER_KEY = 'qfit_challenge_timer_v1';
let timer = { running: false, startedAt: 0, acc: 0 };
let tickId = null;

function loadTimerState() {
  const v = loadJSON(TIMER_KEY, {});
  timer = {
    running: !!v.running && Number(v.startedAt) > 0,
    startedAt: Number(v.startedAt) || 0,
    acc: Math.max(0, Number(v.acc) || 0),
  };
}
function saveTimerState() { saveJSON(TIMER_KEY, timer); }
function elapsedSec() {
  const live = timer.running ? Math.max(0, Date.now() - timer.startedAt) : 0;
  return Math.floor((timer.acc + live) / 1000);
}
// 도는 동안만 화면을 다시 그리고, 화면 꺼짐도 막는다.
function syncTick() {
  if (timer.running && !tickId) tickId = setInterval(renderTimer, 500);
  if (!timer.running && tickId) { clearInterval(tickId); tickId = null; }
  // 타이머가 도는 동안은 화면이 절대 꺼지면 안 된다 — 다른 탭으로 옮겨도
  // (도전 화면 자체는 ui/nav.js 가 따로 잠근다).
  setAwake('challenge-timer', timer.running);
}

function fmtTimer(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s2 = sec % 60;
  const mmss = String(m).padStart(2, '0') + ':' + String(s2).padStart(2, '0');
  return h ? h + ':' + mmss : mmss;
}

function renderTimer() {
  const display = document.getElementById('challenge-timer-display');
  if (display) display.textContent = fmtTimer(elapsedSec());
  const toggleBtn = document.getElementById('challenge-timer-toggle-btn');
  if (toggleBtn) {
    toggleBtn.textContent = t(timer.running ? S.challengeTimerPause : S.challengeTimerStart);
    toggleBtn.classList.toggle('running', timer.running);
  }
}

function toggleTimer() {
  const now = Date.now();
  if (timer.running) {
    timer.acc += Math.max(0, now - timer.startedAt);
    timer.running = false;
    timer.startedAt = 0;
  } else {
    timer.startedAt = now;
    timer.running = true;
  }
  saveTimerState();
  syncTick();
  renderTimer();
}

function resetTimer() {
  timer = { running: false, startedAt: 0, acc: 0 };
  saveTimerState();
  syncTick();
  renderTimer();
}

function computeCalendarWeek(startDateStr, totalWeeks) {
  if (!startDateStr) return null;
  const start = new Date(startDateStr + 'T00:00:00');
  if (isNaN(start.getTime())) return null;
  const now = new Date();
  const diffDays = Math.floor((now - start) / 86400000);
  if (diffDays < 0) return 1;
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(week, totalWeeks);
}

function findPhaseIndexForWeek(phases, week) {
  for (let i = 0; i < phases.length; i++) {
    if (week >= phases[i].range[0] && week <= phases[i].range[1]) return i;
  }
  return 0;
}

export function initChallengeTracker({ translate, STATIC_UI } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;

  const els = {
    tabsContainer: document.getElementById('challenge-tabs'),
    summaryCard: document.getElementById('challenge-summary'),
    startDateInput: document.getElementById('challenge-start-date'),
    progressText: document.getElementById('challenge-progress-text'),
    calendarWeekText: document.getElementById('challenge-calendar-week'),
    progressBarInner: document.getElementById('challenge-progress-inner'),
    phaseList: document.getElementById('challenge-phase-list'),
    resetBtn: document.getElementById('challenge-reset-btn'),
    days: document.getElementById('challenge-days'),
    searchInput: document.getElementById('challenge-search-input'),
    searchResults: document.getElementById('challenge-search-results'),
  };
  if (!els.tabsContainer) return; // 마크업이 아직 안 붙었으면 조용히 넘어간다

  // 들어올 때 고를 트랙(2026-10-03). 예전엔 늘 턱걸이였다 — 플란체를 하는
  // 사람도 들어올 때마다 턱걸이가 눌려 있어 매번 다시 골라야 했다. 이제
  // ①마지막으로 고른 트랙(저장) ②없으면 진행 중인 트랙 중 가장 최근에 실천한
  // 것(실천 달력·주차 기록·시작일 중 가장 늦은 날) ③그것도 없으면 턱걸이.
  const CURRENT_KEY = 'qfit_challenge_current_v1';
  function lastActivity(key) {
    const track = CHALLENGE_TRACKS[key];
    const dates = Object.keys(getDailyChecks(track));
    const start = loadStart(track.startKey);
    if (start) dates.push(start);
    if (!dates.length && Object.keys(getLogs(track)).length) dates.push('0000-00-00');
    return dates.sort().pop() || '';
  }
  function initialTrackKey() {
    try {
      const saved = localStorage.getItem(CURRENT_KEY);
      if (saved && CHALLENGE_TRACKS[saved]) return saved;
    } catch (e) { /* 저장소가 막혀 있으면 아래로 */ }
    let best = '', bestAt = '';
    CHALLENGE_TRACK_ORDER.forEach((key) => {
      const at = lastActivity(key);
      if (at && at > bestAt) { best = key; bestAt = at; }
    });
    return best || 'pullup';
  }
  function selectTrack(key) {
    currentTrackKey = key;
    try { localStorage.setItem(CURRENT_KEY, key); } catch (e) { /* 이번 세션만 기억 */ }
  }
  let currentTrackKey = initialTrackKey();
  let openPhaseIdx = 0; // 트랙 바꿀 때마다 재계산

  // 검색 색인. 9개 트랙(2026-09-24, 피스톨 스쿼트·쉬운 습관 3주 추가로
  // 7→9) × phase × 운동을 한 번만 평평하게 펴 둔다 — 트랙이 바뀔 때마다
  // 다시 만들 필요가 없고(운동 목록 자체는 고정 데이터), 검색은 입력마다
  // 이 배열만 훑는다(140개뿐이라 매번 새로 만들어도 되지만, 어차피
  // 고정이라 한 번으로 충분하다).
  const SEARCH_INDEX = [];
  CHALLENGE_TRACK_ORDER.forEach((key) => {
    const track = CHALLENGE_TRACKS[key];
    track.phases.forEach((phase, phaseIdx) => {
      phase.exercises.forEach((ex) => {
        SEARCH_INDEX.push({
          trackKey: key,
          trackShort: track.short,
          phaseIdx,
          range: phase.range,
          name: ex[0],
          iconKey: ex[3],
        });
      });
    });
  });

  // 시작일을 넣었거나 기록을 하나라도 남긴 트랙 = 진행 중.
  function isTrackStarted(key) {
    const track = CHALLENGE_TRACKS[key];
    return !!loadStart(track.startKey) || Object.keys(getLogs(track)).length > 0;
  }

  // 진행 중인 트랙을 탭 맨 앞으로 올린다 — #challenge-tabs 는 가로
  // 스크롤이라(challengeTracker.css), 하던 트랙이 CHALLENGE_TRACK_ORDER
  // 뒤쪽에 있으면 들어올 때마다 옆으로 밀어서 찾아야 한다. sort 는
  // 안정 정렬이라 진행 중끼리·안 한 것끼리는 원래 순서를 유지한다.
  function orderedTrackKeys() {
    return [...CHALLENGE_TRACK_ORDER].sort((a, b) => Number(isTrackStarted(b)) - Number(isTrackStarted(a)));
  }

  function renderTabs() {
    els.tabsContainer.innerHTML = '';
    orderedTrackKeys().forEach((key) => {
      const track = CHALLENGE_TRACKS[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'challenge-tab-btn' + (key === currentTrackKey ? ' active' : '');
      btn.textContent = t(S.challengeTabLabel).replace('%s', track.short).replace('%s', track.totalWeeks);
      btn.addEventListener('click', () => {
        selectTrack(key);
        renderTrack();
      });
      els.tabsContainer.appendChild(btn);
    });
  }

  function renderSummary() {
    els.summaryCard.innerHTML = '';
    CHALLENGE_TRACK_ORDER.forEach((key) => {
      const track = CHALLENGE_TRACKS[key];
      const logs = getLogs(track);
      const item = document.createElement('div');
      item.className = 'challenge-summary-item';
      item.innerHTML =
        '<div class="challenge-summary-num">' + esc(t(S.challengeSummaryUnit).replace('%s', Object.keys(logs).length).replace('%s', track.totalWeeks)) + '</div>' +
        '<div class="challenge-summary-lbl">' + esc(track.short) + '</div>';
      els.summaryCard.appendChild(item);
    });
  }

  function renderProgress(track, logs) {
    const filled = Object.keys(logs).length;
    els.progressText.textContent = t(S.challengeProgressText).replace('%s', filled).replace('%s', track.totalWeeks);
    const pct = Math.round((filled / track.totalWeeks) * 100);
    els.progressBarInner.style.width = pct + '%';

    const startVal = els.startDateInput.value;
    const calWeek = computeCalendarWeek(startVal, track.totalWeeks);
    els.calendarWeekText.textContent = calWeek ? t(S.challengeCalendarWeek).replace('%s', calWeek) : '';
  }

  function renderWeekLogRow(entry, logs, onChange) {
    const row = document.createElement('div');
    row.className = 'challenge-week-log-row' + (logs[entry.week] !== undefined ? ' filled' : '');

    const label = document.createElement('div');
    label.className = 'challenge-w-label';
    label.innerHTML = '<span class="challenge-wk">' + esc(t(S.challengeWeekLabel).replace('%s', entry.week)) + '</span>' + esc(entry.label);
    row.appendChild(label);

    if (entry.type === 'boolean') {
      const wrap = document.createElement('div');
      wrap.className = 'challenge-bool-btns';
      const successBtn = document.createElement('button');
      successBtn.type = 'button';
      successBtn.className = 'challenge-bool-btn' + (logs[entry.week] === '성공' ? ' on-success' : '');
      successBtn.textContent = t(S.challengeBoolSuccess);
      const failBtn = document.createElement('button');
      failBtn.type = 'button';
      failBtn.className = 'challenge-bool-btn' + (logs[entry.week] === '실패' ? ' on-fail' : '');
      failBtn.textContent = t(S.challengeBoolFail);
      successBtn.addEventListener('click', () => onChange(entry.week, '성공'));
      failBtn.addEventListener('click', () => onChange(entry.week, '실패'));
      wrap.appendChild(successBtn);
      wrap.appendChild(failBtn);
      row.appendChild(wrap);
    } else {
      const input = document.createElement('input');
      input.type = (entry.type === 'text') ? 'text' : 'number';
      input.placeholder = entry.type === 'text' ? t(S.challengeTextPlaceholder) : '';
      if (logs[entry.week] !== undefined) input.value = logs[entry.week];
      input.addEventListener('change', () => {
        const v = input.value.trim();
        onChange(entry.week, v === '' ? undefined : v);
      });
      row.appendChild(input);
      if (entry.unit) {
        const unitEl = document.createElement('span');
        unitEl.className = 'challenge-unit';
        unitEl.textContent = entry.unit;
        row.appendChild(unitEl);
      }
    }

    return row;
  }

  function renderPhases(track) {
    const logs = getLogs(track);
    const calWeek = computeCalendarWeek(els.startDateInput.value, track.totalWeeks);
    const currentPhaseIdx = calWeek ? findPhaseIndexForWeek(track.phases, calWeek) : -1;

    els.phaseList.innerHTML = '';

    track.phases.forEach((phase, idx) => {
      const card = document.createElement('div');
      card.className = 'challenge-phase-card' + (idx === openPhaseIdx ? ' open' : '') + (idx === currentPhaseIdx ? ' current' : '');

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'challenge-phase-header';
      header.innerHTML =
        '<span><span class="challenge-week-range">' + esc(t(S.challengeWeekRange).replace('%s', phase.range[0]).replace('%s', phase.range[1])) + '</span>' + esc(phase.title) +
        (idx === currentPhaseIdx ? '<span class="challenge-badge">' + esc(t(S.challengeBadgeCurrent)) + '</span>' : '') + '</span>' +
        '<span class="challenge-chev">▾</span>';
      header.addEventListener('click', () => {
        openPhaseIdx = (openPhaseIdx === idx) ? -1 : idx;
        renderPhases(track);
      });
      card.appendChild(header);

      const body = document.createElement('div');
      body.className = 'challenge-phase-body';

      const goal = document.createElement('p');
      goal.className = 'challenge-phase-goal';
      goal.textContent = t(S.challengeGoalPrefix).replace('%s', phase.goal);
      body.appendChild(goal);

      const table = document.createElement('table');
      table.className = 'challenge-exercise-table';
      table.innerHTML = '<tr><th></th><th>' + esc(t(S.challengeColExercise)) + '</th><th>' + esc(t(S.challengeColSets)) + '</th><th>' + esc(t(S.challengeColNote)) + '</th></tr>' +
        phase.exercises.map((ex) => {
          const gloss = getChallengeGloss(ex[0]);
          const glossHtml = gloss ? '<div class="challenge-ex-gloss">' + esc(gloss) + '</div>' : '';
          return '<tr><td class="challenge-icon-cell"><span class="challenge-ex-icon">' + getChallengeIcon(ex[3]) + '</span></td><td>' + esc(ex[0]) + glossHtml + '</td><td>' + esc(ex[1]) + '</td><td class="challenge-note">' + esc(ex[2]) + '</td></tr>';
        }).join('');
      body.appendChild(table);

      const weekLogsWrap = document.createElement('div');
      weekLogsWrap.className = 'challenge-week-logs';
      track.logs
        .filter((entry) => entry.week >= phase.range[0] && entry.week <= phase.range[1])
        .forEach((entry) => {
          weekLogsWrap.appendChild(renderWeekLogRow(entry, logs, (week, value) => {
            const freshLogs = getLogs(track);
            if (value === undefined) delete freshLogs[week];
            else freshLogs[week] = value;
            saveJSON(track.logsKey, freshLogs);
            renderSummary();
            renderProgress(track, freshLogs);
            renderDays(track); // 그 주 줄의 '기록✓'
            renderPhases(track); // filled 표시/뱃지 갱신
          }));
        });
      body.appendChild(weekLogsWrap);

      card.appendChild(body);
      els.phaseList.appendChild(card);
    });
  }

  // ── 실천 달력(2026-10-03 요청) ──────────────────────────────
  // "기록 완료 0/24주"만으로는 내가 언제 했는지 알기 번거롭다는 요청. 시작일
  // 부터 주마다 한 줄, 하루마다 한 칸을 그리고 칸을 눌러 그날 실천을 켜고
  // 끈다(지난 날을 깜빡했어도 체크할 수 있다, 앞날은 막는다). 줄 끝에 그 주
  // 며칠 했는지와 주차 기록(아래 표)을 적었는지를 같이 보인다. 주가 많으면
  // 최근 4주만 펴고 나머지는 '지난 주 모두 보기'로 연다.
  let showAllWeeks = false;

  function renderDays(track) {
    const box = els.days;
    if (!box) return;
    const start = loadStart(track.startKey);
    const today = dayKey();
    if (!start) {
      box.innerHTML =
        '<div class="challenge-days-head"><span class="challenge-days-title">' + esc(t(S.challengeDaysTitle)) + '</span></div>' +
        '<p class="challenge-days-empty">' + esc(t(S.challengeDaysNoStart)) + '</p>' +
        '<button type="button" class="challenge-days-start" data-days-start>' + esc(t(S.challengeDaysStartToday)) + '</button>';
      return;
    }
    const days = getDailyChecks(track);
    const logs = getLogs(track);
    const loggedWeeks = new Set(track.logs.map((e) => e.week));
    const total = track.totalWeeks;
    const curWeek = Math.max(1, computeCalendarWeek(start, total) || 1);
    const weekDates = (w) => Array.from({ length: 7 }, (_, i) => shiftDay(start, (w - 1) * 7 + i));
    const doneIn = (w) => weekDates(w).filter((d) => days[d]).length;
    const totalDays = Object.keys(days).length;

    const names = t(S.challengeWeekdays).split(',');
    const wd = (d) => { const [y, m, dd] = d.split('-').map(Number); return names[new Date(y, m - 1, dd).getDay()]; };

    const first = showAllWeeks ? 1 : Math.max(1, curWeek - 3);
    let html =
      '<div class="challenge-days-head">' +
      '<span class="challenge-days-title">' + esc(t(S.challengeDaysTitle)) + '</span>' +
      '<span class="challenge-days-stats">' + esc(t(S.challengeDaysStats).replace('%s', doneIn(curWeek)).replace('%s', totalDays)) + '</span>' +
      '</div>' +
      '<p class="challenge-days-hint">' + esc(t(S.challengeDaysHint)) + '</p>' +
      '<div class="challenge-days-grid">' +
      '<span></span>' + weekDates(1).map((d) => '<span class="challenge-days-wd">' + esc(wd(d)) + '</span>').join('') + '<span></span>';
    for (let w = first; w <= curWeek; w++) {
      const n = doneIn(w);
      html += '<span class="challenge-days-wk' + (w === curWeek ? ' cur' : '') + '">' + esc(t(S.challengeDaysWeek).replace('%s', w)) + '</span>';
      weekDates(w).forEach((d) => {
        const future = d > today;
        const on = !!days[d];
        const dayNum = Number(d.slice(8));
        html += '<button type="button" class="challenge-day' + (on ? ' on' : '') + (d === today ? ' today' : '') + '"' +
          ' data-day="' + d + '"' + (future ? ' disabled' : '') +
          ' aria-pressed="' + on + '" aria-label="' + esc(d) + '">' + (on ? '✓' : dayNum) + '</button>';
      });
      const logged = loggedWeeks.has(w) && logs[w] !== undefined;
      html += '<span class="challenge-days-cnt' + (n === 7 ? ' full' : '') + '">' + n + '/7' +
        (logged ? '<span class="challenge-days-logged">' + esc(t(S.challengeDaysLogged)) + '</span>' : '') + '</span>';
    }
    html += '</div>';
    if (curWeek > 4) {
      html += '<button type="button" class="challenge-days-more" data-days-more>' +
        esc(t(showAllWeeks ? S.challengeDaysShowRecent : S.challengeDaysShowAll)) + '</button>';
    }
    box.innerHTML = html;
  }

  if (els.days) {
    els.days.addEventListener('click', (e) => {
      const track = CHALLENGE_TRACKS[currentTrackKey];
      const cell = e.target.closest('[data-day]');
      if (cell && !cell.disabled) {
        toggleDay(track, cell.dataset.day);
        renderTrack(openPhaseIdx);
        return;
      }
      if (e.target.closest('[data-days-start]')) {
        saveStart(track.startKey, dayKey());
        renderTrack();
        return;
      }
      if (e.target.closest('[data-days-more]')) {
        showAllWeeks = !showAllWeeks;
        renderDays(track);
      }
    });
  }

  // forcedPhaseIdx: 검색 결과를 눌러 들어올 때처럼 "이 phase 를 펼쳐라"
  // 가 이미 정해져 있는 경우에 쓴다. 안 주면(트랙 탭을 직접 눌렀을 때)
  // 원래대로 캘린더 주차로 현재 phase 를 다시 계산한다.
  function renderTrack(forcedPhaseIdx) {
    const track = CHALLENGE_TRACKS[currentTrackKey];

    renderTabs();

    els.startDateInput.value = loadStart(track.startKey);

    const logs = getLogs(track);
    renderSummary();
    renderProgress(track, logs);
    renderDailyCheck(track);
    renderDays(track);

    if (forcedPhaseIdx !== undefined) {
      openPhaseIdx = forcedPhaseIdx;
    } else {
      const calWeek = computeCalendarWeek(els.startDateInput.value, track.totalWeeks);
      openPhaseIdx = calWeek ? findPhaseIndexForWeek(track.phases, calWeek) : 0;
    }

    renderPhases(track);
  }

  function renderSearchResults(query) {
    if (!query) {
      els.searchResults.innerHTML = '';
      return;
    }
    const matches = SEARCH_INDEX.filter((row) => row.name.toLowerCase().includes(query));
    if (matches.length === 0) {
      els.searchResults.innerHTML = '<p class="challenge-search-empty">' + esc(t(S.challengeSearchEmpty)) + '</p>';
      return;
    }
    els.searchResults.innerHTML = '';
    matches.forEach((row) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'challenge-search-result';
      const meta = t(S.challengeSearchResultMeta).replace('%s', row.trackShort).replace('%s', row.range[0]).replace('%s', row.range[1]);
      btn.innerHTML =
        '<span class="challenge-ex-icon">' + getChallengeIcon(row.iconKey) + '</span>' +
        '<span class="challenge-search-result-text">' +
        '<span class="challenge-search-result-name">' + esc(row.name) + '</span>' +
        '<span class="challenge-search-result-meta">' + esc(meta) + '</span>' +
        '</span>';
      btn.addEventListener('click', () => {
        selectTrack(row.trackKey);
        renderTrack(row.phaseIdx);
        els.searchInput.value = '';
        els.searchResults.innerHTML = '';
        const card = els.phaseList.children[row.phaseIdx];
        card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      els.searchResults.appendChild(btn);
    });
  }

  if (els.searchInput) {
    els.searchInput.addEventListener('input', () => {
      renderSearchResults(els.searchInput.value.trim().toLowerCase());
    });
  }

  els.startDateInput.addEventListener('change', () => {
    const track = CHALLENGE_TRACKS[currentTrackKey];
    saveStart(track.startKey, els.startDateInput.value);
    renderTrack();
  });

  els.resetBtn.addEventListener('click', () => {
    const track = CHALLENGE_TRACKS[currentTrackKey];
    const ok = window.confirm(t(S.challengeResetConfirm).replace('%s', track.name));
    if (!ok) return;
    saveStart(track.startKey, '');
    saveJSON(track.logsKey, {});
    saveJSON(dailyKey(track), {});
    renderTrack();
  });

  document.getElementById('challenge-timer-toggle-btn')?.addEventListener('click', toggleTimer);
  document.getElementById('challenge-timer-reset-btn')?.addEventListener('click', resetTimer);
  document.getElementById('challenge-daily-check-btn')?.addEventListener('click', () => {
    toggleDailyCheck(CHALLENGE_TRACKS[currentTrackKey]);
    renderTrack(openPhaseIdx);
  });
  // 저장된 타이머를 되살린다 — 앱이 닫혔다 열려도 돌던 타이머는 계속 돈다.
  loadTimerState();
  syncTick();
  renderTimer();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') renderTimer(); });

  // 언어를 바꾸면 탭 라벨·진행 문구 등 이 화면이 직접 t() 로 지은 글자도
  // 다시 그려야 한다 — 그대로 두면 홈 화면의 옛 버그(연속기록 줄 미갱신)
  // 와 같은 문제가 된다.
  document.addEventListener('qfit:lang', () => {
    if (document.getElementById('challenge-screen')?.classList.contains('active')) renderTrack();
    renderTimer();
  });

  renderTrack();
}
