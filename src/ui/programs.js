// 목적별 다주 프로그램 화면(2026-09-11, 2026-09-12 여러 개 병행 가능하게 고침).
//
// '목표' 탭(plan.js)의 자동 주간 계획과는 다른 물건이다 — 이름 붙여
// 고르는, 시작·끝이 있는 프로그램이다. 계산은 하지 않는다 — 전부
// src/data/plan.js 의 programDayPlan() 이 한다. 여기는 그 값을 화면에
// 옮기고, 진행도를 저장소에 넣고 빼는 일만 한다.

import { PROGRAMS } from '../data/programs.js';
import { programDayPlan, FOCUS_LABEL } from '../data/plan.js';
import { EXERCISES } from '../data/exercises.js';
import { QCE_MOVEMENT_STANDARDS, QCE_PENALTY_RULES } from '../data/qceRulebook.js';
import { loadBody, loadProgramProgress, saveProgramProgress, removeProgramProgress, loadProgramHistory, archiveProgramProgress } from '../health/store.js';
import { programBgUrl } from '../core/assets.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let onStartDay = () => {}; // app.js 의 startRoutine — 계획 화면의 '이 날 시작'과 같은 문
let onStartAmrap = () => {}; // ui/amrap.js 의 startAmrap — 'Cindy' 처럼 반복(AMRAP)인 프로그램용
let onStartCircuit = () => {}; // ui/circuit.js 의 startCircuit — 'QCE' 처럼 한 바퀴만 도는 프로그램용
let onShowScreen = () => {}; // app.js 의 showScreenById — QCE 경기 규칙 화면을 열 때 쓴다

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

export function initPrograms({ translate, STATIC_UI, onStartDay: startFn, onStartAmrap: startAmrapFn, onStartCircuit: startCircuitFn, onShowScreen: showFn } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (startFn) onStartDay = startFn;
  if (startAmrapFn) onStartAmrap = startAmrapFn;
  if (startCircuitFn) onStartCircuit = startCircuitFn;
  if (showFn) onShowScreen = showFn;

  el('qce-rulebook-back-btn')?.addEventListener('click', () => {
    onShowScreen('programs-screen');
  });
}

// QCE 경기 규칙 요약 화면. 프로그램 상세의 '규칙 보기'에서 연다 — 내용은
// qceRulebook.js 가 갖고 있고(전문 판정 용어라 한국어 전용, 그 파일
// 주석 참고), 여기는 카드 모양으로 옮겨 붙이는 것만 한다.
function renderQceRulebook() {
  const body = el('qce-rulebook-body');
  if (!body) return;
  body.innerHTML = `
    <div class="card"><p class="dim">${esc(t(S.qceRulebookIntro))}</p></div>
    ${QCE_MOVEMENT_STANDARDS.map((s, i) => `
      <div class="card">
        <div class="program-card-name">${i + 1}. ${esc(t(s.label || EX_LABEL[s.key] || { ko: s.key }))} <span class="plan-day-chip">${esc(s.target)}</span></div>
        <p class="dim">${esc(t(S.qceStartLabel))}: ${esc(s.start)}</p>
        <p class="dim">${esc(t(S.qceValidLabel))}: ${esc(s.valid)}</p>
        <p class="dim">${esc(t(S.qceNoRepLabel))}: ${esc(s.noRep)}</p>
      </div>`).join('')}
    <div class="card">
      <div class="program-card-name">${esc(t(S.qcePenaltyTitle))}</div>
      ${QCE_PENALTY_RULES.map((p) => `<p class="dim">${esc(p.case)} → <b>${esc(p.result)}</b></p>`).join('')}
    </div>
  `;
}

// amrap(Cindy)·circuit(QCE) 은 요일마다 다른 초점을 고르는 일반 프로그램과
// 달리 매일 똑같은 고정 서킷이다 — programDayPlan() 이 볼 것이 없고,
// 난이도(초보/중수/고수)도 없다(정해진 하나뿐이라 고를 게 없다).
function isFixedProgram(program) {
  return program.type === 'amrap' || program.type === 'circuit';
}

export function clearPendingProgramDay() {
  pendingDay = null;
}

