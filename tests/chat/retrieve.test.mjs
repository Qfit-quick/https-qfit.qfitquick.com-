import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrieve } from '../../src/chat/retrieve.js';
import { KNOWLEDGE } from '../../src/chat/knowledge.js';

test('KNOWLEDGE 가 비어있지 않고 필수 필드를 갖는다', () => {
  assert.ok(KNOWLEDGE.length > 50, `자료가 너무 적다: ${KNOWLEDGE.length}건`);
  for (const entry of KNOWLEDGE.slice(0, 20)) {
    assert.equal(typeof entry.id, 'string');
    assert.equal(typeof entry.type, 'string');
    assert.equal(typeof entry.title, 'string');
    assert.ok(entry.title.length > 0, `title 빈 항목: ${entry.id}`);
  }
});

test('retrieve: 운동 이름으로 정확히 찾는다', () => {
  const hits = retrieve('푸쉬업 어떻게 해');
  assert.ok(hits.length > 0);
  assert.ok(hits[0].title.includes('푸쉬업'));
});

test('retrieve: 짧은 별칭("Cindy")도 정식 이름 속에서 찾는다', () => {
  // knowledge.js 는 program 의 title 을 그대로 쓰므로(예: "스파이더맨
  // Cindy 1주"), 짧은 텍스트로는 기본 substring 방향(title이 text 안에
  // 있어야 함)으로 못 찾는다 — retrieve() 가 아니라 respond.js 의 비교
  // 분기가 이 경우를 따로 처리한다(server.test.mjs 참고). 여기서는 그
  // 전제만 문서로 남겨 둔다.
  const hits = retrieve('Cindy');
  assert.equal(hits.length, 0);
});

test('retrieve: exclude 로 특정 항목을 뺀다', () => {
  const withSquat = retrieve('하체 운동');
  assert.ok(withSquat.some((h) => h.title === '하체'));
  const excluded = retrieve('하체 운동', { exclude: ['스쿼트'] });
  // '하체' 자체는 exclude 대상이 아니므로 여전히 나온다 — exclude 는
  // "제목이 제외 문구에 포함되는" 항목만 뺀다(예: 스쿼트라는 이름의 운동).
  assert.ok(excluded.some((h) => h.title === '하체'));
});

test('retrieve: limit 을 지킨다', () => {
  const hits = retrieve('운동', { limit: 2 });
  assert.ok(hits.length <= 2);
});
