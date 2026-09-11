// 목적별 다주 프로그램 화면(2026-09-11).
//
// '목표' 탭(plan.js)의 자동 주간 계획과는 다른 물건이다 — 이름 붙여
// 고르는, 시작·끝이 있는 프로그램이다. 계산은 하지 않는다 — 전부
// src/data/plan.js 의 programDayPlan() 이 한다. 여기는 그 값을 화면에
// 옮기고, 진행도를 저장소에 넣고 빼는 일만 한다.

import { PROGRAMS } from '../data/programs.js';
import { programDayPlan, FOCUS_LABEL } from '../data/plan.js';
import { EXERCISES } from '../data/exercises.js';
import { loadBody, loadProgramProgress, saveProgramProgress, clearProgramProgress } from '../health/store.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let onStartDay = () => {}; // app.js 의 startRoutine — 계획 화면의 '이 날 시작'과 같은 문

const el = (id) => document.getElementById(id);
const EX_LABEL = Object.fromEntries(EXERCISES.map((e) => [e.key, e.label]));

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const LEVEL_IDS = ['easy', 'normal', 'hard'];
const LEVEL_LABEL_KEY = { easy: 'programLevelEasy', normal: 'programLevelNormal', hard: 'programLevelHard' };

// 방금 startRoutine() 을 부른 프로그램 날 — 결과 화면에서 완주가 확정되면
// (advanceProgramProgress) 이걸 보고 어느 프로그램의 몇 번째 날인지 안다.
// 설정 화면에서 뒤로 나가면(clearPendingProgramDay) 비워서, 시작만 하고
// 안 한 운동이나 그 뒤에 고른 다른 운동이 프로그램 진행도로 잘못 세지
// 않게 한다.
let pendingDay = null;

export function initPrograms({ translate, STATIC_UI, onStartDay: startFn } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (startFn) onStartDay = startFn;
}

export function clearPendingProgramDay() {
  pendingDay = null;
}

/** 결과 화면에서 완주가 확정된 뒤(recordCompletion 바로 다음) 부른다. */
export function advanceProgramProgress() {
  if (!pendingDay) return;
  const progress = loadProgramProgress();
  if (progress && progress.programId === pendingDay.programId && !progress.completedDays.includes(pendingDay.dayIndex)) {
    progress.completedDays.push(pendingDay.dayIndex);
    saveProgramProgress(progress);
  }
  pendingDay = null;
  renderProgramsScreen();
}

function programById(id) {
  return PROGRAMS.find((p) => p.id === id);
}

export function renderProgramsScreen() {
  const body = el('programs-body');
  if (!body) return;
  const progress = loadProgramProgress();
  const program = progress && programById(progress.programId);
  if (progress && !program) {
    // 저장된 프로그램 id 가 지금 목록에 없다(구버전 등) — 안전하게 접는다.
    clearProgramProgress();
    body.innerHTML = renderList();
    wireList(body);
    return;
  }
  if (program) {
    body.innerHTML = renderActive(program, progress);
    wireActive(program, progress);
  } else {
    body.innerHTML = renderList();
    wireList(body);
  }
}

function renderList() {
  return '<div class="program-list">' + PROGRAMS.map((p) => `
    <div class="card program-card">
      <div class="program-card-name">${esc(t(p.name))}</div>
      <p class="dim program-card-tag">${esc(t(p.tagline))} · ${esc(t(S.programWeeksTag).replace('%s', p.weeks))}</p>
      ${p.disclaimer ? `<p class="dim program-disclaimer">${esc(t(p.disclaimer))}</p>` : ''}
      <div class="program-level-row">
        ${LEVEL_IDS.map((lv) =>
          `<button type="button" class="sec2 program-level-btn" data-program="${p.id}" data-level="${lv}">${esc(t(S[LEVEL_LABEL_KEY[lv]]))}</button>`
        ).join('')}
      </div>
    </div>
  `).join('') + '</div>';
}

function wireList(container) {
  container.querySelectorAll('.program-level-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      saveProgramProgress({
        programId: btn.dataset.program,
        level: btn.dataset.level,
        startDate: Date.now(),
        completedDays: [],
      });
      renderProgramsScreen();
    });
  });
}

function todaysDayPlan(program, progress) {
  const dayIndex = progress.completedDays.length;
  const weekIdx = Math.floor(dayIndex / program.schedule.length);
  const dayOfWeek = dayIndex % program.schedule.length;
  const body = loadBody();
  const plan = programDayPlan(program, weekIdx, dayOfWeek, progress.level, body.weightKg);
  return { dayIndex, weekIdx, dayOfWeek, plan };
}

function renderActive(program, progress) {
  const totalDays = program.weeks * program.schedule.length;
  const doneCount = progress.completedDays.length;

  if (doneCount >= totalDays) {
    return `
      <div class="card program-done">
        <div class="program-card-name">${esc(t(S.programDoneTitle))}</div>
        <button type="button" class="primary" id="program-restart-btn">${esc(t(S.programDoneRestart))}</button>
      </div>`;
  }

  const { weekIdx, dayOfWeek, plan } = todaysDayPlan(program, progress);
  const isRest = plan.focus === 'rest';
  const focusLabel = esc(t(FOCUS_LABEL[plan.focus] || {}));

  return `
    <div class="card program-active">
      <div class="program-card-name">${esc(t(program.name))}</div>
      <p class="dim">${esc(t(S.programWeekDay).replace('%s', weekIdx + 1).replace('%s', dayOfWeek + 1))}</p>
      <p class="dim">${esc(t(S.programProgress).replace('%s', doneCount).replace('%s', totalDays))}</p>
      <div class="program-focus-row">
        <span class="dim">${esc(t(S.programTodayFocus))}</span>
        <span class="plan-day-chip">${focusLabel}</span>
      </div>
      ${isRest
        ? `<p class="dim">${esc(t(S.programRestToday))}</p>
           <button type="button" class="primary" id="program-rest-done-btn">${esc(t(S.programRestDone))}</button>`
        : `<div class="plan-day-chips">${plan.exKeys.map((k) => `<span class="plan-day-chip">${esc(t(EX_LABEL[k] || { ko: k }))}</span>`).join('')}</div>
           <button type="button" class="primary" id="program-start-btn">${esc(t(S.programStartBtn))}</button>`}
      <button type="button" class="sec2" id="program-quit-btn">${esc(t(S.programQuitBtn))}</button>
    </div>`;
}

function wireActive(program, progress) {
  const totalDays = program.weeks * program.schedule.length;
  if (progress.completedDays.length >= totalDays) {
    el('program-restart-btn')?.addEventListener('click', () => {
      clearProgramProgress();
      renderProgramsScreen();
    });
    return;
  }

  const { dayIndex, plan } = todaysDayPlan(program, progress);

  el('program-start-btn')?.addEventListener('click', () => {
    pendingDay = { programId: program.id, dayIndex };
    onStartDay({ keys: plan.exKeys, totalSets: plan.sets, durationPreset: plan.preset });
  });
  el('program-rest-done-btn')?.addEventListener('click', () => {
    progress.completedDays.push(dayIndex);
    saveProgramProgress(progress);
    renderProgramsScreen();
  });
  el('program-quit-btn')?.addEventListener('click', () => {
    if (!confirm(t(S.programQuitConfirm))) return;
    clearProgramProgress();
    pendingDay = null;
    renderProgramsScreen();
  });
}
