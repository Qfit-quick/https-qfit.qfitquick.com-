// 챗봇 — 실제 AI 가 아니라 키워드로 답을 찾아 주는 안내다(2026-09-17 요청).
//
// 왜 진짜 AI 가 아닌가: 이 앱은 서버 없는 정적 사이트라, AI API 를 쓰려면
// 키를 어딘가에 두고(브라우저에 그대로 두면 누구나 훔쳐 쓸 수 있다) 요청을
// 대신 보내 줄 백엔드가 있어야 한다 — 그건 이번 한 줄 요청보다 훨씬 큰
// 작업이고 매달 실제 비용이 든다. 대신 이미 앱 안에 있는 진짜 콘텐츠
// (부위별 대처법·회복 습관, src/data/recovery.js)를 키워드로 찾아 그대로
// 보여주는 쪽을 택했다 — 답이 뭔가 지어내는 일이 없고, 화면에 있는 것과
// 항상 같은 말을 한다.
//
// 부위별 대처법·회복 습관 데이터를 다시 적지 않고 recovery.js 를 그대로
// 읽는다 — 같은 내용이 두 곳에 있으면 언젠가 한쪽만 고쳐서 서로 어긋난다.

import { RECOVERY_CARDS, INJURY_GUIDES } from '../data/recovery.js';
import { CHATBOT_FAQ, matchesKeyword } from '../data/chatbot-faq.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let goScreen = () => {};

const el = (id) => document.getElementById(id);

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 세 언어 중 아무 값이나 걸리면 맞는다 — 화면 언어와 다르게 물어봐도
// (예: 한국어 화면에서 "shoulder") 찾을 수 있게.
function matchesAnyLang(text, dict) {
  return ['ko', 'en', 'zh'].some((l) => dict[l] && matchesKeyword(text, dict[l]));
}

function findInjuryMatch(text) {
  return INJURY_GUIDES.find((g) => matchesAnyLang(text, g.part));
}

function findRecoveryMatch(text) {
  return RECOVERY_CARDS.find((c) => matchesAnyLang(text, c.tag));
}

function findFaqMatch(text) {
  const faq = CHATBOT_FAQ.find((f) => f.keywords.some((k) => matchesKeyword(text, k)));
  return faq ? faq.answer : null;
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

// 기본 제안 칩 — 회복 화면의 부위 8개 이름 그대로.
function defaultSuggestions() {
  return INJURY_GUIDES.map((g) => t(g.part));
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

function respond(text) {
  const injury = findInjuryMatch(text);
  if (injury) { appendMessage('bot', injuryReplyHtml(injury)); renderSuggestChips(defaultSuggestions()); return; }

  const recovery = findRecoveryMatch(text);
  if (recovery) { appendMessage('bot', recoveryReplyHtml(recovery)); renderSuggestChips(RECOVERY_CARDS.map((c) => t(c.tag))); return; }

  const faq = findFaqMatch(text);
  if (faq) { appendMessage('bot', `<p>${esc(t(faq))}</p>`); renderSuggestChips(defaultSuggestions()); return; }

  appendMessage('bot', `<p>${esc(t(S.chatbotFallback))}</p>`);
  renderSuggestChips(defaultSuggestions());
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
      const guide = INJURY_GUIDES.find((g) => g.id === link.dataset.injury);
      if (!guide) return;
      goScreen('recovery-screen');
      const input = document.getElementById('injury-search-input');
      if (input) { input.value = t(guide.part); input.dispatchEvent(new Event('input', { bubbles: true })); }
    });

    el('chatbot-back-btn')?.addEventListener('click', () => goScreen('more-screen'));

    // 화면을 처음 열 때 한 번만 인사 + 제안 칩을 채운다. 다시 열 때마다
    // 인사가 또 쌓이면 대화가 아니라 로그가 된다.
    const chatbotScreen = el('chatbot-screen');
    let greeted = false;
    document.getElementById('open-chatbot-btn')?.addEventListener('click', () => {
      if (greeted) return;
      greeted = true;
      appendMessage('bot', `<p>${esc(t(S.chatbotGreeting))}</p>`);
      renderSuggestChips(defaultSuggestions());
    });
  } catch (e) {
    console.error('chatbot setup failed:', e);
  }
}
