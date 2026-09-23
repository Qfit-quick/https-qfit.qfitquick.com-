// 챗봇 — 기본은 키워드로 답을 찾아 주는 안내다(2026-09-17 요청).
//
// 이 앱은 서버 없는 정적 사이트라, 화면이 AI API 키를 직접 들고 부르면
// 그 키를 누구나 훔쳐 쓸 수 있다 — 그래서 로컬 답은 여기 이 파일이 이미
// 앱 안에 있는 진짜 콘텐츠를 키워드로 찾아 그대로(즉시, 지어내는 일 없이)
// 보여준다. 이게 항상 먼저, 항상 뜬다.
//
// 2026-09-22: 그 옆에 진짜 AI 를 붙일 자리를 열었다 — tryServerAnswer() 가
// 같은 질문을 로컬 개발 서버(server/chat.mjs, `npm run dev:chat`)로도 보내
// 본다. 키는 그 서버 쪽 .env 에만 있고 브라우저로 안 나온다(README 의
// "챗봇 서버" 절 참고). 이 서버가 없으면(대부분의 경우 — 배포본 포함)
// 그 요청은 조용히 실패하고 위 로컬 답 그대로 남는다. 있고 LLM 이
// 켜져 있으면 몇 초 뒤 AI 가 정리한 답이 보조 말풍선으로 하나 더 붙는다.
//
// 2026-09-17 확장 요청("큐핏에 해당하는 내용은 뭐든 검색하면 자연스럽게
// 안내") — 부위별 대처법·회복 습관·앱 사용법 FAQ 세 곳만 찾던 것을, 운동
// 종류·업적·프로그램까지 6곳으로 넓혔다. 각 데이터를 다시 적지 않고 원본
// 모듈을 그대로 읽는다 — 같은 내용이 두 곳에 있으면 언젠가 한쪽만 고쳐서
// 서로 어긋난다. 업적만 예외: achievements.js 의 설명은 함수(check)라 글로
// 옮길 수 없어서 chatbot-faq.js 에 ACHIEVEMENT_HINTS 로 새로 썼다.
//
// 2026-09-18 재확장("챗봇도 아직 부족한 것 같아") — 더보기·설정 화면
// 안의 기능(소리·진동·테마·글자크기·내보내기·데이터삭제·프리미엄·설치·
// 루틴·계획·도전·신체정보·초대·준비운동·기본세트)이 하나도 안 걸리고
// 있어서 chatbot-faq.js 에 16개를 더 적었다. 그리고 원래 있었지만 안 쓰던
// 데이터 두 개를 새로 붙였다 — FOODS/EATING_OUT(식단표, src/data/foods.js,
// 지금까지 이 표를 읽는 화면이 없었다)로 "닭가슴살 칼로리" 같은 질문에
// 답하고, MUSCLE_GROUPS(부위 묶음, src/data/muscle-groups.js)로 "하체
// 운동 뭐 있어?" 처럼 부위로 묻는 질문에 그 부위 동작 목록을 보여준다.
// COACHES 도 이름으로 물으면(예: "도발 코치") 그 코치 성격을 보여준다.
//
// 같은 날 요청("비슷한 오타를 치더라도 추측해서 정보를 줘야") — scoreMatch
// 가 정확히 안 맞아도 편집거리(오타 허용)로 한 번 더 본다. 실제 데이터
// 전부를 놓고 "서로 다른 두 항목이 오타로 헷갈릴 만큼 가깝지 않은지"
// 확인했다 — 그렇게 걸린 것 중 "와이드푸쉬업"↔"파이크푸쉬업"처럼 진짜
// 다른 운동끼리 헷갈릴 뻔한 건 문턱을 좁혀 없앴고, "백미밥"↔"현미밥"
// 처럼 어차피 값이 비슷해 틀려도 크게 문제없는 것만 남겨 뒀다.
//
// 여러 곳에서 동시에 맞을 수 있어(예: "스쿼트"가 운동 이름이면서 회복
// 태그이기도 할 수 있음) 첫 번째로 찾은 것을 바로 답하지 않고, 매칭된
// 키워드 길이가 가장 긴(=가장 구체적인) 후보를 고른다(scoreMatch).
//
// 2026-09-18 세 번째 확장("도전 탭 세부까지 원하면?" → "ㅇㅇ") — 도전
// (챌린지 트래커) 7개 트랙을 이름으로 찾을 수 있게 했다. 트랙 안의
// 주차별 세부 운동까지는 안 옮긴다(합치면 100개가 넘어 challengeTracks.js
// 를 통째로 베끼는 셈이 된다) — 개요만 보여주고 나머지는 도전 탭 안에서
// 보게 한다. 이 트랙 이름들은 challengeTracks.js 자체가 한국어 전용으로
// 정해 둔 데이터라(전문 용어 오역 위험) 여기서도 한국어로만 찾는다.

