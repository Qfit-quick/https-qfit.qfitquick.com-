// 챗봇 — 실제 AI 가 아니라 키워드로 답을 찾아 주는 안내다(2026-09-17 요청).
//
// 왜 진짜 AI 가 아닌가: 이 앱은 서버 없는 정적 사이트라, AI API 를 쓰려면
// 키를 어딘가에 두고(브라우저에 그대로 두면 누구나 훔쳐 쓸 수 있다) 요청을
// 대신 보내 줄 백엔드가 있어야 한다 — 그건 이번 한 줄 요청보다 훨씬 큰
// 작업이고 매달 실제 비용이 든다. 대신 이미 앱 안에 있는 진짜 콘텐츠를
// 키워드로 찾아 그대로 보여주는 쪽을 택했다 — 답이 뭔가 지어내는 일이 없고,
// 화면에 있는 것과 항상 같은 말을 한다.
//
// 2026-09-17 확장 요청("큐핏에 해당하는 내용은 뭐든 검색하면 자연스럽게
// 안내") — 부위별 대처법·회복 습관·앱 사용법 FAQ 세 곳만 찾던 것을, 운동
// 종류·업적·프로그램까지 6곳으로 넓혔다. 각 데이터를 다시 적지 않고 원본
// 모듈을 그대로 읽는다 — 같은 내용이 두 곳에 있으면 언젠가 한쪽만 고쳐서
// 서로 어긋난다. 업적만 예외: achievements.js 의 설명은 함수(check)라 글로
// 옮길 수 없어서 chatbot-faq.js 에 ACHIEVEMENT_HINTS 로 새로 썼다.
//
// 여러 곳에서 동시에 맞을 수 있어(예: "스쿼트"가 운동 이름이면서 회복
// 태그이기도 할 수 있음) 첫 번째로 찾은 것을 바로 답하지 않고, 매칭된
// 키워드 길이가 가장 긴(=가장 구체적인) 후보를 고른다(scoreMatch).

import { RECOVERY_CARDS, INJURY_GUIDES } from '../data/recovery.js';
import { CHATBOT_FAQ, ACHIEVEMENT_HINTS, matchesKeyword } from '../data/chatbot-faq.js';
import { EXERCISES } from '../data/exercises.js';
import { VIDEO_CLIPS } from '../data/video-clips.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PROGRAMS } from '../data/programs.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let goScreen = () => {};

const el = (id) => document.getElementById(id);

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 매칭 안 되면 0, 되면 키워드 길이(공백 제거) — 길수록 더 구체적인 매칭으로
// 보고 우선한다. "스쿼트"(3글자)가 "스"(1글자, 어딘가에 있다면)보다 이긴다.
function scoreMatch(text, keyword) {
  return matchesKeyword(text, keyword) ? String(keyword || '').replace(/\s+/g, '').length : 0;
}

// 세 언어 중 가장 잘 맞는 점수 하나만 취한다 — 화면 언어와 다르게 물어봐도
// (예: 한국어 화면에서 "shoulder") 찾을 수 있게.
function scoreAnyLang(text, dict) {
  return Math.max(0, ...['ko', 'en', 'zh'].map((l) => (dict && dict[l]) ? scoreMatch(text, dict[l]) : 0));
}

// 프로그램 이름에는 "3주"/"3-Week"/"3周" 같은 기간이 붙어 있고, 위치도
// 언어·프로그램마다 다르다(앞: "3-Week Fat Loss", 뒤: "Hyrox 3-Week") —
// matchesKeyword 는 라벨 전체가 사용자가 입력한 문장 안에 그대로 들어있어야
// 맞는데, 실제로 "하이록스"라고만 치지 "하이록스 3주"라고 기간까지 쳐서
// 묻는 사람은 없다. 매칭용으로만 기간 표시를 지워 핵심 이름만 남긴다
// (화면에 보여줄 땐 원래 이름 그대로 쓴다 — programReplyHtml 참고).
function stripProgramDuration(str) {
  return String(str || '').replace(/\d+\s*-?\s*(week|주|周)/gi, '');
}

function scoreProgramName(text, nameDict) {
  const stripped = { ko: stripProgramDuration(nameDict.ko), en: stripProgramDuration(nameDict.en), zh: stripProgramDuration(nameDict.zh) };
  return scoreAnyLang(text, stripped);
}

