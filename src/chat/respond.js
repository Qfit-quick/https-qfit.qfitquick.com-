// 답 만들기 — 네트워크·DOM 없는 순수 함수(테스트가 키 없이 다 돌아야
// 하므로, PDF 12쪽 "모델 없이도 확인 가능하게"). LLM 호출은 callLLM 을
// 주입받아서 쓴다 — 실제 호출부(server/llm.mjs)를 몰라도 되고, 테스트에서
// 성공·실패·시간초과를 흉내낸 함수로 갈아끼울 수 있다.

import { extractExclusion, extractComparisonParts, classifySmallTalk, norm, detectPain, detectPersonal } from './intent.js';
import { retrieve } from './retrieve.js';
import { KNOWLEDGE, LOCALES, pick, getById } from './knowledge.js';

// "더 쉽게는?" 같은 대명사형 후속 질문 — 그 자체로는 검색에 아무 것도
// 안 걸린다. src/ui/chatbot.js 의 화면판과 같은 패턴이지만, 여기는
// 서버(요청마다 상태가 없다)라 "방금 그거"를 기억해 둘 수 없다 — 대신
// 화면이 conversationContext 로 방금 답에 쓴 출처 ID 를 다시 보내 주면
// 그걸로 이어 간다(10쪽 "conversationContext: 이전에 선택한 source ID").
const FOLLOWUP_RE = /^(그거|그것|그\s*운동|더\s*쉽게|더\s*쉬운|더\s*어렵게|다른\s*건|다른\s*거|그럼|그건)/;

const COPY = {
  greeting: { ko: '안녕하세요! 운동·회복·프로그램·식단 중 궁금한 걸 물어보세요.', en: 'Hi! Ask me about exercises, recovery, programs, or food.', zh: '你好！可以问我运动、恢复、训练计划或饮食方面的问题。' },
  thanks: { ko: '천만에요! 더 궁금한 게 있으면 말씀해 주세요.', en: "You're welcome! Let me know if you have more questions.", zh: '不客气！还有问题的话请随时问我。' },
  motivation: { ko: '그런 날도 있죠. 부담 없는 걸로 골라볼까요?', en: 'That happens sometimes. Want to try something easier?', zh: '这很正常。要不要试试轻松一点的？' },
  fallback: { ko: '무슨 말인지 잘 모르겠어요. 앱 안의 운동·회복·프로그램·식단에 대해 물어봐 주세요.', en: "I'm not sure I understood. Try asking about exercises, recovery, programs, or food in the app.", zh: '我不太明白，请试着问一下关于运动、恢复、训练计划或饮食的问题。' },
  // 개인 기록 — 연결 전이라는 안내로만 처리한다(PDF: "개인 기록 요청은
  // 연결 전이라는 안내로 처리해 줘"). 누구 기록인지는 안 갈라도 된다 —
  // 본인이든 타인이든 지금은 아무 기록도 못 준다.
  personal: { ko: '아직 개인 기록(신체 정보·운동 기록)과는 연결돼 있지 않아요. 연결되면 로그인한 본인 기록만, 권한을 확인하고 보여드릴게요.', en: "I'm not connected to personal records (body info, workout history) yet. Once that's wired up, I'll only show the logged-in user's own data after checking permission.", zh: '目前还没有连接个人记录（身体信息、运动记录）。连接后，会在确认权限的前提下，只显示登录用户本人的数据。' },
  // 통증 — PDF 15번은 이 문구를 의료 전문가 검수 전에는 "검수 전 초안"
  // 표시로 감춰 두라고 했다. 저장소 소유자가 2026-09-21 직접 검토하고
  // 공개를 승인했다(전문 의료 검수는 아니다 — 그 차이를 감추지 않으려고
  // 여기 적어 둔다). 문구 자체는 원래도 진단·치료를 단정하지 않고 운동을
  // 강행 추천하지 않는 안전한 방향으로 썼다.
  painDraft: { ko: '어디가, 언제부터, 어떤 동작에서 아프신지 조금 더 알려주시겠어요? 정확한 진단은 어렵고, 통증이 심하거나 며칠 넘게 이어지면 운동을 쉬고 병원 진료를 받으시는 게 안전해요.', en: "Could you tell me a bit more — where it hurts, since when, and during which movement? I can't give a precise diagnosis; if the pain is severe or lasts more than a few days, it's safer to rest and see a doctor.", zh: '能再告诉我一些吗——哪里疼、从什么时候开始、做什么动作时会疼？我没法给出准确的诊断；如果疼痛严重或持续好几天，最好先休息并就医。' },
};

