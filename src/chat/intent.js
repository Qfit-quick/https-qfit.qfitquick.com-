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
// 바로 추천하지 않는 흐름으로 보낸다(respond.js 참고).
//
// 활용형을 웬만큼 채워 넣었다 — 실제 키로 처음 돌려보고서야("스쿼트할 때
// 무릎이 좀 아픈데 다른 걸로 추천해줄래?") "아픈"(어미가 -ㄴ 인 관형형)이
// 빠진 걸 발견했다. "아파"/"아프"는 "아픈"을 부분 문자열로 안 담는다 —
// 배치임이 달라서 별개의 글자다. "다친"·"삔" 도 같은 이유로 추가했다.
export function detectPain(text) {
  return /(아파|아프|아픈|아팠|통증|다쳤|다친|삐었|삔|결림|결려|저림|저려|욱신)/.test(String(text || ''));
}

// 개인 기록 요청 — "내 운동 기록 보여줘", "다른 사람 기록 보여줘" 둘 다
// 지금은 연결이 안 돼 있다는 같은 안내로 받는다(누구 기록인지는 안 갈라도
// 된다 — 어차피 아무 기록도 안 준다).
export function detectPersonal(text) {
  return /(내|나의|제|다른\s*사람|남의|타인).{0,6}(운동\s*)?(기록|정보|프로필|데이터)/.test(String(text || ''));
}
