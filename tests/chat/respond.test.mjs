import { test } from 'node:test';
import assert from 'node:assert/strict';
import { respond } from '../../src/chat/respond.js';

test('인사 → greeting, 규칙 기반', async () => {
  const r = await respond({ message: '안녕' });
  assert.equal(r.intent, 'greeting');
  assert.equal(r.mode, 'rule');
  assert.ok(r.answer.length > 0);
});

test('감사 → greeting(내부적으로 thanks 지만 규약의 enum 에 맞춘다)', async () => {
  const r = await respond({ message: '고마워' });
  assert.equal(r.intent, 'greeting');
  assert.match(r.answer, /천만/);
});

test('의욕 저하 → motivation', async () => {
  const r = await respond({ message: '운동하기 싫어' });
  assert.equal(r.intent, 'motivation');
});

test('개인 기록 요청 → personal, 항상 미연결 안내(LLM 꺼짐 기준)', async () => {
  const r = await respond({ message: '내 운동 기록 보여줘' });
  assert.equal(r.intent, 'personal');
  assert.equal(r.mode, 'rule');
  assert.equal(r.sources.length, 0);
});

test('타인 기록 요청도 같은 미연결 안내(개인 기록이 실제로 안 새어나감)', async () => {
  const r = await respond({ message: '다른 사람 기록 보여줘' });
  assert.equal(r.intent, 'personal');
});

// 2026-09-21: 저장소 소유자가 이 문구를 직접 검토·승인해서 "[검수 전
// 초안]" 표시를 뗐다(respond.js COPY.painDraft 주석 참고 — 전문 의료
// 검수는 아니라는 점은 코드에 남겨 뒀다). 진단하지 않고 운동을 강행
// 추천하지 않는다는 내용 기준은 그대로라 그 부분만 확인한다.
test('통증 질문 → pain, 진단하지 않고 병원 안내로 이어진다', async () => {
  const r = await respond({ message: '운동하다 무릎이 아파' });
  assert.equal(r.intent, 'pain');
  assert.doesNotMatch(r.answer, /확실히|틀림없이|이라는 병입니다/);
  assert.match(r.answer, /병원/);
});

test('제외 조건이 있는 검색 — 목록 안에서도 실제로 빠진다', async () => {
  const r = await respond({ message: '스쿼트 빼고 하체 운동 알려줘' });
  assert.equal(r.intent, 'knowledge');
  assert.match(r.answer, /제외/);
  // "(스쿼트 제외)" 라고 말만 하고 목록엔 그대로 있으면 안 된다 — 실제로
  // 한 번 이렇게 새서(콤마로 이어붙인 muscle body 안까지는 retrieve() 의
  // exclude 가 못 미쳤다) 발견하고 고쳤다. 정확히 일치하는 항목만 본다 —
  // "코사크스쿼트"처럼 이름에 "스쿼트"가 들어간 *다른* 운동까지 지워지면
  // 그건 그것대로 또 다른 버그다.
  const afterDash = (r.answer.split('—')[1] || '').trim();
  const items = afterDash.split(',').map((s) => s.trim());
  assert.ok(!items.includes('스쿼트'), `제외 실패, 실제 답: ${r.answer}`);
  assert.ok(items.includes('코사크스쿼트'), `무관한 운동까지 같이 빠짐: ${r.answer}`);
});

test('비교 질문 — 둘 다 찾으면 sources 가 2개', async () => {
  const r = await respond({ message: 'Cindy랑 QCE 차이가 뭐야' });
  assert.equal(r.intent, 'compare');
  assert.equal(r.sources.length, 2);
});

test('근거 없는 질문 → out_of_scope, fallback', async () => {
  const r = await respond({ message: '오늘 날씨 어때' });
  assert.equal(r.intent, 'out_of_scope');
  assert.equal(r.mode, 'fallback');
});

test('LLM 꺼짐이면 callLLM 을 줘도 규칙 기반으로만 답한다', async () => {
  let called = false;
  const r = await respond(
    { message: '푸쉬업 어떻게 해' },
    { llmEnabled: false, callLLM: async () => { called = true; return { answer: 'x', sourceIds: [] }; } },
  );
  assert.equal(called, false);
  assert.equal(r.mode, 'rule');
});

test('LLM 성공 — mode: rag, 모델이 실제로 찾은 출처만 허용', async () => {
  const r = await respond(
    { message: '푸쉬업 어떻게 해' },
    {
      llmEnabled: true,
      callLLM: async ({ hits }) => ({
        answer: '푸쉬업은 이렇게 합니다.',
        sourceIds: [hits[0]?.id, 'made-up-id-that-does-not-exist'],
      }),
    },
  );
  assert.equal(r.mode, 'rag');
  assert.equal(r.answer, '푸쉬업은 이렇게 합니다.');
  // 지어낸 ID 는 걸러지고 실제 검색된 것만 남는다
  assert.ok(r.sources.every((s) => s.id !== 'made-up-id-that-does-not-exist'));
});

test('LLM 실패(예외) → fallback 규칙 기반으로 조용히 떨어진다', async () => {
  const r = await respond(
    { message: '푸쉬업 어떻게 해' },
    { llmEnabled: true, callLLM: async () => { throw new Error('network down'); } },
  );
  assert.equal(r.mode, 'rule'); // ruleBasedReply 가 정상 매칭되면 rule
  assert.equal(r.intent, 'knowledge');
  assert.ok(r.answer.length > 0);
});

test('LLM 시간초과(타임아웃 흉내) → fallback', async () => {
  const r = await respond(
    { message: '푸쉬업 어떻게 해' },
    {
      llmEnabled: true,
      callLLM: () => new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10);
      }),
    },
  );
  assert.ok(r.answer.length > 0);
  assert.equal(r.mode, 'rule');
});

test('다중 턴 — conversationContext 로 "더 쉽게는?" 이 직전 대상을 이어받는다', async () => {
  const first = await respond({ message: '푸쉬업 어떻게 해' });
  const contextId = first.sources[0].id;
  const followUp = await respond({ message: '더 쉽게는?', conversationContext: [contextId] });
  assert.match(followUp.answer, /푸쉬업/);
  assert.equal(followUp.sources[0].id, contextId);
});

test('다중 턴 — conversationContext 가 없으면 후속 질문도 그냥 모르는 질문으로 빠진다', async () => {
  const r = await respond({ message: '더 쉽게는?' });
  assert.equal(r.intent, 'out_of_scope');
});

test('다중 턴 — 잘못된/지워진 source ID 는 조용히 무시된다', async () => {
  const r = await respond({ message: '더 쉽게는?', conversationContext: ['exercise:존재안함'] });
  assert.equal(r.intent, 'out_of_scope');
});

test('LLM 이 깨진 JSON/빈 답을 주면 → fallback', async () => {
  const r = await respond(
    { message: '푸쉬업 어떻게 해' },
    { llmEnabled: true, callLLM: async () => ({ answer: '', sourceIds: [] }) },
  );
  assert.equal(r.mode, 'rule');
});
