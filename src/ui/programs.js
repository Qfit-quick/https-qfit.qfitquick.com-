// 목적별 다주 프로그램 화면(2026-09-11, 2026-09-12 여러 개 병행 가능하게 고침).
//
// '목표' 탭(plan.js)의 자동 주간 계획과는 다른 물건이다 — 이름 붙여
// 고르는, 시작·끝이 있는 프로그램이다. 계산은 하지 않는다 — 전부
// src/data/plan.js 의 programDayPlan() 이 한다. 여기는 그 값을 화면에
// 옮기고, 진행도를 저장소에 넣고 빼는 일만 한다.

import { PROGRAMS } from '../data/programs.js';
import { programDayPlan, FOCUS_LABEL } from '../data/plan.js';
import { EXERCISES } from '../data/exercises.js';
import { loadBody, loadProgramProgress, saveProgramProgress, removeProgramProgress } from '../health/store.js';

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

// 지금 목록을 보고 있으면 null, 프로그램 하나를 열어 보고 있으면 그 id.
// 화면 안 이동일 뿐이라 저장하지 않는다 — 탭을 나갔다 오면 목록부터 다시 본다.
let viewingProgramId = null;

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
  const list = loadProgramProgress();
  const entry = list.find((p) => p.programId === pendingDay.programId);
  if (entry && !entry.completedDays.includes(pendingDay.dayIndex)) {
    entry.completedDays.push(pendingDay.dayIndex);
    saveProgramProgress(list);
  }
  pendingDay = null;
  renderProgramsScreen();
}

function programById(id) {
  return PROGRAMS.find((p) => p.id === id);
}

function progressFor(programId) {
  return loadProgramProgress().find((p) => p.programId === programId) || null;
}

export function renderProgramsScreen() {
  const body = el('programs-body');
  if (!body) return;

  if (viewingProgramId) {
    const program = programById(viewingProgramId);
    const progress = progressFor(viewingProgramId);
    if (!program || !progress) {
      // 그 사이에 그만뒀거나(다른 탭에서) 이상한 id 다 — 목록으로 접는다.
      viewingProgramId = null;
      renderProgramsScreen();
      return;
    }
    body.innerHTML = renderActive(program, progress);
    wireActive(program, progress);
    return;
  }

  body.innerHTML = renderList();
  wireList();
}

function renderList() {
  return '<div class="program-list">' + PROGRAMS.map((p) => {
    const progress = progressFor(p.id);
    const totalDays = p.weeks * p.schedule.length;
    return `
    <div class="card program-card">
      <div class="program-card-name">${esc(t(p.name))}</div>
      <p class="dim program-card-tag">${esc(t(p.tagline))}</p>
      ${p.disclaimer ? `<p class="dim program-disclaimer">${esc(t(p.disclaimer))}</p>` : ''}
      ${progress
        ? `<p class="dim program-card-progress">${esc(t(S.programProgress).replace('%s', progress.completedDays.length).replace('%s', totalDays))}</p>
           <button type="button" class="primary program-continue-btn" data-program="${p.id}">${esc(t(S.programContinueBtn))}</button>`
        : `<div class="program-level-row">${LEVEL_IDS.map((lv) =>
            `<button type="button" class="sec2 program-level-btn" data-program="${p.id}" data-level="${lv}">${esc(t(S[LEVEL_LABEL_KEY[lv]]))}</button>`
          ).join('')}</div>`}
    </div>`;
  }).join('') + '</div>';
}

function wireList() {
  document.querySelectorAll('.program-level-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const list = loadProgramProgress();
      const programId = btn.dataset.program;
      if (!list.some((p) => p.programId === programId)) {
        list.push({ programId, level: btn.dataset.level, startDate: Date.now(), completedDays: [] });
        saveProgramProgress(list);
      }
      viewingProgramId = programId;
      renderProgramsScreen();
    });
  });
  document.querySelectorAll('.program-continue-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      viewingProgramId = btn.dataset.program;
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
  const backBtn = `<button type="button" class="sec2 program-back-btn" id="program-back-btn">${esc(t(S.programBackBtn))}</button>`;

  if (doneCount >= totalDays) {
    return `
      ${backBtn}
      <div class="card program-done">
        <div class="program-card-name">${esc(t(S.programDoneTitle))}</div>
        <button type="button" class="primary" id="program-restart-btn">${esc(t(S.programDoneRestart))}</button>
      </div>`;
  }

  const { weekIdx, dayOfWeek, plan } = todaysDayPlan(program, progress);
  const isRest = plan.focus === 'rest';
  const focusLabel = esc(t(FOCUS_LABEL[plan.focus] || {}));

  return `
    ${backBtn}
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
  el('program-back-btn')?.addEventListener('click', () => {
    viewingProgramId = null;
    renderProgramsScreen();
  });

  const totalDays = program.weeks * program.schedule.length;
  if (progress.completedDays.length >= totalDays) {
    el('program-restart-btn')?.addEventListener('click', () => {
      removeProgramProgress(program.id);
      viewingProgramId = null;
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
    const list = loadProgramProgress();
    const entry = list.find((p) => p.programId === program.id);
    if (entry) entry.completedDays.push(dayIndex);
    saveProgramProgress(list);
    renderProgramsScreen();
  });
  el('program-quit-btn')?.addEventListener('click', () => {
    if (!confirm(t(S.programQuitConfirm))) return;
    removeProgramProgress(program.id);
    if (pendingDay && pendingDay.programId === program.id) pendingDay = null;
    viewingProgramId = null;
    renderProgramsScreen();
  });
}
