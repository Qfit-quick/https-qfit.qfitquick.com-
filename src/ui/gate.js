// 시작 관문 — 하루 첫 설문 두 문항과 오늘의 명언.
//
// 흐름: 기분 → 운동 생각 → 명언 → (명언을 누르면) 앱.
//
// 설문 두 문항(기분·운동 생각)은 하루에 한 번만 묻는다. 같은 날 다시 열면
// 설문은 건너뛴다 — 앱을 여는 것이 하루에 다섯 번이면 설문도 다섯 번이
// 되고, 그러면 두 번째부터는 아무 답이나 눌러 치우게 된다. 그렇게 모인
// 답으로 강도를 정하면 없는 편이 낫다.
//
// 명언은 다르다 — 설문과 달리 매번 앱을 열 때마다 다시 보여준다
// (2026-09-15 요청). 처음에는 날짜를 씨앗으로 결정적으로 뽑아서 같은 날은
// 늘 같은 문장이 나오게 했는데, "들어갈 때마다 다른 명언"을 보고 싶다는
// 요청(2026-09-15)으로 뒤집었다 — randomQuote() 는 부를 때마다 무작위로
// 뽑고, 그 결과를 그날 줄에 다시 적어 둔다. 그래서 같은 앱 열기 안에서는
// (관문과 계획 화면처럼) 같은 문장을 보지만, 다음에 앱을 다시 열면 새로
// 뽑는다.
//
// ⚠ 이 덮개는 앱 전체를 막는다. 그래서 무슨 일이 나도 반드시 걷힌다 —
// 모든 진입점이 try/catch 로 감싸여 있고, 실패하면 dismiss() 로 끝난다.
// 관문이 깨져서 앱을 못 쓰게 되는 것이 이 기능의 유일한 실패 방식이다.

import { MOOD_OPTIONS, DRIVE_OPTIONS, toneFor, intensityFor, INTENSITY } from '../data/checkin.js';
import { QUOTES_BY_TONE, QUOTES } from '../data/quotes.js';
import { dayKey, hasCheckin, saveCheckin, loadDay } from '../health/store.js';
import { moodUrl, driveUrl } from '../core/assets.js';

let t = (o) => (o && o.ko) || '';
let strings = {};
let onDone = null;

const answer = { mood: null, drive: null };

function el(id) { return document.getElementById(id); }

function dismiss() {
  const gate = el('gate');
  if (!gate) return;
  gate.classList.add('leaving');
  // 투명해진 뒤에 지운다. 남겨 두면 화면 전체를 덮은 채라 아무것도 못 누른다.
  setTimeout(() => gate.remove(), 320);
  document.body.classList.remove('gated');
  if (typeof onDone === 'function') {
    const cb = onDone;
    onDone = null;
    try { cb(); } catch (e) { console.error('gate done callback failed:', e); }
  }
}

function paintDots(step) {
  const box = el('gate-dots');
  if (!box) return;
  box.innerHTML = [0, 1, 2].map((i) => `<i class="gate-dot${i <= step ? ' on' : ''}"></i>`).join('');
}

function showStep(name) {
  const steps = { mood: 'gate-step-mood', drive: 'gate-step-drive', quote: 'gate-step-quote' };
  for (const [k, id] of Object.entries(steps)) {
    const node = el(id);
    if (node) node.hidden = k !== name;
  }
  paintDots(['mood', 'drive', 'quote'].indexOf(name));
  // 단계가 바뀌면 **질문 쪽으로** 초점을 옮긴다. 스크린리더가 새 질문을
  // 읽어 주려면 초점이 새 단계 안으로 들어가야 한다.
  //
  // 첫 선택지 버튼에 주면 안 된다 — 초점 테두리가 켜져서 그 답이 이미
  // 골라진 것처럼 보인다(실제로 그렇게 보였다). 그래서 제목에 준다.
  const step = el(steps[name]);
  const heading = step?.querySelector('.gate-q, .gate-quote');
  if (heading) {
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    setTimeout(() => heading.focus({ preventScroll: true }), 60);
  }
}