/**
 * Cindy 처럼 고정 서킷인 프로그램의 하루를 완료 표시한다.
 *
 * 일반 프로그램은 advanceProgramProgress() 를 쓴다 — 결과 화면(공용 미션
 * 엔진)이 끝난 뒤에야 완주가 확정되기 때문에 pendingDay 로 미뤄 둔다.
 * amrap 프로그램은 그 엔진을 거치지 않고 자기 화면 안에서 바로 끝나므로
 * 미룰 이유가 없다 — ui/amrap.js 가 끝나는 순간 이걸 직접 부른다.
 */
export function markProgramDayDone(programId, dayIndex) {
  const list = loadProgramProgress();
  const entry = list.find((p) => p.programId === programId);
  if (entry && !entry.completedDays.includes(dayIndex)) {
    entry.completedDays.push(dayIndex);
    saveProgramProgress(list);
  }
  renderProgramsScreen();
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

function historyFor(programId) {
  return loadProgramHistory().find((h) => h.programId === programId) || null;
}

function formatDate(ts) {
  const d = new Date(ts);
  return t({
    ko: `${d.getMonth() + 1}월 ${d.getDate()}일`,
    en: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    zh: `${d.getMonth() + 1}月${d.getDate()}日`,
  });
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

  // 검색칸은 카드 목록과 따로 둔다 — 카드만 다시 그려야 입력 중 커서가
  // 안 튄다(직접선택 화면의 동작 검색과 같은 구조, app.js renderExGrid).
  body.innerHTML = `
    <label class="inp-wrap program-search-wrap">
      <span class="inp-ic" data-icon="search"></span>
      <input type="text" id="program-search-input" class="inp search-input" placeholder="${esc(t(S.programSearchPlaceholder))}" aria-label="${esc(t(S.programSearchPlaceholder))}">
    </label>
    <div class="program-list" id="program-list"></div>
  `;
  renderProgramCards('');
  const searchInput = el('program-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderProgramCards(searchInput.value.trim().toLowerCase());
    });
  }
}

// 사진 있는 프로그램만 카드 배경을 씌운다(programs.js 의 bg, 선택 필드) —
// 사진 없는 프로그램은 지금 카드 그대로 나온다. CSS 커스텀 프로퍼티로
// 넘기는 이유: 배경 이미지 자체는 프로그램마다 다르지만 블러·스크림·글자색
// 처리는 .program-card--photo 하나로 공통이라, 클래스는 그대로 두고
// 값만 바꿔 끼운다.
function bgClass(program) {
  return program.bg ? ' program-card--photo' : '';
}
function bgStyle(program) {
  if (!program.bg) return '';
  // CSS 커스텀 프로퍼티 안의 url() 은 그 값을 "쓴" 스타일시트(screens.css →
  // assets/index-*.css) 기준으로 풀린다 — 값을 "정한" 이 문서 기준이 아니다.
  // base:'./' 라 상대경로를 그대로 넣으면 assets/media/... 로 잘못 풀려서
  // 사진이 항상 404 난다. document.baseURI 로 미리 완전한 URL을 만들어
  // 넣으면 어디서 참조하든 더 풀 것이 없어 이 문제를 피한다.
  const absolute = new URL(programBgUrl(program.bg), document.baseURI).href;
  return ` style="--program-bg:url('${absolute}')"`;
}

function matchesSearch(p, term) {
  if (!term) return true;
  return (t(p.name) + ' ' + t(p.tagline)).toLowerCase().includes(term);
}