function toSource(entry, locale = 'ko') {
  return { id: entry.id, title: pick(entry.title, locale), screenId: entry.screenId, entityKey: entry.entityKey };
}

function suggestionsFrom(entries, locale) {
  return entries.slice(0, 3).map((e) => pick(e.title, locale));
}

// retrieve() 는 "문장이 자료 제목을 담고 있어야" 걸리는 방향이다. 그런데
// "Cindy"·"QCE" 처럼 비교 질문에서 짧게 뽑아낸 이름은 반대로 자료 제목
// (프로그램 정식 이름, 예: "스파이더맨 Cindy 1주") 쪽이 더 길다. 비교
// 모드에서만 양방향으로 한 번 더 본다 — src/ui/chatbot.js 의
// findByShortName() 과 같은 이유, 같은 해법(중복이지만 서버·화면 쪽이
// 서로 다른 모듈이라 각자 둔다).
function findByShortName(phrase) {
  const direct = retrieve(phrase, { limit: 1 });
  if (direct.length) return direct[0];
  const p = norm(phrase);
  if (p.length < 2) return null;
  return KNOWLEDGE.find((entry) => LOCALES.some((l) => {
    const name = norm(entry.title[l]);
    return name && (name.includes(p) || p.includes(name));
  })) || null;
}

// conversationContext[0] 을 "방금 그 자료"로 본다 — 화면이 매 응답의
// sources[0].id 를 다음 요청의 conversationContext 맨 앞에 넣어 주는
// 것을 약속으로 둔다(README 에 적음). 여러 개를 보내도 되지만(최대
// 5개, 서버가 자름) 여기서는 맨 앞 것만 "직전 대상"으로 쓴다.
function contextReply(conversationContext, locale) {
  const id = Array.isArray(conversationContext) ? conversationContext[0] : null;
  if (!id) return null;
  const entry = getById(id);
  if (!entry) return null;
  return { answer: `${pick(entry.title, locale)} — ${pick(entry.body, locale)}`, intent: 'knowledge', mode: 'rule', sources: [toSource(entry, locale)], suggestions: [] };
}

// 규칙 기반 답 — LLM 이 꺼져 있거나(mode: rule) 실패했을 때(mode: fallback)
// 둘 다 이 함수로 만든다. 성공한 규칙 매칭은 rule, 아무 것도 못 찾은 채
// 일반 안내로 빠지면 fallback 으로 부른다(호출부에서 구분해서 표시한다).
function ruleBasedReply(rawText, conversationContext, locale) {
  const { text: stripped, excluded } = extractExclusion(rawText);

  const compareParts = extractComparisonParts(stripped);
  if (compareParts) {
    const a = findByShortName(compareParts[0]);
    const b = findByShortName(compareParts[1]);
    if (a && b && a.id !== b.id) {
      return {
        answer: `${pick(a.title, locale)} — ${pick(a.body, locale)}\n\n${pick(b.title, locale)} — ${pick(b.body, locale)}`,
        intent: 'compare',
        mode: 'rule',
        sources: [toSource(a, locale), toSource(b, locale)],
        suggestions: [],
      };
    }
    if (a || b) {
      const found = a || b;
      return { answer: `${pick(found.title, locale)} — ${pick(found.body, locale)}`, intent: 'compare', mode: 'rule', sources: [toSource(found, locale)], suggestions: [] };
    }
    // 둘 다 못 찾았으면 비교로 안 보고 아래 일반 검색으로 넘어간다.
  }

  const hits = retrieve(stripped, { exclude: excluded });
  if (!hits.length) {
    if (FOLLOWUP_RE.test(rawText.trim())) {
      const fromContext = contextReply(conversationContext, locale);
      if (fromContext) return fromContext;
    }
    const smallTalk = classifySmallTalk(rawText);
    if (smallTalk === 'greeting') return { answer: pick(COPY.greeting, locale), intent: 'greeting', mode: 'rule', sources: [], suggestions: [] };
    if (smallTalk === 'thanks') return { answer: pick(COPY.thanks, locale), intent: 'greeting', mode: 'rule', sources: [], suggestions: [] };
    if (smallTalk === 'motivation') return { answer: pick(COPY.motivation, locale), intent: 'motivation', mode: 'rule', sources: [], suggestions: [] };
    return { answer: pick(COPY.fallback, locale), intent: 'out_of_scope', mode: 'fallback', sources: [], suggestions: [] };
  }

  const top = hits[0];
  const topBody = pick(top.body, locale);
  // exclude 는 retrieve() 에서 "제목이 제외 문구에 포함되는 자료"만 뺀다
  // (예: 스쿼트라는 이름의 운동 자료 자체). 그런데 muscle 타입은 여러
  // 운동을 쉼표로 이어 붙인 문자열 하나가 body 라("스쿼트, 런지, ...") —
  // 그 본문 *안의* 항목까지는 retrieve() 가 못 거른다. 여기서 한 번 더
  // 쪼개서 뺀다. 실제로 "스쿼트 빼고 하체 운동 알려줘"를 넣어보고서야
  // 이 자리가 빠진 걸 발견했다.
  const body = excluded.length ? stripExcludedFromBody(topBody, excluded) : topBody;
  const title = pick(top.title, locale);
  const answer = excluded.length && body !== topBody
    ? `${title}(${excluded.join(', ')} 제외) — ${body}`
    : `${title} — ${topBody}`;
  return { answer, intent: 'knowledge', mode: 'rule', sources: [toSource(top, locale)], suggestions: suggestionsFrom(hits.slice(1), locale) };
}

