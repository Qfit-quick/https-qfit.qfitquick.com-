// 실제 네트워크 호출은 안 한다(키가 없다 — README 참고). createLLM() 이
// 환경변수를 보고 켜고/끄는 판단만 검증한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLLM } from '../../server/llm.mjs';

test('CHAT_LLM_ENABLED 가 아니면 null(규칙 기반으로만 동작)', () => {
  assert.equal(createLLM({ CHAT_LLM_ENABLED: 'false', OPENAI_API_KEY: 'x', OPENAI_MODEL: 'gpt-x' }), null);
  assert.equal(createLLM({}), null);
});

test('켜져 있어도 키·모델이 없으면 null', () => {
  assert.equal(createLLM({ CHAT_LLM_ENABLED: 'true' }), null);
  assert.equal(createLLM({ CHAT_LLM_ENABLED: 'true', OPENAI_API_KEY: 'x' }), null);
});

test('켜져 있고 키·모델이 다 있으면 함수를 돌려준다', () => {
  const fn = createLLM({ CHAT_LLM_ENABLED: 'true', OPENAI_API_KEY: 'x', OPENAI_MODEL: 'gpt-x' });
  assert.equal(typeof fn, 'function');
});