function renderProgramCards(term) {
  const container = el('program-list');
  if (!container) return;
  const filtered = PROGRAMS.filter((p) => matchesSearch(p, term));

  if (!filtered.length) {
    container.innerHTML = `<p class="dim program-search-empty">${esc(t(S.programSearchEmpty).replace('%s', term))}</p>`;
    return;
  }

  // 진행 중인(시작한) 프로그램을 목록 맨 앞으로 올린다 — 안 그러면
  // PROGRAMS 원래 순서 그대로 나와서, 하던 프로그램이 뒤에 있으면
  // 들어올 때마다 스크롤해서 찾아야 한다. sort 는 안정 정렬이라
  // 진행 중끼리·안 한 것끼리는 원래 순서를 유지한다.
  const sorted = [...filtered].sort((a, b) => Number(!!progressFor(b.id)) - Number(!!progressFor(a.id)));

  container.innerHTML = sorted.map((p) => {
    const progress = progressFor(p.id);
    const history = !progress ? historyFor(p.id) : null;
    const totalDays = p.weeks * p.schedule.length;
    return `
    <div class="card program-card${bgClass(p)}"${bgStyle(p)}>
      <div class="program-card-name">${esc(t(p.name))}</div>
      <p class="dim program-card-tag">${esc(t(p.tagline))}</p>
      ${p.disclaimer ? `<p class="dim program-disclaimer">${esc(t(p.disclaimer))}</p>` : ''}
      ${history ? `<p class="dim program-history-note">${esc(t(S.programHistoryNote).replace('%s', history.completedDays).replace('%s', history.totalDays).replace('%s', formatDate(history.quitDate)))}</p>` : ''}
      ${progress
        ? `<p class="dim program-card-progress">${esc(t(S.programProgress).replace('%s', progress.completedDays.length).replace('%s', totalDays))}</p>
           <button type="button" class="primary program-continue-btn" data-program="${p.id}">${esc(t(S.programContinueBtn))}</button>`
        // amrap(Cindy)·circuit(QCE) 은 초보/중수/고수로 나뉘지 않는다 —
        // 정해진 서킷 하나뿐이다. 난이도 세 칸을 그대로 두면 고르는
        // 순간부터 거짓말이 된다.
        : isFixedProgram(p)
          ? `<button type="button" class="primary program-level-btn" data-program="${p.id}" data-level="normal">${esc(t(S.programStartBtn))}</button>`
          : `<div class="program-level-row">${LEVEL_IDS.map((lv) =>
              `<button type="button" class="sec2 program-level-btn" data-program="${p.id}" data-level="${lv}">${esc(t(S[LEVEL_LABEL_KEY[lv]]))}</button>`
            ).join('')}</div>`}
    </div>`;
  }).join('');

  wireCards(container);
}