function collectCandidates(text) {
  const list = [];
  const push = (type, score, data) => { if (score > 0) list.push({ type, score, data }); };

  INJURY_GUIDES.forEach((g) => push('injury', scoreAnyLang(text, g.part), g));
  RECOVERY_CARDS.forEach((c) => push('recovery', scoreAnyLang(text, c.tag), c));
  CHATBOT_FAQ.forEach((f) => {
    const score = Math.max(0, ...f.keywords.map((k) => scoreMatch(text, k)));
    push('faq', score, f);
  });
  EXERCISES.forEach((ex) => push('exercise', scoreAnyLang(text, ex.label), ex));
  ACHIEVEMENTS.forEach((a) => push('achievement', scoreAnyLang(text, a.label), a));
  PROGRAMS.forEach((p) => push('program', Math.max(scoreProgramName(text, p.name), scoreAnyLang(text, p.tagline)), p));

  list.sort((a, b) => b.score - a.score);
  return list;
}

// 기본 제안 칩 — 카테고리가 섞이게: 부위 3개 + 운동 2개 + 프로그램 1개.
// 회복 부위 8개만 늘어놓던 예전보다 챗봇이 무엇까지 답하는지 첫눈에 보이게
// 한다. 전부 ko/en/zh 다국어 사전을 가진 값이라(matchesAnyLang 로 매칭)
// 세 언어 어디서 눌러도 반드시 걸린다 — CHATBOT_FAQ 의 keywords 배열은
// zh 항목이 없는 곳이 있어 칩으로 쓰면 중국어 화면에서 눌러도 못 찾을 수
// 있으므로 여기 넣지 않는다.
function defaultSuggestions() {
  return [
    ...INJURY_GUIDES.slice(0, 3).map((g) => t(g.part)),
    ...EXERCISES.slice(0, 2).map((ex) => t(ex.label)),
    ...(PROGRAMS[0] ? [t(PROGRAMS[0].name)] : []),
  ].filter(Boolean);
}

/** 부위 대처법 답 — "즉시 대처" 항목(각 부위 데이터의 세 번째 묶음, 순서가
 *  전부 같다: 흔한 원인·증상·즉시 대처·회복 관리)만 짧게 보여주고,
 *  전체(원인·증상·회복까지)는 회복 화면으로 연결한다. */
function injuryReplyHtml(guide) {
  const immediate = guide.groups[2]; // '즉시 대처' — recovery.js 에서 순서가 고정돼 있다(확인됨)
  const items = (immediate?.items || []).map((it) => `<li>${t(it)}</li>`).join('');
  return `<p><b>${esc(t(guide.part))}</b> — ${esc(t(immediate?.h) || '')}</p>` +
    `<ul class="chatbot-list">${items}</ul>` +
    `<button type="button" class="link-btn chatbot-detail-link" data-injury="${guide.id}">` +
    esc(t(S.chatbotDetailLink).replace('%s', t(guide.part))) + '</button>';
}

function recoveryReplyHtml(card) {
  const items = (card.items || []).map((it) => `<li>${t(it)}</li>`).join('');
  return `<p><b>${esc(t(card.title))}</b></p><ul class="chatbot-list">${items}</ul>`;
}

function exerciseReplyHtml(ex) {
  return `<p><b>${esc(t(ex.label))}</b></p>` +
    `<p>${esc(t(ex.cue))}</p>` +
    (ex.tip ? `<p>${esc(t(ex.tip))}</p>` : '') +
    `<button type="button" class="link-btn chatbot-detail-link" data-exercise="${ex.key}">` +
    esc(t(S.chatbotDetailLink).replace('%s', t(ex.label))) + '</button>';
}

function achievementReplyHtml(a) {
  const hint = ACHIEVEMENT_HINTS[a.id];
  return `<p><b>${esc(t(a.label))}</b></p><p>${esc(hint ? t(hint) : '')}</p>`;
}

function programReplyHtml(p) {
  return `<p><b>${esc(t(p.name))}</b></p>` +
    `<p>${esc(t(p.tagline))}</p>` +
    `<button type="button" class="link-btn chatbot-detail-link" data-program="${p.id}">` +
    esc(t(S.chatbotDetailLink).replace('%s', t(p.name))) + '</button>';
}

function replyHtmlFor(candidate) {
  switch (candidate.type) {
    case 'injury': return injuryReplyHtml(candidate.data);
    case 'recovery': return recoveryReplyHtml(candidate.data);
    case 'exercise': return exerciseReplyHtml(candidate.data);
    case 'achievement': return achievementReplyHtml(candidate.data);
    case 'program': return programReplyHtml(candidate.data);
    case 'faq': return `<p>${esc(t(candidate.data.answer))}</p>`;
    default: return '';
  }
}