import { RECOVERY_CARDS, INJURY_GUIDES } from '../data/recovery.js';
import { CHATBOT_FAQ, ACHIEVEMENT_HINTS } from '../data/chatbot-faq.js';
import { EXERCISES } from '../data/exercises.js';
import { VIDEO_CLIPS } from '../data/video-clips.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PROGRAMS } from '../data/programs.js';
import { FOODS, EATING_OUT } from '../data/foods.js';
import { MUSCLE_GROUPS } from '../data/muscle-groups.js';
import { COACHES } from '../data/coaches.js';
import { CHALLENGE_TRACKS, CHALLENGE_TRACK_ORDER } from '../data/challengeTracks.js';

let t = (o) => (o && o.ko) || '';
let S = {};
let goScreen = () => {};

// 2026-09-21 개선안("대화가 이어지게 만들기") — 방금 답한 대상을 기억해
// "더 쉽게는?" 같은 대명사형 후속 질문에 이어서 답한다. 화면을 나갔다
// 들어오면(화면 자체가 안 없어지고 숨기만 하므로) 이 값도 그대로 남는데,
// 대화가 이어지는 게 자연스러우므로 의도적으로 초기화하지 않는다 —
// "새 대화" 버튼을 누르면 그때 비운다.
let lastCandidate = null;

// 로컬 서버 연결(2026-09-22) — 로컬 답은 위 respond() 가 이미 즉시 보여준다.
// 그 옆에서 server/chat.mjs(npm run dev:chat)로 같은 질문을 한 번 더 보내
// LLM 이 정리한 답(mode: 'rag')을 얻으면 보조 말풍선으로 하나 더 붙인다 —
// 서버가 없거나(배포본 포함) 키가 없으면 이 요청은 그냥 조용히 실패하고
// 사용자에게는 이미 보여준 로컬 답 그대로 남는다. mode 가 'rule'/'fallback'
// 이면 로컬 답과 다를 게 없으므로 굳이 또 보여주지 않는다.
let netGeneration = 0;
let netController = null;
let netHistory = []; // {role,content} — 서버가 실제로 낸 답만 쌓는다
let netContext = []; // 직전 서버 답 sources[0].id — "더 쉽게는?" 류 후속 질문용

const el = (id) => document.getElementById(id);

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

// 편집거리(레벤슈타인) — 두 문자열을 같게 만들려면 글자를 몇 개나
// 넣고·빼고·바꿔야 하는지. 오타 허용의 기준값으로 쓴다.
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}

// 매칭 안 되면 0, 정확히 맞으면 키워드 길이(공백 제거) — 길수록 더 구체적인
// 매칭으로 보고 우선한다. "스쿼트"(3글자)가 "스"(1글자, 어딘가에 있다면)
// 보다 이긴다.
//
// 정확히 안 맞아도 바로 포기하지 않는다(2026-09-18 요청: "비슷한 오타를
// 치더라도 추측해서 정보를 줘야") — 문장 안을 키워드 길이만한 창으로
// 훑으며 편집거리를 재서, 한두 글자만 다르면("스쿼드"↔"스쿼트") 오타로
// 보고 매칭시킨다.
//
// 2글자 키워드는 오타 허용 대상에서 뺀다("알림"↔"알러지"처럼 글자
// 하나만 겹쳐도 편집거리 1로 걸려서, 전혀 다른 두 낱말이 오타로
// 오인된다 — 2글자에서는 1글자 차이가 절반이 달라진 것과 같다). 12자
// 넘는 것도 뺀다 — 그 정도면 문장이라, 오타 허용을 걸면 관계없는
// 문장끼리 우연히 비슷해져 엉뚱한 게 걸린다. 오타로 맞은 점수는 항상
// 정수 아래로 깎아서(-0.5), 실제 정확한 매칭과 점수가 같아져 오타
// 쪽이 이기는 일이 없게 한다.
function scoreMatch(text, keyword) {
  const kw = norm(keyword);
  if (!kw) return 0;
  const t = norm(text);
  if (t.includes(kw)) return kw.length;
  if (kw.length < 3 || kw.length > 12) return 0;
  const maxDist = kw.length <= 6 ? 1 : kw.length <= 10 ? 2 : 3;
  const minLen = kw.length <= 3 ? kw.length : kw.length - 1;
  const maxLen = kw.length + 1;
  const scanLen = Math.min(t.length, 40);
  let best = maxDist + 1;
  for (let start = 0; start < scanLen; start++) {
    for (let len = minLen; len <= maxLen; len++) {
      if (start + len > t.length) break;
      const dist = editDistance(t.slice(start, start + len), kw);
      if (dist < best) best = dist;
    }
  }
  return best <= maxDist ? Math.max(1, kw.length - best) - 0.5 : 0;
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

// FOODS/EATING_OUT 라벨 다수가 "(생것)"/"(raw)"/"(生)"처럼 조리 상태를
// 괄호로 붙여 둔다(재료 원출처를 정확히 옮기려던 결정 — foods.js 머리
// 설명 참고). 그런데 실제로 "닭가슴살 칼로리"라고 묻지 "닭가슴살(생것)
// 칼로리"라고 괄호까지 쳐서 묻는 사람은 없다 — 매칭용으로만 괄호 안을
// 지운다. "김밥 1줄"처럼 괄호가 아닌 수량 표기가 붙은 것들은 이 방식으로
// 못 잡는다 — 전부 손으로 고치기엔 표가 커서, 그 정도 사각지대는 남겨
// 둔다(못 찾으면 다른 후보로 넘어가거나 "모르겠다"로 빠질 뿐, 틀린 답을
// 주지는 않는다).
function stripQualifier(str) {
  return String(str || '').replace(/[([（][^)）\]]*[)）\]]/g, '');
}

