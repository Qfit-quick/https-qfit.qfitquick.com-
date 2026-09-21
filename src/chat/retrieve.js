// 검색 — title/aliases 가 문장 안에 들어있는지만 본다(11쪽 "검색 우선순위":
// 정확한 이름·별칭 우선, 오타는 보조). 서버가 LLM 에게 넘길 자료를 고르는
// 용도라 chatbot.js 의 scoreMatch 처럼 화면에 바로 보여줄 세밀한 오타
// 허용까지는 옮기지 않았다 — 여기서 고른 자료는 LLM 이 다시 한번 다듬어
// 답을 만드므로, 후보를 몇 개 더 챙기는 정도면 충분하다.

import { KNOWLEDGE } from './knowledge.js';
import { norm } from './intent.js';

function scoreEntry(text, entry) {
  const t = norm(text);
  if (!t) return 0;
  const names = [entry.title, ...(entry.aliases || [])].map(norm).filter(Boolean);
  let best = 0;
  for (const name of names) {
    if (name.length >= 2 && t.includes(name)) best = Math.max(best, name.length);
  }
  return best;
}

/**
 * @param {string} text 검색 문장
 * @param {{limit?: number, exclude?: string[]}} opts exclude 는 "빼고" 로
 *   뽑아낸 제외 문구 원문(정규화 전) 목록 — 그 문구가 자료 제목을 담고
 *   있으면 후보에서 뺀다.
 */
export function retrieve(text, opts = {}) {
  const limit = opts.limit ?? 5;
  const excludedNorm = (opts.exclude || []).map(norm);
  return KNOWLEDGE
    .map((entry) => ({ entry, score: scoreEntry(text, entry) }))
    .filter((r) => r.score > 0)
    .filter((r) => !excludedNorm.some((ex) => ex.includes(norm(r.entry.title))))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}
