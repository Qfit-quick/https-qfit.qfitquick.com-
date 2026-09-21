// 검색 자료 한 건 = {id, type, title, body, aliases, screenId, entityKey}
// (PDF 12쪽 "검색 자료 한 건의 구조"). 같은 내용을 두 번 적지 않고, 이미
// 있는 src/data/* 를 그대로 읽어서 이 모양으로 다시 만든다 — 원본이 바뀌면
// 여기도 다음 요청부터 자동으로 따라간다.
//
// src/ui/chatbot.js 의 collectCandidates() 와는 목적이 다르다: 그쪽은
// 화면에 바로 붙일 풍부한 HTML(운동 사진 링크, 버튼 등)을 만들고, 여기는
// LLM 에게 넘길 짧은 사실 텍스트 + 출처 ID 만 있으면 된다. 그래서 따로
// 만든다 — 억지로 하나로 합치면 화면 쪽 렌더링 코드가 서버로 끌려온다.
//
// 먼저 한국어만 완성한다(PDF 9쪽 "먼저 한국어 흐름을 완성해 줘"). title/body
// 는 ko 필드만 쓴다 — 영·중 UI 자체는 그대로 두고(화면은 안 건드림), LLM
// 서버가 다국어 근거까지 갖추는 건 다음 범위다.

import { RECOVERY_CARDS, INJURY_GUIDES } from '../data/recovery.js';
import { CHATBOT_FAQ } from '../data/chatbot-faq.js';
import { EXERCISES } from '../data/exercises.js';
import { PROGRAMS } from '../data/programs.js';
import { FOODS, EATING_OUT } from '../data/foods.js';
import { MUSCLE_GROUPS } from '../data/muscle-groups.js';
import { CHALLENGE_TRACKS, CHALLENGE_TRACK_ORDER } from '../data/challengeTracks.js';
import { classifySmallTalk } from './intent.js';

const ko = (v) => (v && typeof v === 'object' ? v.ko || '' : String(v || ''));
const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '');

function build() {
  const list = [];

  INJURY_GUIDES.forEach((g) => {
    const immediate = g.groups && g.groups[2]; // '즉시 대처' — chatbot.js 와 같은 자리
    const body = ((immediate && immediate.items) || []).map((it) => stripHtml(ko(it))).join(' ');
    list.push({ id: `injury:${g.id}`, type: 'recovery', title: ko(g.part), body, aliases: [], screenId: 'recovery-screen', entityKey: g.id });
  });

  RECOVERY_CARDS.forEach((c, i) => {
    const body = (c.items || []).map((it) => stripHtml(ko(it))).join(' ');
    list.push({ id: `recoverycard:${i}`, type: 'recovery', title: ko(c.tag) || ko(c.title), body, aliases: [], screenId: 'recovery-screen', entityKey: String(i) });
  });

  EXERCISES.forEach((ex) => {
    const body = [ko(ex.cue), ko(ex.tip)].filter(Boolean).join(' ');
    list.push({ id: `exercise:${ex.key}`, type: 'exercise', title: ko(ex.label), body, aliases: [], screenId: 'video-gallery-screen', entityKey: ex.key });
  });

  PROGRAMS.forEach((p) => {
    list.push({ id: `program:${p.id}`, type: 'program', title: ko(p.name), body: ko(p.tagline), aliases: [], screenId: 'programs-screen', entityKey: p.id });
  });

  FOODS.forEach((f, i) => {
    const per100 = f.per100 || {};
    const body = `100g당 ${per100.kcal ?? '?'}kcal · 단백질 ${per100.p ?? '?'} · 탄수 ${per100.c ?? '?'} · 지방 ${per100.f ?? '?'}`;
    list.push({ id: `food:${i}`, type: 'food', title: ko(f.label), body, aliases: [], screenId: null, entityKey: String(i) });
  });

  EATING_OUT.forEach((f, i) => {
    const body = `${f.kcal ?? '?'}kcal${f.tip ? ' · ' + ko(f.tip) : ''}`;
    list.push({ id: `eatout:${i}`, type: 'food', title: ko(f.label), body, aliases: [], screenId: null, entityKey: String(i) });
  });

  MUSCLE_GROUPS.forEach((g, i) => {
    const names = (g.keys || [])
      .map((k) => EXERCISES.find((ex) => ex.key === k))
      .filter(Boolean)
      .map((ex) => ko(ex.label));
    list.push({ id: `muscle:${i}`, type: 'exercise', title: ko(g.label), body: names.join(', '), aliases: [], screenId: 'video-gallery-screen', entityKey: String(i) });
  });

  // 한국어 전용 데이터(challengeTracks.js 자체 방침 — chatbot.js 머리 설명 참고).
  CHALLENGE_TRACK_ORDER.forEach((key) => {
    const track = CHALLENGE_TRACKS[key];
    if (!track) return;
    const firstPhase = track.phases && track.phases[0];
    const body = firstPhase ? `${track.totalWeeks}주 · ${track.phases.length}단계. 1단계 — ${firstPhase.title}: ${firstPhase.goal}` : `${track.totalWeeks}주 · ${track.phases.length}단계`;
    list.push({ id: `challenge:${key}`, type: 'challenge', title: track.name, body, aliases: track.short ? [track.short] : [], screenId: 'challenge-screen', entityKey: key });
  });

  CHATBOT_FAQ.forEach((f, i) => {
    // "안녕"·"고마워" 같은 잡담용 FAQ 항목은 뺀다 — respond.js 가 이런
    // 질문을 classifySmallTalk 로 먼저 따로 처리하는데(intent 를 정확히
    // greeting/motivation 으로 매기려고), 여기 남겨 두면 검색이 먼저
    // 걸려서 intent 가 엉뚱하게 'knowledge' 로 나간다.
    if (classifySmallTalk(f.keywords[0])) return;
    list.push({ id: `faq:${i}`, type: 'faq', title: f.keywords[0], body: ko(f.answer), aliases: f.keywords, screenId: null, entityKey: String(i) });
  });

  return list;
}

export const KNOWLEDGE = build();

export function getById(id) {
  return KNOWLEDGE.find((k) => k.id === id) || null;
}