/** 선택지 버튼 한 줄. 두 문항이 같은 모양을 쓴다(urlFn 만 문항마다 다르다). */
function optionButton(opt, onPick, urlFn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'gate-opt';
  const visual = opt.img
    ? `<img class="gate-opt-emoji" src="${urlFn(opt.img)}" alt="" aria-hidden="true">`
    : `<span class="gate-opt-emoji" aria-hidden="true">${opt.emoji}</span>`;
  b.innerHTML =
    visual +
    '<span class="gate-opt-main">' +
    `<span class="gate-opt-t">${t(opt.label)}</span>` +
    (opt.sub ? `<span class="gate-opt-d">${t(opt.sub)}</span>` : '') +
    '</span>';
  b.addEventListener('click', () => {
    try { onPick(opt); } catch (e) { console.error('gate pick failed:', e); dismiss(); }
  });
  return b;
}

// 직전에 봤던 명언 id — 순수 난수라 바로 다음 번에도 같은 문장이 다시
// 뽑힐 수 있는데, 특히 결(tone)마다 문장 수가 다르다 보니(gentle 은 16개뿐)
// 자주 겹쳐 보인다는 피드백(2026-09-18)이 있었다. "매번 다르게"라는 원래
// 요청의 취지를 지키면서 "방금 그거 또"만 없애려고, 직전 id 만 후보에서
// 뺀다 — 그 이상(최근 5개 등) 기억하지는 않는다, 결 하나가 16개뿐이라
// 너무 많이 빼면 사실상 못 나오는 문장이 생긴다.
const LAST_QUOTE_KEY = 'qfit_last_quote_id';

/**
 * 결(tone) 안에서 명언 하나를 무작위로 뽑는다. 직전에 본 것과는 다르게.
 *
 * 앱을 열 때마다 다른 문장을 보고 싶다는 요청(2026-09-15)이라 순수 난수를
 * 쓴다. 부를 때마다 다른 값이 나오므로, 이 앱 열기 안에서 명언을 두 번
 * 다시 그려야 하는 자리(관문 재진입, 계획 화면)는 이 함수를 다시 부르지
 * 않고 저장된 quoteId 를 읽어야 한다 — todaysQuote() 가 그 문이다.
 */
function randomQuote(tone) {
  const pool = QUOTES_BY_TONE[tone] || QUOTES;
  let lastId = null;
  try { lastId = localStorage.getItem(LAST_QUOTE_KEY); } catch (e) { /* 시크릿 모드 등 — 그냥 매번 새로 뽑은 셈 친다 */ }
  const candidates = pool.length > 1 ? pool.filter((q) => q.id !== lastId) : pool;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  try { localStorage.setItem(LAST_QUOTE_KEY, picked.id); } catch (e) { /* 위와 같음 */ }
  return picked;
}

/** 이미 뽑힌 명언 객체를 화면에 그린다(뽑는 것과 그리는 것을 나눠서,
 *  이미 저장된 명언을 다시 그릴 때는 새로 뽑지 않는다). */
function renderQuote(q) {
  const text = el('gate-quote-text');
  const author = el('gate-quote-author');
  if (text) text.textContent = t(q.text);
  if (author) author.textContent = '— ' + t(q.author);
  return q;
}

function paintQuote(tone) {
  return renderQuote(randomQuote(tone));
}

function paintAdvice() {
  const line = el('gate-advice');
  if (!line) return;
  const level = INTENSITY[intensityFor(answer.mood, answer.drive)];
  line.textContent = level ? t(level.note) : '';
}

function paintDate() {
  const kick = el('gate-date');
  if (!kick) return;
  const d = new Date();
  kick.textContent = t({
    ko: `${d.getMonth() + 1}월 ${d.getDate()}일 · 1 / 2`,
    en: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + ' · 1 / 2',
    zh: `${d.getMonth() + 1}月${d.getDate()}日 · 1 / 2`,
  });
}

/**
 * 관문을 세운다.
 *
 * @param {object} opts
 * @param {(o:object)=>string} opts.translate  app.js 의 t
 * @param {object} opts.STATIC_UI              사전
 * @param {()=>void} [opts.onEnter]            관문이 걷힌 뒤 부를 것
 * @returns {boolean} 관문을 세웠는가
 */
