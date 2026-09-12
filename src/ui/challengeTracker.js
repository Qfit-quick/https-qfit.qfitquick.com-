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
  };
  if (!els.tabsContainer) return; // 마크업이 아직 안 붙었으면 조용히 넘어간다

  let currentTrackKey = 'pullup';
  let openPhaseIdx = 0; // 트랙 바꿀 때마다 재계산

  function renderTabs() {
    els.tabsContainer.innerHTML = '';
    CHALLENGE_TRACK_ORDER.forEach((key) => {
      const track = CHALLENGE_TRACKS[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'challenge-tab-btn' + (key === currentTrackKey ? ' active' : '');
      btn.textContent = t(S.challengeTabLabel).replace('%s', track.short).replace('%s', track.totalWeeks);
      btn.addEventListener('click', () => {
        currentTrackKey = key;
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
        '<span><span class="challenge-week-range">' + phase.range[0] + '~' + phase.range[1] + '주</span>' + esc(phase.title) +
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
            renderPhases(track); // filled 표시/뱃지 갱신
          }));
        });
      body.appendChild(weekLogsWrap);

      card.appendChild(body);
      els.phaseList.appendChild(card);
    });
  }

  function renderTrack() {
    const track = CHALLENGE_TRACKS[currentTrackKey];

    renderTabs();

    els.startDateInput.value = loadStart(track.startKey);

    const logs = getLogs(track);
    renderSummary();
    renderProgress(track, logs);

    const calWeek = computeCalendarWeek(els.startDateInput.value, track.totalWeeks);
    openPhaseIdx = calWeek ? findPhaseIndexForWeek(track.phases, calWeek) : 0;

    renderPhases(track);
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
    renderTrack();
  });

  // 언어를 바꾸면 탭 라벨·진행 문구 등 이 화면이 직접 t() 로 지은 글자도
  // 다시 그려야 한다 — 그대로 두면 홈 화면의 옛 버그(연속기록 줄 미갱신)
  // 와 같은 문제가 된다.
  document.addEventListener('qfit:lang', () => {
    if (document.getElementById('challenge-screen')?.classList.contains('active')) renderTrack();
  });

  renderTrack();
}