function wireCards(container) {
  container.querySelectorAll('.program-level-btn').forEach((btn) => {
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
  container.querySelectorAll('.program-continue-btn').forEach((btn) => {
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
  // 고정 서킷 프로그램(Cindy·QCE)은 요일마다 다른 초점을 고르지 않는다 —
  // 매일 같은 서킷이라 programDayPlan() 이 볼 것이 없다.
  if (isFixedProgram(program)) return { dayIndex, weekIdx, dayOfWeek, plan: null };
  const body = loadBody();
  const plan = programDayPlan(program, weekIdx, dayOfWeek, progress.level, body.weightKg);
  return { dayIndex, weekIdx, dayOfWeek, plan };
}

/**
 * 홈의 '1분 시작' 시트에서 프로그램 탭을 거치지 않고 고정 서킷을 바로
 * 시작한다. QCE(circuit)·Cindy(amrap) 는 초보/중수/고수도, 요일별 초점도
 * 없는 서킷 하나뿐이라(isFixedProgram) 프로그램 탭의 '시작하기'까지 가서
 * 고를 것이 없다 — 진행도가 없으면 여기서 바로 만들고 시작한다.
 */
export function quickStartCircuit(programId) {
  const program = programById(programId);
  if (!program || program.type !== 'circuit') return;
  let progress = progressFor(programId);
  if (!progress) {
    const list = loadProgramProgress();
    list.push({ programId, level: 'normal', startDate: Date.now(), completedDays: [] });
    saveProgramProgress(list);
    progress = progressFor(programId);
  }
  const { dayIndex } = todaysDayPlan(program, progress);
  onStartCircuit({ program, dayIndex });
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

  if (program.type === 'amrap') {
    return `
      ${backBtn}
      <div class="card program-active${bgClass(program)}"${bgStyle(program)}>
        <div class="program-card-name">${esc(t(program.name))}</div>
        <p class="dim">${esc(t(S.programWeekDay).replace('%s', weekIdx + 1).replace('%s', dayOfWeek + 1))}</p>
        <p class="dim">${esc(t(S.programProgress).replace('%s', doneCount).replace('%s', totalDays))}</p>
        <p class="dim">${esc(t(program.tagline))}</p>
        ${program.disclaimer ? `<p class="dim program-disclaimer">${esc(t(program.disclaimer))}</p>` : ''}
        <div class="plan-day-chips">${program.amrap.moves.map((m) => `<span class="plan-day-chip">${esc(t(m.label || EX_LABEL[m.key] || { ko: m.key }))} ×${m.reps}</span>`).join('')}</div>
        <button type="button" class="primary" id="program-start-btn">${esc(t(S.programStartBtn))}</button>
        <button type="button" class="sec2" id="program-quit-btn">${esc(t(S.programQuitBtn))}</button>
      </div>`;
  }

  if (program.type === 'circuit') {
    const secUnit = t({ ko: '초', en: 's', zh: '秒' });
    return `
      ${backBtn}
      <div class="card program-active${bgClass(program)}"${bgStyle(program)}>
        <div class="program-card-name">${esc(t(program.name))}</div>
        <p class="dim">${esc(t(S.programWeekDay).replace('%s', weekIdx + 1).replace('%s', dayOfWeek + 1))}</p>
        <p class="dim">${esc(t(S.programProgress).replace('%s', doneCount).replace('%s', totalDays))}</p>
        <p class="dim">${esc(t(program.tagline))}</p>
        ${program.disclaimer ? `<p class="dim program-disclaimer">${esc(t(program.disclaimer))}</p>` : ''}
        <div class="plan-day-chips">${program.circuit.stations.map((s) => {
          const label = t(EX_LABEL[s.key] || { ko: s.key });
          const tgt = s.mode === 'time' ? `${s.target}${secUnit}` : `×${s.target}`;
          return `<span class="plan-day-chip">${esc(label)} ${esc(tgt)}</span>`;
        }).join('')}</div>
        <button type="button" class="primary" id="program-start-btn">${esc(t(S.programStartBtn))}</button>
        <button type="button" class="sec2" id="qce-rules-btn">${esc(t(S.qceRulesBtn))}</button>
        <button type="button" class="sec2" id="program-quit-btn">${esc(t(S.programQuitBtn))}</button>
      </div>`;
  }

  const isRest = plan.focus === 'rest';
  const focusLabel = esc(t(FOCUS_LABEL[plan.focus] || {}));

  return `
    ${backBtn}
    <div class="card program-active${bgClass(program)}"${bgStyle(program)}>
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

  if (program.type === 'amrap') {
    el('program-start-btn')?.addEventListener('click', () => {
      onStartAmrap({ program, dayIndex });
    });
  } else if (program.type === 'circuit') {
    el('program-start-btn')?.addEventListener('click', () => {
      onStartCircuit({ program, dayIndex });
    });
    el('qce-rules-btn')?.addEventListener('click', () => {
      renderQceRulebook();
      onShowScreen('qce-rulebook-screen');
    });
  } else {
    el('program-start-btn')?.addEventListener('click', () => {
      pendingDay = { programId: program.id, dayIndex };
      // 초보 코스는 동작 사이 전환도 느리게 시작한다 — 자세를 통째로 바꿔야
      // 하는 초보자에게 숨 돌릴 틈 없이 1초 만에 다음 동작이 뜨는 건 너무 빠르다.
      // 물론 설정 화면에서 다시 고를 수 있다.
      onStartDay({ keys: plan.exKeys, totalSets: plan.sets, durationPreset: plan.preset, transitionSpeed: progress.level === 'easy' ? 'slow' : undefined });
    });
  }
  el('program-rest-done-btn')?.addEventListener('click', () => {
    const list = loadProgramProgress();
    const entry = list.find((p) => p.programId === program.id);
    if (entry) entry.completedDays.push(dayIndex);
    saveProgramProgress(list);
    renderProgramsScreen();
  });
  el('program-quit-btn')?.addEventListener('click', () => {
    if (!confirm(t(S.programQuitConfirm))) return;
    archiveProgramProgress({
      programId: program.id,
      level: progress.level,
      completedDays: progress.completedDays.length,
      totalDays,
      quitDate: Date.now(),
    });
    removeProgramProgress(program.id);
    if (pendingDay && pendingDay.programId === program.id) pendingDay = null;
    viewingProgramId = null;
    renderProgramsScreen();
  });
}