export function initGate({ translate, STATIC_UI, onEnter } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) strings = STATIC_UI;
  onDone = onEnter || null;

  const gate = el('gate');
  if (!gate) return false;

  const today = dayKey();

  // 오늘 이미 답했다면 설문 두 문항은 건너뛰고 명언 단계로 바로 간다.
  // 설문은 하루 한 번이지만, 명언은 앱을 열 때마다 **새로** 뽑아 달라는
  // 요청(2026-09-15)이라 관문 자체는 그대로 세우고, 명언도 매번 다시
  // 뽑는다 — 답만 다시 묻지 않는다. 새로 뽑은 명언은 그날 줄에 다시
  // 적어 둔다. 그래야 이 앱 열기 안에서 계획 화면이 todaysQuote() 로
  // 읽어 가는 것도 방금 여기서 뽑은 것과 같아진다.
  if (hasCheckin(today)) {
    try {
      gate.hidden = false;
      document.body.classList.add('gated');

      const day = loadDay(today);
      answer.mood = day.mood;
      answer.drive = day.drive;
      const q = randomQuote(toneFor(day.mood, day.drive));
      renderQuote(q);
      saveCheckin(today, { mood: day.mood, drive: day.drive, quoteId: q.id });
      paintAdvice();

      const card = el('gate-quote-card');
      if (card) card.addEventListener('click', dismiss);

      showStep('quote');
      return true;
    } catch (e) {
      console.error('gate re-show failed:', e);
      dismiss();
      return false;
    }
  }

  try {
    gate.hidden = false;
    document.body.classList.add('gated');

    paintDate();

    const moodBox = el('gate-mood-opts');
    if (moodBox) {
      moodBox.innerHTML = '';
      MOOD_OPTIONS.forEach((opt) => moodBox.appendChild(optionButton(opt, (o) => {
        answer.mood = o.id;
        showStep('drive');
      }, moodUrl)));
    }

    const driveBox = el('gate-drive-opts');
    if (driveBox) {
      driveBox.innerHTML = '';
      DRIVE_OPTIONS.forEach((opt) => driveBox.appendChild(optionButton(opt, (o) => {
        answer.drive = o.id;
        const tone = toneFor(answer.mood, answer.drive);
        const q = paintQuote(tone);
        paintAdvice();
        // 답과 뽑힌 명언을 그날 줄에 적는다. 기록지에서 "그날 기분이 어땠나"
        // 를 되돌아볼 수 있어야 설문이 버려지는 질문이 아니게 된다.
        saveCheckin(today, { mood: answer.mood, drive: answer.drive, quoteId: q.id });
        showStep('quote');
      }, driveUrl)));
    }

    const back = el('gate-back-btn');
    if (back) back.addEventListener('click', () => showStep('mood'));

    const card = el('gate-quote-card');
    if (card) card.addEventListener('click', dismiss);

    showStep('mood');
    return true;
  } catch (e) {
    // 관문이 앱을 막고 있다. 무슨 일이 났든 걷는 것이 먼저다.
    console.error('gate init failed:', e);
    dismiss();
    return false;
  }
}

/**
 * 이 앱 열기에서 방금 뽑힌 명언. 관문이 매번 새로 뽑아 그날 줄에 적어
 * 두므로, 계획 화면이 이 함수로 읽으면 관문과 같은 문장을 본다 — 단,
 * 다음에 앱을 다시 열면 관문이 또 새로 뽑으므로 그때는 다른 문장이 된다.
 */
export function todaysQuote(dateStr = dayKey()) {
  const day = loadDay(dateStr);
  if (day.quoteId) {
    const found = QUOTES.find((q) => q.id === day.quoteId);
    if (found) return found;
  }
  if (!day.mood || !day.drive) return null;
  return randomQuote(toneFor(day.mood, day.drive));
}

/** 오늘 설문이 정한 강도. 없으면 'normal'. */
export function todaysIntensity(dateStr = dayKey()) {
  const day = loadDay(dateStr);
  if (!day.mood || !day.drive) return 'normal';
  return intensityFor(day.mood, day.drive);
}

/** 사전이 늦게 오는 경우가 없도록 밖에서 다시 칠할 수 있게 열어 둔다. */
export function repaintGateStrings() {
  if (!el('gate')) return;
  try { paintDate(); } catch (e) { console.error('gate repaint failed:', e); }
}

// strings 는 지금 쓰지 않지만 인자로 받는다 — 관문의 문구는 마크업의
// data-i18n 이 app.js 의 훑기로 채운다. 나중에 JS 로 만드는 문구가 늘면
// 여기서 사전을 읽게 되므로, 넘기는 쪽을 미리 맞춰 둔다.
void strings;
