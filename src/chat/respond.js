// 답 만들기 — 네트워크·DOM 없는 순수 함수(테스트가 키 없이 다 돌아야
// 하므로, PDF 12쪽 "모델 없이도 확인 가능하게"). LLM 호출은 callLLM 을
// 주입받아서 쓴다 — 실제 호출부(server/llm.mjs)를 몰라도 되고, 테스트에서
// 성공·실패·시간초과를 흉내낸 함수로 갈아끼울 수 있다.

import { extractExclusion, extractComparisonParts, classifySmallTalk, norm, detectPain, detectPersonal } from './intent.js';
import { retrieve } from './retrieve.js';
import { KNOWLEDGE } from './knowledge.js';

const COPY = {
  greeting: '안녕하세요! 운동·회복·프로그램·식단 중 궁금한 걸 물어보세요.',
  thanks: '천만에요! 더 궁금한 게 있으면 말씀해 주세요.',
  motivation: '그런 날도 있죠. 부담 없는 걸로 골라볼까요?',
  fallback: '무슨 말인지 잘 모르겠어요. 앱 안의 운동·회복·프로그램·식단에 대해 물어봐 주세요.',
  // 개인 기록 — 연결 전이라는 안내로만 처리한다(PDF: "개인 기록 요청은
  // 연결 전이라는 안내로 처리해 줘"). 누구 기록인지는 안 갈라도 된다 —
  // 본인이든 타인이든 지금은 아무 기록도 못 준다.
  personal: '아직 개인 기록(신체 정보·운동 기록)과는 연결돼 있지 않아요. 연결되면 로그인한 본인 기록만, 권한을 확인하고 보여드릴게요.',
  // 통증 — 전문 검수 전 초안. 진단·치료를 단정하지 않고, 운동을 강행
  // 추천하지 않는다(PDF 15번, 13쪽 "검수용 초안으로 분리").
  painDraft: '[검수 전 초안] 어디가, 언제부터, 어떤 동작에서 아프신지 조금 더 알려주시겠어요? 정확한 진단은 어렵고, 통증이 심하거나 며칠 넘게 이어지면 운동을 쉬고 병원 진료를 받으시는 게 안전해요.',
};

function toSource(entry) {
  return { id: entry.id, title: entry.title, screenId: entry.screenId, entityKey: entry.entityKey };
}

function suggestionsFrom(entries) {
  return entries.slice(0, 3).map((e) => e.title);
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
  return KNOWLEDGE.find((entry) => {
    const name = norm(entry.title);
    return name && (name.includes(p) || p.includes(name));
  }) || null;
}

// 규칙 기반 답 — LLM 이 꺼져 있거나(mode: rule) 실패했을 때(mode: fallback)
// 둘 다 이 함수로 만든다. 성공한 규칙 매칭은 rule, 아무 것도 못 찾은 채
// 일반 안내로 빠지면 fallback 으로 부른다(호출부에서 구분해서 표시한다).
function ruleBasedReply(rawText) {
  const { text: stripped, excluded } = extractExclusion(rawText);

  const compareParts = extractComparisonParts(stripped);
  if (compareParts) {
    const a = findByShortName(compareParts[0]);
    const b = findByShortName(compareParts[1]);
    if (a && b && a.id !== b.id) {
      return {
        answer: `${a.title} — ${a.body}\n\n${b.title} — ${b.body}`,
        intent: 'compare',
        mode: 'rule',
        sources: [toSource(a), toSource(b)],
        suggestions: [],
      };
    }
    if (a || b) {
      const found = a || b;
      return { answer: `${found.title} — ${found.body}`, intent: 'compare', mode: 'rule', sources: [toSource(found)], suggestions: [] };
    }
    // 둘 다 못 찾았으면 비교로 안 보고 아래 일반 검색으로 넘어간다.
  }

  const hits = retrieve(stripped, { exclude: excluded });
  if (!hits.length) {
    const smallTalk = classifySmallTalk(rawText);
    if (smallTalk === 'greeting') return { answer: COPY.greeting, intent: 'greeting', mode: 'rule', sources: [], suggestions: [] };
    if (smallTalk === 'thanks') return { answer: COPY.thanks, intent: 'greeting', mode: 'rule', sources: [], suggestions: [] };
    if (smallTalk === 'motivation') return { answer: COPY.motivation, intent: 'motivation', mode: 'rule', sources: [], suggestions: [] };
    return { answer: COPY.fallback, intent: 'out_of_scope', mode: 'fallback', sources: [], suggestions: [] };
  }

  const top = hits[0];
  // exclude 는 retrieve() 에서 "제목이 제외 문구에 포함되는 자료"만 뺀다
  // (예: 스쿼트라는 이름의 운동 자료 자체). 그런데 muscle 타입은 여러
  // 운동을 쉼표로 이어 붙인 문자열 하나가 body 라("스쿼트, 런지, ...") —
  // 그 본문 *안의* 항목까지는 retrieve() 가 못 거른다. 여기서 한 번 더
  // 쪼개서 뺀다. 실제로 "스쿼트 빼고 하체 운동 알려줘"를 넣어보고서야
  // 이 자리가 빠진 걸 발견했다.
  const body = excluded.length ? stripExcludedFromBody(top.body, excluded) : top.body;
  const answer = excluded.length && body !== top.body
    ? `${top.title}(${excluded.join(', ')} 제외) — ${body}`
    : `${top.title} — ${top.body}`;
  return { answer, intent: 'knowledge', mode: 'rule', sources: [toSource(top)], suggestions: suggestionsFrom(hits.slice(1)) };
}

function stripExcludedFromBody(body, excluded) {
  if (!body || !body.includes(',')) return body;
  const parts = body.split(',').map((s) => s.trim()).filter(Boolean);
  const kept = parts.filter((part) => !excluded.some((ex) => part.length >= 2 && norm(ex).includes(norm(part))));
  return kept.length && kept.length < parts.length ? kept.join(', ') : body;
}

/**
 * @param {{message: string, history?: Array, conversationContext?: string[]}} input
 * @param {{callLLM?: Function, llmEnabled?: boolean}} deps
 */
export async function respond(input, deps = {}) {
  const message = String(input.message || '').trim();
  const { callLLM, llmEnabled = false } = deps;

  // 개인 기록·통증은 LLM 을 켰어도 항상 규칙으로 먼저 받는다 — 검수 안 된
  // 문구를 모델이 즉흥으로 지어내게 두지 않는다(13쪽 "통증과 개인화의
  // 출시 조건").
  if (detectPersonal(message)) return { answer: COPY.personal, intent: 'personal', mode: 'rule', sources: [], suggestions: [] };
  if (detectPain(message)) return { answer: COPY.painDraft, intent: 'pain', mode: 'rule', sources: [], suggestions: [] };

  if (!llmEnabled || typeof callLLM !== 'function') {
    return ruleBasedReply(message);
  }

  const hits = retrieve(message, { limit: 5 });
  try {
    const llmResult = await callLLM({ message, history: input.history || [], hits });
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
      .map((id) => toSource(allowed.get(id)));
    return { answer: llmResult.answer.trim(), intent: 'knowledge', mode: 'rag', sources, suggestions: suggestionsFrom(hits) };
  } catch {
    // 연결 실패·시간초과·잘못된 응답 — 전부 폴백으로 조용히 떨어진다.
    // 사용자에게는 여전히 200 + 답이 나간다(11쪽 "가능한 경우 HTTP 200,
    // mode=fallback").
    return ruleBasedReply(message);
  }
}
