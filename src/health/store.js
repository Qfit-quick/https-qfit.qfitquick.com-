// 신체정보와 하루 기록지의 저장소.
//
// 화면과 계산 사이에 이 파일 하나만 둔다. 예전에 체중 하나가 app.js 안에서
// 세 군데(입력칸·프로필·칼로리 추정)로 갈라져 있었고, 그때 한 곳만 고쳐서
// 결과 화면의 칼로리가 옛 체중으로 계산되는 일이 있었다.
//
// ⚠ 체중은 이 파일이 **두 곳에 같이 쓴다** — 자기 기록(qfit_body_v1)과
// app.js 가 이미 읽고 있는 옛 키(wodrush_weight_kg_v1). 옛 키를 지우면
// 결과 화면의 칼로리 추정이 65kg 기본값으로 되돌아간다. 한쪽만 쓰면
// 두 숫자가 갈라지므로, 쓰는 문을 여기 하나로 좁혀 둔다.

const BODY_KEY = 'qfit_body_v1';
const LOG_KEY = 'qfit_daylog_v1';
const LEGACY_WEIGHT_KEY = 'wodrush_weight_kg_v1';
const PROGRAM_KEY = 'qfit_program_v1';

// 기록지는 하루에 한 줄씩 쌓인다. 400일이면 400줄 — 로컬 저장소에는
// 넉넉하지만 무한히 두면 언젠가 한도에 닿는다. 400일을 넘긴 것은 버린다.
const MAX_DAYS = 400;

const EMPTY_BODY = {
  sex: 'male',
  age: null,
  heightCm: null,
  weightKg: null,
  activity: 'light',
  goal: 'keep',
  level: 'novice',
  updatedAt: null,
};

const EMPTY_DAY = () => ({
  workout: false,
  meals: { breakfast: false, lunch: false, dinner: false, snack: false },
  water: 0,
  weightKg: null,
  mood: null,
  drive: null,
  quoteId: null,
  note: '',
});

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : fallback;
  } catch (e) {
    // 저장소가 막혀 있거나(사파리 프라이빗) 값이 깨졌다. 앱은 계속 돌아야 한다.
    console.error('store read failed:', key, e);
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('store write failed:', key, e);
    return false;
  }
}

/** 오늘 날짜 문자열. 'YYYY-MM-DD' — UTC 가 아니라 **기기 시간**이다. */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** n 일 전(음수면 뒤)의 날짜 키. */
export function shiftDay(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dayKey(dt);
}

// ── 신체정보 ──────────────────────────────────────────────────

export function loadBody() {
  const b = { ...EMPTY_BODY, ...read(BODY_KEY, {}) };
  // 체중은 옛 키가 더 새로울 수 있다(설정 화면에서 넣은 값). 없을 때만 가져온다.
  if (b.weightKg == null) {
    const legacy = Number(localStorage.getItem(LEGACY_WEIGHT_KEY));
    if (Number.isFinite(legacy) && legacy > 0) b.weightKg = legacy;
  }
  return b;
}

export function saveBody(patch) {
  const next = { ...loadBody(), ...patch, updatedAt: Date.now() };
  write(BODY_KEY, next);
  if (next.weightKg) {
    try { localStorage.setItem(LEGACY_WEIGHT_KEY, String(next.weightKg)); }
    catch (e) { console.error('legacy weight mirror failed:', e); }
  }
  document.dispatchEvent(new CustomEvent('qfit:body', { detail: next }));
  return next;
}

/** 계획을 세울 수 있는 만큼 채워졌는가. 키·체중·나이가 없으면 계산이 안 된다. */
export function bodyReady(body = loadBody()) {
  return !!(body.age && body.heightCm && body.weightKg);
}

// ── 하루 기록지 ───────────────────────────────────────────────

export function loadLog() {
  return read(LOG_KEY, {});
}

export function loadDay(dateStr = dayKey()) {
  const log = loadLog();
  return { ...EMPTY_DAY(), ...(log[dateStr] || {}), meals: { ...EMPTY_DAY().meals, ...((log[dateStr] || {}).meals || {}) } };
}

export function saveDay(dateStr, patch) {
  const log = loadLog();
  const prev = { ...EMPTY_DAY(), ...(log[dateStr] || {}) };
  const next = { ...prev, ...patch };
  if (patch.meals) next.meals = { ...prev.meals, ...patch.meals };
  log[dateStr] = next;

  // 오래된 날은 버린다. 날짜 문자열이 'YYYY-MM-DD' 라 사전순 정렬이 곧 시간순이다.
  const keys = Object.keys(log).sort();
  if (keys.length > MAX_DAYS) {
    for (const k of keys.slice(0, keys.length - MAX_DAYS)) delete log[k];
  }

  write(LOG_KEY, log);
  document.dispatchEvent(new CustomEvent('qfit:daylog', { detail: { date: dateStr, day: next } }));
  return next;
}

/**
 * 운동을 했다고 표시한다. 실제 완주(app.js 의 recordCompletion)가 이걸 부른다 —
 * 앱에서 운동을 끝냈는데 기록지에는 손으로 또 체크해야 한다면, 그 기록지는
 * 두 번 적는 장부가 된다.
 */
export function markWorkoutDone(dateStr = dayKey()) {
  const day = loadDay(dateStr);
  if (day.workout) return day;
  return saveDay(dateStr, { workout: true });
}

/** 체크인(설문) 답을 그날 줄에 적는다. */
export function saveCheckin(dateStr, { mood, drive, quoteId }) {
  return saveDay(dateStr, { mood, drive, quoteId });
}