function scoreFoodName(text, labelDict) {
  const stripped = { ko: stripQualifier(labelDict.ko), en: stripQualifier(labelDict.en), zh: stripQualifier(labelDict.zh) };
  return scoreAnyLang(text, stripped);
}

// 점수가 같으면(예: "다이어트 3주 프로그램"이 다이어트 프로그램 이름과
// FAQ의 '프로그램' 키워드에 똑같이 맞을 때) sort 는 안정 정렬이라 먼저
// push 한 쪽이 이긴다 — 그래서 구체적인 답(운동·업적·프로그램)을 뭉뚱그린
// 사용법 FAQ보다 먼저 넣는다. 콕 집어 물었으면 콕 집은 답을 우선한다.
function collectCandidates(text) {
  const list = [];
  const push = (type, score, data) => { if (score > 0) list.push({ type, score, data }); };

  INJURY_GUIDES.forEach((g) => push('injury', scoreAnyLang(text, g.part), g));
  RECOVERY_CARDS.forEach((c) => push('recovery', scoreAnyLang(text, c.tag), c));
  EXERCISES.forEach((ex) => push('exercise', scoreAnyLang(text, ex.label), ex));
  ACHIEVEMENTS.forEach((a) => push('achievement', scoreAnyLang(text, a.label), a));
  COACHES.forEach((c) => push('coach', scoreAnyLang(text, c.name), c));
  FOODS.forEach((f) => push('food', scoreFoodName(text, f.label), f));
  EATING_OUT.forEach((f) => push('eatout', scoreFoodName(text, f.label), f));
  // 부위 묶음("하체" 등)을 프로그램보다 먼저 넣는다 — 프로그램 이름은
  // 기간을 지우고 매칭하는데("하체 3주" → "하체"), 그러면 "하체 운동 뭐
  // 있어?" 같은 순수 부위 질문이 부위 목록이 아니라 어쩌다 이름이 겹친
  // 프로그램으로 답해지는 문제가 있었다(2026-09-18 발견) — 짧고 흔한
  // 부위 이름 하나로만 묻는다면 프로그램보다 부위 쪽 뜻일 확률이 높다.
  MUSCLE_GROUPS.forEach((g) => push('muscle', scoreAnyLang(text, g.label), g));
  PROGRAMS.forEach((p) => push('program', Math.max(scoreProgramName(text, p.name), scoreAnyLang(text, p.tagline)), p));
  // 도전(챌린지 트래커) 7개 트랙 — 이름·별칭 둘 다 한국어 전용이다
  // (challengeTracks.js 머리 설명: 칼리스테닉스 전문 용어 104개+@를
  // 영어·중국어로 오역 없이 옮기려면 별도 검수가 필요해서, 지금은
  // 한국어만 정확하게 유지하기로 한 결정을 그대로 따른다 — scoreAnyLang
  // 이 아니라 scoreMatch 로 한국어만 본다). name(정식 이름)과 short(줄여
  // 부르는 이름, 예: 핸드스탠드의 short 는 '물구나무')을 둘 다 본다.
  CHALLENGE_TRACK_ORDER.forEach((key) => {
    const track = CHALLENGE_TRACKS[key];
    if (!track) return;
    push('challenge', Math.max(scoreMatch(text, track.name), scoreMatch(text, track.short)), { key, track });
  });
  CHATBOT_FAQ.forEach((f) => {
    const score = Math.max(0, ...f.keywords.map((k) => scoreMatch(text, k)));
    push('faq', score, f);
  });

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
    ...INJURY_GUIDES.slice(0, 2).map((g) => t(g.part)),
    ...EXERCISES.slice(0, 2).map((ex) => t(ex.label)),
    ...(PROGRAMS[0] ? [t(PROGRAMS[0].name)] : []),
    ...(FOODS[0] ? [t(FOODS[0].label)] : []),
    ...(MUSCLE_GROUPS[0] ? [t(MUSCLE_GROUPS[0].label)] : []),
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

// 코치는 이름 하나로만 물으면(예: "도발 코치") 성격을 바로 보여주는 게
// 프로그램 소개보다 이해가 빠르다 — 응원 대사 중 짧은 한 줄(push)을
// 그대로 인용한다. push 는 배열이 아니라 문자열 하나뿐이라 pickVariant
// 같은 무작위 선택이 필요 없다.
function coachReplyHtml(coach) {
  return `<p><b>${esc(t(coach.name))}</b></p>` +
    (coach.push ? `<p>"${esc(t(coach.push))}"</p>` : '');
}

// 재료 표(FOODS)는 100g 기준 값만 갖고 있어서 그대로 보여주면 "그래서
// 내가 먹는 양은 몇 kcal 인데?"가 안 풀린다 — serveG(1인분 그램수)로
// 환산한 값을 같이 보여준다.
function foodReplyHtml(food) {
  const per100 = food.per100 || {};
  const serveKcal = food.serveG ? Math.round((per100.kcal || 0) * food.serveG / 100) : null;
  const macros = `${per100.kcal ?? '?'}kcal · P${per100.p ?? '?'} · C${per100.c ?? '?'} · F${per100.f ?? '?'}`;
  return `<p><b>${esc(t(food.label))}</b></p>` +
    `<p>${esc(t(S.chatbotFoodPer100))} ${esc(macros)}</p>` +
    (food.serve && serveKcal != null ? `<p>${esc(t(food.serve))}: ${esc(t(S.chatbotAboutKcal).replace('%s', String(serveKcal)))}</p>` : '');
}

// EATING_OUT 은 1인분 기준 kcal 을 통째로 들고 있고(재료처럼 100g 환산이
// 필요 없다), 대신 실천 팁(tip)이 핵심이라 그걸 같이 보여준다.
function eatoutReplyHtml(item) {
  return `<p><b>${esc(t(item.label))}</b> — ${esc(t(S.chatbotAboutKcal).replace('%s', String(item.kcal)))}</p>` +
    (item.tip ? `<p>${esc(t(item.tip))}</p>` : '');
}

// 개선안 04번(부정·제외 조건) — excludeTerms 가 있으면("스쿼트 빼고 하체
// 운동 알려줘"에서 뽑은 "스쿼트") 그 글자를 담고 있는 운동은 목록에서
// 뺀다. 제외 사유를 감춰서 왜 안 나왔는지 헷갈리지 않게 짧게 밝혀 둔다.
function muscleReplyHtml(group, excludeTerms) {
  let names = group.keys.map((k) => EXERCISES.find((ex) => ex.key === k)).filter(Boolean);
  let excludedNote = '';
  if (excludeTerms && excludeTerms.length) {
    const before = names.length;
    names = names.filter((ex) => {
      const label = t(ex.label);
      return !excludeTerms.some((term) => label.length >= 2 && norm(term).includes(norm(label)));
    });
    if (names.length < before) {
      excludedNote = ` <span class="dim">${esc(t(S.chatbotExcludedNote).replace('%s', excludeTerms.join(', ')))}</span>`;
    }
  }
  const labels = names.slice(0, 5).map((ex) => t(ex.label));
  return `<p><b>${esc(t(group.label))}</b>${excludedNote}</p><p>${esc(labels.join(', '))}</p>`;
}

// 트랙 전체(예: 턱걸이 12주 4단계) 세부를 다 넣지는 않는다 — 한 단계에
// 운동이 4~5개씩, 4단계, 트랙 7개면 도합 100개가 넘어서 여기 다 옮기면
// 이 파일 자체가 challengeTracks.js 의 두 번째 사본이 된다(머리 설명의
// "같은 내용 두 곳" 원칙 위반). 개요(총 주차·단계 수·1단계 목표)만 보여
// 주고, 나머지는 실제 화면(도전 탭)에서 보게 한다.
function challengeReplyHtml({ key, track }) {
  const firstPhase = track.phases && track.phases[0];
  return `<p><b>${esc(track.name)}</b> (${track.totalWeeks}주 · ${track.phases.length}단계)</p>` +
    (firstPhase ? `<p>1단계 — ${esc(firstPhase.title)}: ${esc(firstPhase.goal)}</p>` : '') +
    `<button type="button" class="link-btn chatbot-detail-link" data-challenge="${key}">` +
    esc(t(S.chatbotDetailLink).replace('%s', track.name)) + '</button>';
}

function replyHtmlFor(candidate) {
  switch (candidate.type) {
    case 'injury': return injuryReplyHtml(candidate.data);
    case 'recovery': return recoveryReplyHtml(candidate.data);
    case 'exercise': return exerciseReplyHtml(candidate.data);
    case 'achievement': return achievementReplyHtml(candidate.data);
    case 'coach': return coachReplyHtml(candidate.data);
    case 'program': return programReplyHtml(candidate.data);
    case 'food': return foodReplyHtml(candidate.data);
    case 'eatout': return eatoutReplyHtml(candidate.data);
    case 'muscle': return muscleReplyHtml(candidate.data);
    case 'challenge': return challengeReplyHtml(candidate.data);
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
    case 'coach': return COACHES.map((c) => t(c.name));
    case 'program': return PROGRAMS.map((p) => t(p.name));
    case 'food': return FOODS.map((f) => t(f.label)).filter((l) => l !== t(candidate.data.label)).slice(0, 6);
    case 'eatout': return EATING_OUT.map((f) => t(f.label)).filter((l) => l !== t(candidate.data.label)).slice(0, 6);
    case 'muscle': return MUSCLE_GROUPS.map((g) => t(g.label));
    case 'challenge': return CHALLENGE_TRACK_ORDER.map((k) => CHALLENGE_TRACKS[k].short);
    default: return defaultSuggestions();
  }
}

// 개선안 16번(긴 입력·메시지 누적 제한) — 대화가 오래 쌓이면 DOM 이 계속
// 불어나 저가 단말에서 스크롤이 무거워진다. 오래된 말풍선부터 지운다.
// 입력 길이 제한은 여기 말고 app/index.html 의 #chatbot-input maxlength.
const MAX_BUBBLES = 60;

function appendMessage(role, html) {
  const box = el('chatbot-messages');
  if (!box) return;
  const bubble = document.createElement('div');
  bubble.className = 'chatbot-msg ' + role;
  bubble.innerHTML = html;
  box.appendChild(bubble);
  while (box.children.length > MAX_BUBBLES) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function renderSuggestChips(topics) {
  const box = el('chatbot-suggest');
  if (!box) return;
  box.innerHTML = topics.map((label) =>
    `<button type="button" class="chip chatbot-chip">${esc(label)}</button>`
  ).join('');
}

// 개선안 04번 — "스쿼트 빼고 하체 운동 알려줘"에서 "빼고" 앞을 제외 대상으로
// 뽑고, 그 부분을 검색 문장에서 지운다. 안 지우면 제외하려던 그 운동 자체가
// 더 구체적인 매칭으로 걸려("스쿼트" 3글자 > "하체" 2글자, scoreMatch 참고)
// 엉뚱하게 그 운동 설명이 먼저 나와 버린다.
function extractExclusion(text) {
  const m = /(.+?)\s*(?:빼고|빼줘|말고|제외하고|제외해서|제외)/.exec(text);
  if (!m) return { text, excluded: [] };
  const excluded = m[1].trim();
  if (!excluded) return { text, excluded: [] };
  const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim();
  return { text: rest || text, excluded: [excluded] };
}

// 개선안 02번 — "A랑 B 차이" / "A vs B" 에서 비교 대상 둘을 뽑는다. 명시적인
// 비교 표현(차이/비교/다른 점, vs)이 있을 때만 걸어서, "스쿼트와 런지 자세"
// 같은 그냥 나열 질문까지 비교 모드로 오인하지 않게 한다.
function extractComparisonParts(text) {
  let m = /^(.+?)\s*(?:이랑|랑|와|과|하고)\s*(.+?)\s*(?:의\s*)?(?:차이|비교|다른\s*점)/.exec(text);
  if (!m) m = /^(.+?)\s+vs\.?\s+(.+)$/i.exec(text);
  if (!m) return null;
  const a = m[1].trim(), b = m[2].trim();
  return a && b ? [a, b] : null;
}

// collectCandidates 는 "사용자 문장이 항목 이름을 담고 있어야" 걸리는
// 방향이다(예: "스쿼트 어떻게 해" 안에 "스쿼트"가 들어있음). 그런데
// "Cindy"·"QCE" 처럼 비교 질문에서 짧게 뽑아낸 이름은 반대로 프로그램의
// 정식 이름 쪽이 더 길 때가 있다("스파이더맨 Cindy 1주"에 "Cindy"가
// 들어있는 것이지 그 반대가 아니다). 비교 모드에서만 양방향으로 한 번
// 더 본다 — collectCandidates 자체(다른 20곳이 기대는 채점 방식)는 건드리지
// 않는다.
function findByShortName(phrase) {
  const direct = collectCandidates(phrase);
  if (direct.length && direct[0].score >= 2) return direct[0];
  const p = norm(phrase);
  if (p.length >= 2) {
    const prog = PROGRAMS.find((pr) => ['ko', 'en', 'zh'].some((l) => {
      const name = norm(stripProgramDuration((pr.name && pr.name[l]) || ''));
      return name && (name.includes(p) || p.includes(name));
    }));
    if (prog) return { type: 'program', score: p.length, data: prog };
  }
  return direct[0] || null;
}

// 개선안 05번 — 검색 후보가 하나도 안 걸렸을 때만 본다("안녕, 스쿼트
// 알려줘"처럼 인사말과 진짜 질문이 섞이면 스쿼트가 이미 후보로 걸려서
// 여기까지 안 온다 — 명세의 "섞인 질문은 운동 질문으로 보낸다" 기준과 같다).
function classifySmallTalk(text) {
  const n = norm(text);
  if (!n) return null;
  if (/^(안녕|하이|hello|hi|헬로)/.test(n)) return 'greeting';
  if (/(고마워|고맙|감사|thank)/.test(n)) return 'thanks';
  if (/(하기싫|귀찮|의욕없|하기힘들|운동싫|운동하기싫)/.test(n)) return 'motivation';
  return null;
}

function labelOf(c) {
  switch (c.type) {
    case 'injury': return t(c.data.part);
    case 'recovery': return t(c.data.tag);
    case 'exercise': case 'achievement': case 'food': case 'eatout': case 'muscle':
      return t(c.data.label);
    case 'coach': case 'program': return t(c.data.name);
    case 'challenge': return c.data.track.name;
    case 'faq': return c.data.keywords[0];
    default: return '';
  }
}

// 개선안 06번 — 1등 점수가 여러 서로 다른 항목에 걸쳐 정확히 같으면(오타
// 보정은 항상 -0.5 를 깎으므로 여기 안 걸린다 — 순수 동점만) 임의로 하나를
// 고르지 않고 사용자에게 고르게 한다.
//
// 문턱을 3 으로 둔다(실측: "스쿼트 빼고 하체 운동 알려줘" 에서 "하체"(2글자,
// MUSCLE_GROUPS)와 여러 프로그램 태그라인에 흔히 들어있는 "운동"(2글자)이
// 우연히 점수 2로 동점 나서, 멀쩡히 답할 수 있는 질문에도 재질문이 떴다 —
// 2글자는 이렇게 무관한 항목끼리 우연히 겹치기 쉬워 재질문 근거로 약하다).
function pickOrClarify(candidates) {
  const top = candidates[0];
  if (top.score >= 3) {
    const seen = new Set([labelOf(top)]);
    const tied = [top];
    for (const c of candidates.slice(1)) {
      if (c.score !== top.score) break;
      const label = labelOf(c);
      if (!seen.has(label)) { seen.add(label); tied.push(c); }
    }
    if (tied.length > 1) return { kind: 'clarify', options: tied.slice(0, 4) };
  }
  return { kind: 'single', candidate: top };
}

// 개선안 03번 — "더 쉽게는?"처럼 그 자체로는 아무 것도 안 걸리는 대명사형
// 후속 질문. 방금 답한 대상(lastCandidate)이 있으면 새로 지어내지 않고
// 같은 답을 다시 보여준다 — 데이터에 "더 쉬운 버전"이 따로 없어서, 없는
// 사실을 만들어내는 대신 "지금 이야기 중인 게 이거 맞다"는 확인에 그친다.
const FOLLOWUP_RE = /^(그거|그것|그\s*운동|더\s*쉽게|더\s*쉬운|더\s*어렵게|다른\s*건|다른\s*거|그럼|그건)/;

function respond(text) {
  const { text: stripped, excluded } = extractExclusion(text);

  const compareParts = extractComparisonParts(stripped);
  if (compareParts) {
    const a = findByShortName(compareParts[0]);
    const b = findByShortName(compareParts[1]);
    if (a && b && labelOf(a) !== labelOf(b)) {
      appendMessage('bot', `<p>${esc(t(S.chatbotCompareIntro))}</p>` + replyHtmlFor(a) + replyHtmlFor(b));
      renderSuggestChips([...new Set([...suggestionsFor(a), ...suggestionsFor(b)])].slice(0, 6));
      lastCandidate = null;
      return;
    }
    if (a || b) {
      const found = a || b;
      appendMessage('bot', replyHtmlFor(found));
      renderSuggestChips(suggestionsFor(found));
      lastCandidate = found;
      return;
    }
    // 둘 다 못 찾았으면 비교 질문으로 오인한 것으로 보고 아래 일반 검색으로 넘어간다.
  }

  const candidates = collectCandidates(stripped);

  if (!candidates.length) {
    if (lastCandidate && FOLLOWUP_RE.test(text.trim())) {
      appendMessage('bot',
        `<p>${esc(t(S.chatbotContextNote).replace('%s', labelOf(lastCandidate)))}</p>` + replyHtmlFor(lastCandidate));
      renderSuggestChips(suggestionsFor(lastCandidate));
      return;
    }
    const smallTalk = classifySmallTalk(text);
    if (smallTalk === 'greeting') {
      appendMessage('bot', `<p>${esc(t(S.chatbotGreeting))}</p>`);
      renderSuggestChips(defaultSuggestions());
      return;
    }
    if (smallTalk === 'thanks') {
      appendMessage('bot', `<p>${esc(t(S.chatbotThanksReply))}</p>`);
      renderSuggestChips(defaultSuggestions());
      return;
    }
    if (smallTalk === 'motivation') {
      const easy = [...PROGRAMS].sort((p1, p2) => p1.weeks - p2.weeks).slice(0, 3).map((p) => t(p.name));
      appendMessage('bot', `<p>${esc(t(S.chatbotMotivationReply))}</p>`);
      renderSuggestChips(easy.length ? easy : defaultSuggestions());
      return;
    }
    appendMessage('bot', `<p>${esc(t(S.chatbotFallback))}</p>`);
    renderSuggestChips(defaultSuggestions());
    return;
  }

  const picked = pickOrClarify(candidates);
  if (picked.kind === 'clarify') {
    appendMessage('bot', `<p>${esc(t(S.chatbotClarifyIntro))}</p>`);
    renderSuggestChips(picked.options.map(labelOf));
    return;
  }

  const best = picked.candidate;
  const html = best.type === 'muscle' ? muscleReplyHtml(best.data, excluded) : replyHtmlFor(best);
  appendMessage('bot', html);
  renderSuggestChips(suggestionsFor(best));
  lastCandidate = best;
}

function handleSend() {
  const input = el('chatbot-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', esc(text));
  input.value = '';
  paintCount();
  respond(text);
  tryServerAnswer(text);
}

function paintCount() {
  const input = el('chatbot-input');
  const count = el('chatbot-count');
  if (input && count) count.textContent = `${input.value.length}/1000`;
}

// server/chat.mjs 가 보는 locale 값. document.documentElement.lang 은
// app.js 가 언어를 바꿀 때마다 같이 바꿔 둔다(중국어는 'zh-CN').
function currentLocale() {
  const lang = document.documentElement.lang || 'ko';
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('en')) return 'en';
  return 'ko';
}

// 상태 줄 — 텍스트만 줄 수도, 뒤에 링크 버튼(취소·다시 시도) 하나를
// 붙일 수도 있다. text 가 없으면 줄 자체를 숨긴다.
function setStatus(text, actionLabel, onAction) {
  const line = el('chatbot-status');
  if (!line) return;
  if (!text) { line.hidden = true; line.textContent = ''; return; }
  line.hidden = false;
  line.textContent = text;
  if (actionLabel && onAction) {
    line.appendChild(document.createTextNode(' '));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-btn';
    btn.textContent = actionLabel;
    btn.addEventListener('click', onAction);
    line.appendChild(btn);
  }
}

function aiReplyHtml(data) {
  const sources = (data.sources || [])
    .filter((s) => s && s.screenId)
    .map((s) => `<button type="button" class="link-btn chatbot-detail-link" data-source-id="${esc(s.id)}" data-source-title="${esc(s.title)}" data-source-screen="${esc(s.screenId)}" data-source-entity="${esc(s.entityKey ?? '')}">` +
      esc(t(S.chatbotDetailLink).replace('%s', s.title)) + '</button>')
    .join('');
  return `<p class="dim chatbot-ai-label">${esc(t(S.chatbotAiLabel))}</p><p>${esc(data.answer)}</p>${sources}`;
}

// 서버(로컬 개발용, npm run dev:chat)에 같은 질문을 한 번 더 보낸다.
// generation 번호로 "그 사이 새 질문을 보냈거나 새 대화를 눌렀는지"를
// 본다 — 늦게 도착한 옛 질문의 답이 지금 대화에 끼어들면 안 된다.
async function tryServerAnswer(text) {
  if (netController) netController.abort();
  const controller = new AbortController();
  netController = controller;
  const turn = ++netGeneration;
  const timeout = setTimeout(() => controller.abort(), 8000);
  setStatus(t(S.chatbotAiChecking), t(S.chatbotCancel), () => {
    controller.abort();
    if (turn === netGeneration) setStatus('');
  });

  let res;
  try {
    res = await fetch(new URL('api/chat', document.baseURI), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: netHistory.slice(-6),
        conversationContext: netContext,
        locale: currentLocale(),
      }),
      signal: controller.signal,
    });
  } catch {
    // 서버가 아예 없다(대부분의 경우) — 이미 로컬 답을 보여줬으니 조용히 넘어간다.
    clearTimeout(timeout);
    if (turn === netGeneration) setStatus('');
    return;
  }
  clearTimeout(timeout);
  if (turn !== netGeneration) return;

  // 404 는 "이 경로 자체가 없다" — 배포본(Cloudflare Worker, /api/chat 이라는
  // 파일이 없다)의 정상 상태이자, 유일한 실제 사용자 대다수가 보는 경우다.
  // 그 외 상태(400·413·429·500·504)는 서버는 있는데 뭔가 실패했다는 뜻이라
  // (로컬에서 dev:chat 을 안 띄웠을 때 Vite 프록시가 주는 502/500 포함)
  // 이때만 눈에 보이게 알린다 — 404 까지 알리면 배포본 사용자 전원이
  // 매번 "AI 확인 실패"를 보게 된다.
  if (!res.ok) {
    if (res.status !== 404) setStatus(t(S.chatbotAiError), t(S.chatbotRetry), () => tryServerAnswer(text));
    else setStatus('');
    return;
  }

  let data;
  try { data = await res.json(); } catch { setStatus(''); return; }
  if (turn !== netGeneration) return;
  setStatus('');
  if (data.mode !== 'rag' || !data.answer) return; // 규칙 기반과 다를 게 없다

  appendMessage('bot', aiReplyHtml(data));
  netHistory = [...netHistory, { role: 'user', content: text.slice(0, 1000) }, { role: 'assistant', content: String(data.answer).slice(0, 1000) }].slice(-6);
  netContext = Array.isArray(data.sources) ? data.sources.slice(0, 1).map((s) => s.id) : [];
}

