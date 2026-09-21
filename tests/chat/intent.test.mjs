import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractExclusion,
  extractComparisonParts,
  classifySmallTalk,
  detectPain,
  detectPersonal,
} from '../../src/chat/intent.js';

test('extractExclusion: 제외 대상을 뽑고 문장에서 지운다', () => {
  const r = extractExclusion('스쿼트 빼고 하체 운동 알려줘');
  assert.deepEqual(r.excluded, ['스쿼트']);
  assert.equal(r.text, '하체 운동 알려줘');
});

test('extractExclusion: 제외 표현이 없으면 원문 그대로', () => {
  const r = extractExclusion('스쿼트 어떻게 해');
  assert.deepEqual(r.excluded, []);
  assert.equal(r.text, '스쿼트 어떻게 해');
});

test('extractComparisonParts: "A랑 B 차이" 를 둘로 쪼갠다', () => {
  assert.deepEqual(extractComparisonParts('Cindy랑 QCE 차이가 뭐야'), ['Cindy', 'QCE']);
  assert.deepEqual(extractComparisonParts('턱걸이 와 팔굽혀펴기 비교'), ['턱걸이', '팔굽혀펴기']);
});

test('extractComparisonParts: "A vs B"', () => {
  assert.deepEqual(extractComparisonParts('플란체 vs 물구나무'), ['플란체', '물구나무']);
});

test('extractComparisonParts: 비교 표현이 없으면 null(나열 질문 오인 방지)', () => {
  assert.equal(extractComparisonParts('스쿼트와 런지 자세를 알려줘'), null);
});

test('classifySmallTalk', () => {
  assert.equal(classifySmallTalk('안녕'), 'greeting');
  assert.equal(classifySmallTalk('hello'), 'greeting');
  assert.equal(classifySmallTalk('고마워요'), 'thanks');
  assert.equal(classifySmallTalk('운동하기 싫어'), 'motivation');
  assert.equal(classifySmallTalk('스쿼트 어떻게 해'), null);
});

test('detectPain', () => {
  assert.equal(detectPain('운동하다 무릎이 아파'), true);
  assert.equal(detectPain('허리 통증이 있어요'), true);
  assert.equal(detectPain('스쿼트 어떻게 해'), false);
});

test('detectPersonal: 본인·타인 기록 요청 둘 다 걸린다', () => {
  assert.equal(detectPersonal('내 운동 기록 보여줘'), true);
  assert.equal(detectPersonal('다른 사람 기록 보여줘'), true);
  assert.equal(detectPersonal('스쿼트 어떻게 해'), false);
});