/** 오늘 설문을 이미 했는가. 관문을 다시 세울지 이 값이 정한다. */
export function hasCheckin(dateStr = dayKey()) {
  const day = loadDay(dateStr);
  return !!(day.mood && day.drive);
}

// ── 상태 판정 ─────────────────────────────────────────────────
//
// 이 앱이 새로 약속한 것이 여기다: "오늘 식단만 했으면 식단만, 둘 다 했으면
// 둘 다" 가 한눈에 읽혀야 한다. 그래서 상태를 네 가지로만 둔다 —
// none · diet · workout · both. 다섯 번째를 만들면 색을 다섯 개 써야 하고,
// 그때부터는 범례를 봐야 화면이 읽힌다.

/**
 * 식단을 지켰는가. 세 끼(아침·점심·저녁)가 기준이고 간식은 세지 않는다 —
 * 간식을 계산에 넣으면 '간식을 안 먹은 날' 이 실패로 잡힌다.
 *
 * 'partial' 을 따로 두는 이유: 세 끼 중 두 끼를 지킨 날을 0 으로 처리하면
 * 사람들은 셋째 끼를 포기한 순간 그날 전체를 놓는다.
 */
export function dietState(day) {
  const m = day.meals || {};
  const n = ['breakfast', 'lunch', 'dinner'].filter((k) => m[k]).length;
  if (n === 0) return 'none';
  return n >= 3 ? 'done' : 'partial';
}

/** 하루 상태 한 글자. 캘린더 칸과 홈 카드가 같은 함수를 읽는다. */
export function dayStatus(day) {
  const diet = dietState(day) === 'done';
  const workout = !!day.workout;
  if (workout && diet) return 'both';
  if (workout) return 'workout';
  if (diet) return 'diet';
  return 'none';
}

/** 최근 n 일을 오래된 것부터 [{date, day, status}] 로. 스트립·캘린더가 쓴다. */
export function recentDays(n, endDate = dayKey()) {
  const log = loadLog();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = shiftDay(endDate, -i);
    const day = { ...EMPTY_DAY(), ...(log[date] || {}) };
    out.push({ date, day, status: dayStatus(day) });
  }
  return out;
}

/**
 * 연속 일수. '무엇의 연속' 인지를 인자로 받는다 — 운동 연속과 식단 연속은
 * 다른 숫자이고, 하나로 합치면 둘 다 못 세게 된다.
 * 오늘이 아직 비어 있는 것은 끊긴 것이 아니다(하루가 안 끝났다) — 그래서
 * 오늘이 비면 어제부터 센다.
 */
export function streakOf(kind, endDate = dayKey()) {
  const log = loadLog();
  const hit = (date) => {
    const day = { ...EMPTY_DAY(), ...(log[date] || {}) };
    if (kind === 'workout') return !!day.workout;
    if (kind === 'diet') return dietState(day) === 'done';
    return dayStatus(day) === 'both';
  };
  let cursor = endDate;
  if (!hit(cursor)) cursor = shiftDay(cursor, -1);
  let n = 0;
  while (hit(cursor) && n < MAX_DAYS) {
    n++;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}

/** 이번 달 상태별 일수. 기록 화면의 요약 숫자. */
export function monthTally(dateStr = dayKey()) {
  const [y, m] = dateStr.split('-');
  const prefix = `${y}-${m}-`;
  const log = loadLog();
  const tally = { both: 0, workout: 0, diet: 0, none: 0 };
  for (const [k, v] of Object.entries(log)) {
    if (!k.startsWith(prefix)) continue;
    tally[dayStatus({ ...EMPTY_DAY(), ...v })]++;
  }
  return tally;
}

/** 기록지를 CSV 로. 설정 화면의 내보내기가 이걸 쓴다. */
export function logToCsv() {
  const log = loadLog();
  const rows = [['date', 'workout', 'breakfast', 'lunch', 'dinner', 'snack', 'water_cups', 'weight_kg', 'mood', 'drive', 'status']];
  for (const date of Object.keys(log).sort()) {
    const day = { ...EMPTY_DAY(), ...log[date] };
    const m = day.meals || {};
    rows.push([
      date, day.workout ? 1 : 0,
      m.breakfast ? 1 : 0, m.lunch ? 1 : 0, m.dinner ? 1 : 0, m.snack ? 1 : 0,
      day.water || 0, day.weightKg || '', day.mood || '', day.drive || '', dayStatus(day),
    ]);
  }
  return rows.map((r) => r.join(',')).join('\n');
}

// ── 프로그램 진행도 ───────────────────────────────────────────
//
// 한 번에 하나만 진행한다 — 두 프로그램을 동시에 하면 '오늘 뭘 할
// 차례인지'가 둘로 갈린다. { programId, level, startDate, completedDays }.
// completedDays 는 달력 날짜가 아니라 '몇 번째를 끝냈나'다 — 하루
// 쉬어도 진도가 밀리지 않게(이 앱의 스트릭 계산도 날짜가 아니라
// 완료 횟수 기준으로 관대하게 세는 쪽을 택해 왔다).

export function loadProgramProgress() {
  return read(PROGRAM_KEY, null);
}

export function saveProgramProgress(progress) {
  write(PROGRAM_KEY, progress);
}

export function clearProgramProgress() {
  try {
    localStorage.removeItem(PROGRAM_KEY);
  } catch (e) {
    console.error('clear program progress failed:', e);
  }
}

/** 신체정보와 기록지를 지운다. 설정의 '모든 데이터 지우기' 가 부른다. */
export function wipeHealthData() {
  try {
    localStorage.removeItem(BODY_KEY);
    localStorage.removeItem(LOG_KEY);
    localStorage.removeItem(PROGRAM_KEY);
  } catch (e) {
    console.error('wipe health data failed:', e);
  }
}