// AI 보조 답의 출처 버튼. 서버 응답의 title 은 이미 요청 locale 로 고른
// 평문이라(src/chat/respond.js 의 toSource) 그대로 검색칸에 넣으면 된다 —
// 단 운동 영상 검색칸만 예외라(바로 아래 goToExerciseVideo 설명) 그쪽은
// 기존 함수를 그대로 쓴다.
function navigateFromSource(source) {
  if (!source || !source.screenId) return;
  const kind = String(source.id).split(':')[0];
  if (kind === 'exercise') { goToExerciseVideo(source.entityKey); return; }
  if (kind === 'muscle') { document.querySelector('.video-gallery-trigger-btn')?.click(); return; }
  if (kind === 'injury' || kind === 'program') {
    goScreen(source.screenId);
    const input = document.getElementById(kind === 'injury' ? 'injury-search-input' : 'program-search-input');
    if (input) { input.value = source.title; input.dispatchEvent(new Event('input', { bubbles: true })); }
    return;
  }
  if (kind === 'challenge') {
    goScreen('challenge-screen');
    const track = CHALLENGE_TRACKS[source.entityKey];
    const tabBtn = track && [...document.querySelectorAll('.challenge-tab-btn')].find((b) => b.textContent.includes(track.short));
    if (tabBtn) tabBtn.click();
    return;
  }
  goScreen(source.screenId);
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

    el('chatbot-input')?.addEventListener('input', paintCount);
    paintCount();

    el('chatbot-messages')?.addEventListener('click', (e) => {
      const link = e.target.closest('.chatbot-detail-link');
      if (!link) return;

      if (link.dataset.sourceId) {
        navigateFromSource({
          id: link.dataset.sourceId,
          title: link.dataset.sourceTitle,
          screenId: link.dataset.sourceScreen,
          entityKey: link.dataset.sourceEntity,
        });
        return;
      }

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

      if (link.dataset.challenge) {
        goScreen('challenge-screen');
        const track = CHALLENGE_TRACKS[link.dataset.challenge];
        // 도전 탭 자체는 부팅 때 이미 그려져 있다(challengeTracker.js 가
        // initChallengeTracker() 끝에서 renderTrack() 을 바로 부른다) —
        // 그래서 운동영상처럼 "처음 한 번 그리기"를 따로 기다릴 필요
        // 없이 바로 트랙 탭 버튼을 찾아 누르면 된다. 버튼 글자가
        // "{short} ({주수}주)" 형태라 short 만 부분일치로 찾는다.
        const tabBtn = track && [...document.querySelectorAll('.challenge-tab-btn')]
          .find((b) => b.textContent.includes(track.short));
        if (tabBtn) tabBtn.click();
        return;
      }
    });

    el('chatbot-back-btn')?.addEventListener('click', () => goScreen('more-screen'));

    const showGreeting = () => {
      appendMessage('bot', `<p>${esc(t(S.chatbotGreeting))}</p>`);
      renderSuggestChips(defaultSuggestions());
    };

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
      showGreeting();
    });

    // 개선안 17번(대화 보관·삭제 기준) — 이번 로컬 버전은 서버 저장이
    // 없으니 "삭제"가 곧 "화면과 맥락 기억 비우기"다. lastCandidate 도
    // 같이 비워야 초기화 직후에 "더 쉽게는?" 이 엉뚱한 이전 대상을
    // 다시 불러오지 않는다. netHistory·netContext 도 같이 비운다 — 안
    // 비우면 "새 대화" 이후에도 서버가 지난 대화 맥락을 계속 본다.
    el('chatbot-reset-btn')?.addEventListener('click', () => {
      if (netController) { netController.abort(); netController = null; }
      netGeneration++;
      netHistory = [];
      netContext = [];
      setStatus('');
      const box = el('chatbot-messages');
      if (box) box.innerHTML = '';
      lastCandidate = null;
      showGreeting();
    });

    // 챗봇 화면을 나가면 그 사이 도착하는 서버 답을 버린다 — 안 그러면
    // 다른 화면을 보고 있는 동안 답이 도착했다가, 나중에 챗봇으로 돌아왔을
    // 때(대화 목록이 안 지워지므로) 뜬금없이 말풍선이 하나 더 붙는다.
    document.addEventListener('screenchange', (e) => {
      if (e.detail?.id !== 'chatbot-screen' && netController) {
        netController.abort();
        netController = null;
        netGeneration++;
        setStatus('');
      }
    });
  } catch (e) {
    console.error('chatbot setup failed:', e);
  }
}