function stripExcludedFromBody(body, excluded) {
  if (!body || !body.includes(',')) return body;
  const parts = body.split(',').map((s) => s.trim()).filter(Boolean);
  const kept = parts.filter((part) => !excluded.some((ex) => part.length >= 2 && norm(ex).includes(norm(part))));
  return kept.length && kept.length < parts.length ? kept.join(', ') : body;
}

/**
 * @param {{message: string, history?: Array, conversationContext?: string[], locale?: 'ko'|'en'|'zh'}} input
 * @param {{callLLM?: Function, llmEnabled?: boolean}} deps
 */
export async function respond(input, deps = {}) {
  const message = String(input.message || '').trim();
  const conversationContext = Array.isArray(input.conversationContext) ? input.conversationContext.slice(0, 5) : [];
  const locale = LOCALES.includes(input.locale) ? input.locale : 'ko';
  const { callLLM, llmEnabled = false } = deps;

  // 개인 기록·통증은 LLM 을 켰어도 항상 규칙으로 먼저 받는다 — 검수 안 된
  // 문구를 모델이 즉흥으로 지어내게 두지 않는다(13쪽 "통증과 개인화의
  // 출시 조건").
  if (detectPersonal(message)) return { answer: pick(COPY.personal, locale), intent: 'personal', mode: 'rule', sources: [], suggestions: [] };
  if (detectPain(message)) return { answer: pick(COPY.painDraft, locale), intent: 'pain', mode: 'rule', sources: [], suggestions: [] };

  if (!llmEnabled || typeof callLLM !== 'function') {
    return ruleBasedReply(message, conversationContext, locale);
  }

  // conversationContext 로 가리킨 자료가 있으면 검색 결과 맨 앞에 끼워
  // 모델에게도 "방금 그거"가 뭔지 보여준다 — 없으면(id 가 이미 지워졌거나
  // 잘못됐으면) 조용히 무시한다.
  const contextEntries = conversationContext.map(getById).filter(Boolean);
  const hits = [...contextEntries, ...retrieve(message, { limit: 5 })]
    .filter((entry, i, arr) => arr.findIndex((e) => e.id === entry.id) === i)
    .slice(0, 5);
  try {
    const llmResult = await callLLM({ message, history: input.history || [], hits, locale });
    if (!llmResult || typeof llmResult.answer !== 'string' || !llmResult.answer.trim()) {
      throw new Error('empty LLM answer');
    }
    // 모델이 댄 출처는 실제로 검색된 것만 인정한다 — 모델이 지어낸 ID 로
    // 화면 이동 버튼을 만들면 안 되므로(11쪽 "모델이 만든 URL·화면 ID를
    // 그대로 실행하지 않는다").
    const allowed = new Map(hits.map((h) => [h.id, h]));
    const sources = (Array.isArray(llmResult.sourceIds) ? llmResult.sourceIds : [])
      .filter((id) => allowed.has(id))
      .slice(0, 5)
      .map((id) => toSource(allowed.get(id), locale));
    return { answer: llmResult.answer.trim(), intent: 'knowledge', mode: 'rag', sources, suggestions: suggestionsFrom(hits, locale) };
  } catch {
    // 연결 실패·시간초과·잘못된 응답 — 전부 폴백으로 조용히 떨어진다.
    // 사용자에게는 여전히 200 + 답이 나간다(11쪽 "가능한 경우 HTTP 200,
    // mode=fallback").
    return ruleBasedReply(message, conversationContext, locale);
  }
}