function suggestionsFor(candidate) {
  switch (candidate.type) {
    case 'injury': return defaultSuggestions();
    case 'recovery': return RECOVERY_CARDS.map((c) => t(c.tag));
    case 'exercise': return EXERCISES.map((ex) => t(ex.label)).filter((l) => l !== t(candidate.data.label)).slice(0, 6);
    case 'achievement': return ACHIEVEMENTS.map((a) => t(a.label));
    case 'program': return PROGRAMS.map((p) => t(p.name));
    default: return defaultSuggestions();
  }
}

function appendMessage(role, html) {
  const box = el('chatbot-messages');
  if (!box) return;
  const bubble = document.createElement('div');
  bubble.className = 'chatbot-msg ' + role;
  bubble.innerHTML = html;
  box.appendChild(bubble);
  box.scrollTop = box.scrollHeight;
}

function renderSuggestChips(topics) {
  const box = el('chatbot-suggest');
  if (!box) return;
  box.innerHTML = topics.map((label) =>
    `<button type="button" class="chip chatbot-chip">${esc(label)}</button>`
  ).join('');
}

function respond(text) {
  const candidates = collectCandidates(text);
  if (!candidates.length) {
    appendMessage('bot', `<p>${esc(t(S.chatbotFallback))}</p>`);
    renderSuggestChips(defaultSuggestions());
    return;
  }
  const best = candidates[0];
  appendMessage('bot', replyHtmlFor(best));
  renderSuggestChips(suggestionsFor(best));
}

function handleSend() {
  const input = el('chatbot-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', esc(text));
  input.value = '';
  respond(text);
}

// #video-search-input 의 필터는 VIDEO_CLIPS[i].label(한국어 전용 평문
// 문자열)과만 비교한다(app.js 확인됨) — EXERCISES[i].label(다국어 객체)를
// 넣으면 화면 언어가 한국어가 아닐 때 검색이 실패한다. key 로 두 목록을
// 잇는다.
function goToExerciseVideo(exerciseKey) {
  const clip = VIDEO_CLIPS.find((c) => c.key === exerciseKey);
  const trigger = document.querySelector('.video-gallery-trigger-btn');
  if (trigger) trigger.click(); // showScreen + renderVideoGallery(최초 1회) + 배경음, app.js 의 기존 진입 로직 그대로 재사용
  else goScreen('video-gallery-screen');
  const input = document.getElementById('video-search-input');
  if (input && clip) {
    input.value = clip.label;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function initChatbot({ translate, STATIC_UI, onShowScreen } = {}) {
  if (typeof translate === 'function') t = translate;
  if (STATIC_UI) S = STATIC_UI;
  if (typeof onShowScreen === 'function') goScreen = onShowScreen;

  try {
    const form = el('chatbot-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); handleSend(); });

    el('chatbot-suggest')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.chatbot-chip');
      if (!chip) return;
      const input = el('chatbot-input');
      if (input) input.value = chip.textContent;
      handleSend();
    });

    el('chatbot-messages')?.addEventListener('click', (e) => {
      const link = e.target.closest('.chatbot-detail-link');
      if (!link) return;

      if (link.dataset.injury) {
        const guide = INJURY_GUIDES.find((g) => g.id === link.dataset.injury);
        if (!guide) return;
        goScreen('recovery-screen');
        const input = document.getElementById('injury-search-input');
        if (input) { input.value = t(guide.part); input.dispatchEvent(new Event('input', { bubbles: true })); }
        return;
      }

      if (link.dataset.exercise) { goToExerciseVideo(link.dataset.exercise); return; }

      if (link.dataset.program) { goScreen('programs-screen'); return; }
    });

    el('chatbot-back-btn')?.addEventListener('click', () => goScreen('more-screen'));

    // "더보기" 목록의 항목은 회복·운동영상 항목처럼 각 화면이 자기 진입
    // 버튼을 스스로 챙긴다(app.js 의 .recovery-trigger-btn 과 같은 자리) —
    // 화면으로 들어가는 것과, 처음 열 때 한 번만 인사 + 제안 칩을 채우는
    // 것을 여기서 같이 한다. 다시 열 때마다 인사가 또 쌓이면 대화가 아니라
    // 로그가 된다.
    let greeted = false;
    document.getElementById('open-chatbot-btn')?.addEventListener('click', () => {
      goScreen('chatbot-screen');
      if (greeted) return;
      greeted = true;
      appendMessage('bot', `<p>${esc(t(S.chatbotGreeting))}</p>`);
      renderSuggestChips(defaultSuggestions());
    });
  } catch (e) {
    console.error('chatbot setup failed:', e);
  }
}
