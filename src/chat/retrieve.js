// 검색 — title/aliases 가 문장 안에 들어있는지만 본다(11쪽 "검색 우선순위":
// 정확한 이름·별칭 우선, 오타는 보조). 서버가 LLM 에게 넘길 자료를 고르는
// 용도라 chatbot.js 의 scoreMatch 처럼 화면에 바로 보여줄 세밀한 오타
// 허용까지는 옮기지 않았다 — 여기서 고른 자료는 LLM 이 다시 한번 다듬어
// 답을 만드므로, 후보를 몇 개 더 챙기는 정도면 충분하다.
//
// title 은 이제 {ko,en,zh} 사전이다(2026-09-21) — 세 언어를 다 훑는다.
// 화면 언어가 영어여도 사용자가 한국어로 치면 찾아져야 하고 그 반대도
// 마찬가지라서다(chatbot.js 의 scoreAnyLang 과 같은 생각).

import { KNOWLEDGE, LOCALES } from './knowledge.js';
import { norm } from './intent.js';

function scoreEntry(text, entry) {
  const t = norm(text);
  if (!t) return 0;
  const names = [
    ...LOCALES.map((l) => entry.title && entry.title[l]),
    ...(entry.aliases || []),
  ].map(norm).filter(Boolean);
  let best = 0;
  for (const name of names) {
    if (name.length >= 2 && t.includes(name)) best = Math.max(best, name.length);
  }
  return best;
}

/**
 * @param {string} text 검색 문장
 * @param {{limit?: number, exclude?: string[]}} opts exclude 는 "빼고" 로
 *   뽑아낸 제외 문구 원문(정규화 전) 목록 — 그 문구가 자료 제목(아무
 *   언어든)을 담고 있으면 후보에서 뺀다.
 */
export function retrieve(text, opts = {}) {
  const limit = opts.limit ?? 5;
  const excludedNorm = (opts.exclude || []).map(norm);
  return KNOWLEDGE
    .map((entry) => ({ entry, score: scoreEntry(text, entry) }))
    .filter((r) => r.score > 0)
    .filter((r) => !excludedNorm.some((ex) => LOCALES.some((l) => ex.includes(norm(r.entry.title[l])))))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}
