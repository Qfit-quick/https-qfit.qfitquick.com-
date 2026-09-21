// 순수 텍스트 분석 — DOM 이 없다. src/ui/chatbot.js(규칙 기반 화면)와
// server/chat.mjs(LLM 서버) 양쪽이 같은 규칙을 쓰도록 여기 하나로 모았다.
// chatbot.js 는 이미 화면에 배포돼 검증된 자기 버전을 그대로 쓴다 — 여기
// 것과 로직은 같지만 별도 파일이다(화면 쪽을 건드려 회귀를 만들지 않으려고
// 일부러 안 합쳤다). 새로 만드는 서버 쪽만 이 모듈을 쓴다.

export const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

// "스쿼트 빼고 하체 운동 알려줘" → 제외 대상을 뽑고 검색 문장에서 지운다.
export function extractExclusion(text) {
  const m = /(.+?)\s*(?:빼고|빼줘|말고|제외하고|제외해서|제외)/.exec(text || '');
  if (!m) return { text: text || '', excluded: [] };
  const excluded = m[1].trim();
  if (!excluded) return { text: text || '', excluded: [] };
  const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim();
  return { text: rest || text, excluded: [excluded] };
}

// "A랑 B 차이" / "A vs B" 에서 비교 대상 둘을 뽑는다.
export function extractComparisonParts(text) {
  let m = /^(.+?)\s*(?:이랑|랑|와|과|하고)\s*(.+?)\s*(?:의\s*)?(?:차이|비교|다른\s*점)/.exec(text || '');
  if (!m) m = /^(.+?)\s+vs\.?\s+(.+)$/i.exec(text || '');
  if (!m) return null;
  const a = m[1].trim(), b = m[2].trim();
  return a && b ? [a, b] : null;
}

export function classifySmallTalk(text) {
  const n = norm(text);
  if (!n) return null;
  if (/^(안녕|하이|hello|hi|헬로)/.test(n)) return 'greeting';
  if (/(고마워|고맙|감사|thank)/.test(n)) return 'thanks';
  if (/(하기싫|귀찮|의욕없|하기힘들|운동싫|운동하기싫)/.test(n)) return 'motivation';
  return null;
}

// 통증 질문 — 개선안 15번. 진단을 단정하지 않고, 정보가 부족하면 운동을
// 바로 추천하지 않는 흐름으로 보낸다(respond.js 참고). 전문 검수 전이라
// 문구 자체는 respond.js 의 PAIN_DRAFT 에 "초안" 이라고 표시해 둔다.
export function detectPain(text) {
  return /(아파|아프|통증|다쳤|삐었|결림|저림|욱신)/.test(String(text || ''));
}

// 개인 기록 요청 — "내 운동 기록 보여줘", "다른 사람 기록 보여줘" 둘 다
// 지금은 연결이 안 돼 있다는 같은 안내로 받는다(누구 기록인지는 안 갈라도
// 된다 — 어차피 아무 기록도 안 준다).
export function detectPersonal(text) {
  return /(내|나의|제|다른\s*사람|남의|타인).{0,6}(운동\s*)?(기록|정보|프로필|데이터)/.test(String(text || ''));
}
