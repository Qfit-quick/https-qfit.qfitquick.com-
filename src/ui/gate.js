// 시작 관문 — 하루 첫 설문 두 문항과 오늘의 명언.
//
// 흐름: 기분 → 운동 생각 → 명언 → (명언을 누르면) 앱.
//
// 하루에 한 번만 세운다. 같은 날 다시 열면 관문이 없다 — 앱을 여는 것이
// 하루에 다섯 번이면 설문도 다섯 번이 되고, 그러면 두 번째부터는 아무 답이나
// 눌러 치우게 된다. 그렇게 모인 답으로 강도를 정하면 없는 편이 낫다.
//
// ⚠ 이 덮개는 앱 전체를 막는다. 그래서 무슨 일이 나도 반드시 걷힌다 —
// 모든 진입점이 try/catch 로 감싸여 있고, 실패하면 dismiss() 로 끝난다.
// 관문이 깨져서 앱을 못 쓰게 되는 것이 이 기능의 유일한 실패 방식이다.

import { MOOD_OPTIONS, DRIVE_OPTIONS, toneFor, intensityFor, INTENSITY } from '../data/checkin.js';
import { QUOTES_BY_TONE, QUOTES } from '../data/quotes.js';
import { dayKey, hasCheckin, saveCheckin, loadDay } from '../health/store.js';
import { moodUrl } from '../core/assets.js';

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

/** 선택지 버튼 한 줄. 두 문항이 같은 모양을 쓴다. */
function optionButton(opt, onPick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'gate-opt';
  const visual = opt.img
    ? `<img class="gate-opt-emoji" src="${moodUrl(opt.img)}" alt="" aria-hidden="true">`
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

/**
 * 오늘의 명언을 뽑는다.
 *
 * 결(tone) 안에서 **날짜를 씨앗으로** 뽑는다. 순수 난수로 뽑으면 같은 날
 * 두 번 열었을 때(설문은 안 다시 하지만 명언은 다시 그린다) 다른 문장이
 * 나와서 '오늘의 한 줄' 이라는 말이 거짓이 된다.
 */
function quoteFor(tone, dateStr) {
  const pool = QUOTES_BY_TONE[tone] || QUOTES;
  let h = 2166136261;
  const seed = dateStr + '|' + tone;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return pool[(h >>> 0) % pool.length];
}

function paintQuote(tone, dateStr) {
  const q = quoteFor(tone, dateStr);
  const text = el('gate-quote-text');
  const author = el('gate-quote-author');
  if (text) text.textContent = t(q.text);
  if (author) author.textContent = '— ' + t(q.author);
  return q;
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
 * @returns {boolean} 관문을 세웠는가(오늘 이미 했으면 false)
 */
export function initGate({ translate, STATIC_UI, onEnter } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) strings = STATIC_UI;
  onDone = onEnter || null;

  const gate = el('gate');
  if (!gate) return false;

  const today = dayKey();

  // 오늘 이미 답했다면 관문 없이 앱으로. 답은 남아 있으므로 계획 화면의
  // '오늘 권장 강도' 는 그대로 어제가 아니라 오늘 것을 쓴다.
  if (hasCheckin(today)) {
    gate.remove();
    if (typeof onDone === 'function') { const cb = onDone; onDone = null; cb(); }
    return false;
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
      })));
    }

    const driveBox = el('gate-drive-opts');
    if (driveBox) {
      driveBox.innerHTML = '';
      DRIVE_OPTIONS.forEach((opt) => driveBox.appendChild(optionButton(opt, (o) => {
        answer.drive = o.id;
        const tone = toneFor(answer.mood, answer.drive);
        const q = paintQuote(tone, today);
        paintAdvice();
        // 답과 뽑힌 명언을 그날 줄에 적는다. 기록지에서 "그날 기분이 어땠나"
        // 를 되돌아볼 수 있어야 설문이 버려지는 질문이 아니게 된다.
        saveCheckin(today, { mood: answer.mood, drive: answer.drive, quoteId: q.id });
        showStep('quote');
      })));
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

/** 오늘 뽑힌 명언. 계획 화면과 기록지가 같은 문장을 다시 보여 준다. */
export function todaysQuote(dateStr = dayKey()) {
  const day = loadDay(dateStr);
  if (day.quoteId) {
    const found = QUOTES.find((q) => q.id === day.quoteId);
    if (found) return found;
  }
  if (!day.mood || !day.drive) return null;
  return quoteFor(toneFor(day.mood, day.drive), dateStr);
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
