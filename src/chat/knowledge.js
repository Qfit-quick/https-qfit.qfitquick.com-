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
// title/body 는 {ko,en,zh} 사전 그대로 들고 있는다(2026-09-21, 영·중 지원
// 추가) — respond.js 가 요청 locale 에 맞춰 그때 골라 쓴다. 검색(retrieve.js)
// 은 title 의 세 언어 전부를 본다 — 화면 언어가 영어여도 한국어로 치면
// 찾아져야 하고, 그 반대도 마찬가지다(기존 chatbot.js 의 scoreAnyLang 과
// 같은 생각). challengeTracks 만 예외 — 그 데이터 자체가 한국어 전용
// 방침이라(전문 용어 오역 위험, chatbot.js 머리 설명 참고) en/zh 를
// 지어내지 않고 ko 를 그대로 셋에 채운다.

import { RECOVERY_CARDS, INJURY_GUIDES } from '../data/recovery.js';
import { CHATBOT_FAQ } from '../data/chatbot-faq.js';
import { EXERCISES } from '../data/exercises.js';
import { PROGRAMS } from '../data/programs.js';
import { FOODS, EATING_OUT } from '../data/foods.js';
import { MUSCLE_GROUPS } from '../data/muscle-groups.js';
import { CHALLENGE_TRACKS, CHALLENGE_TRACK_ORDER } from '../data/challengeTracks.js';
import { classifySmallTalk } from './intent.js';

export const LOCALES = ['ko', 'en', 'zh'];

// 언어 사전이 아니라 그냥 문자열(예: FAQ 의 keywords[0])이 올 수도 있어서,
// 그럴 땐 세 언어에 같은 값을 채운다 — pick() 쪽에서 매번 분기하지 않게.
function localeDict(v) {
  if (v && typeof v === 'object') return { ko: v.ko || '', en: v.en || v.ko || '', zh: v.zh || v.ko || '' };
  const s = String(v || '');
  return { ko: s, en: s, zh: s };
}

export function pick(dict, locale) {
  if (!dict) return '';
  return dict[locale] || dict.ko || '';
}

const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '');

// 여러 {ko,en,zh} 조각을 언어별로 이어 붙인다(예: cue + tip).
function joinDicts(dicts, sep = ' ') {
  const out = { ko: '', en: '', zh: '' };
  for (const l of LOCALES) out[l] = dicts.map((d) => stripHtml(d?.[l] || '')).filter(Boolean).join(sep);
  return out;
}

function build() {
  const list = [];

  INJURY_GUIDES.forEach((g) => {
    const immediate = g.groups && g.groups[2]; // '즉시 대처' — chatbot.js 와 같은 자리
    const body = joinDicts((immediate?.items || []));
    list.push({ id: `injury:${g.id}`, type: 'recovery', title: localeDict(g.part), body, aliases: [], screenId: 'recovery-screen', entityKey: g.id });
  });

  RECOVERY_CARDS.forEach((c, i) => {
    const body = joinDicts(c.items || []);
    const title = localeDict(c.tag && c.tag.ko ? c.tag : c.title);
    list.push({ id: `recoverycard:${i}`, type: 'recovery', title, body, aliases: [], screenId: 'recovery-screen', entityKey: String(i) });
  });

  EXERCISES.forEach((ex) => {
    const body = joinDicts([ex.cue, ex.tip]);
    const title = localeDict(ex.label);
    list.push({ id: `exercise:${ex.key}`, type: 'exercise', title, body, aliases: [title.en, title.zh].filter(Boolean), screenId: 'video-gallery-screen', entityKey: ex.key });
  });

  PROGRAMS.forEach((p) => {
    const title = localeDict(p.name);
    list.push({ id: `program:${p.id}`, type: 'program', title, body: localeDict(p.tagline), aliases: [title.en, title.zh].filter(Boolean), screenId: 'programs-screen', entityKey: p.id });
  });

  // 100g당/단백질/탄수/지방 같은 라벨은 데이터에 번역이 없어서(foods.js 는
  // 수치만 갖고 있다) 여기서 세 언어로 직접 적는다 — 새 사실을 만드는 게
  // 아니라 이미 있는 숫자를 소개하는 말만 옮기는 것이라 데이터 보충
  // 금지 원칙(11쪽)에 걸리지 않는다.
  const PER100_LABEL = { ko: '100g당', en: 'Per 100g:', zh: '每100克：' };
  const MACRO_LABEL = { ko: { p: '단백질', c: '탄수', f: '지방' }, en: { p: 'protein', c: 'carbs', f: 'fat' }, zh: { p: '蛋白质', c: '碳水', f: '脂肪' } };
  FOODS.forEach((f, i) => {
    const per100 = f.per100 || {};
    const body = {};
    for (const l of LOCALES) {
      const m = MACRO_LABEL[l];
      body[l] = `${pick(PER100_LABEL, l)} ${per100.kcal ?? '?'}kcal · ${m.p} ${per100.p ?? '?'} · ${m.c} ${per100.c ?? '?'} · ${m.f} ${per100.f ?? '?'}`;
    }
    const title = localeDict(f.label);
    list.push({ id: `food:${i}`, type: 'food', title, body, aliases: [title.en, title.zh].filter(Boolean), screenId: null, entityKey: String(i) });
  });

  EATING_OUT.forEach((f, i) => {
    const tip = localeDict(f.tip);
    const body = {};
    for (const l of LOCALES) body[l] = `${f.kcal ?? '?'}kcal${tip[l] ? ' · ' + tip[l] : ''}`;
    const title = localeDict(f.label);
    list.push({ id: `eatout:${i}`, type: 'food', title, body, aliases: [title.en, title.zh].filter(Boolean), screenId: null, entityKey: String(i) });
  });

  MUSCLE_GROUPS.forEach((g, i) => {
    const exList = (g.keys || []).map((k) => EXERCISES.find((ex) => ex.key === k)).filter(Boolean);
    const body = {};
    for (const l of LOCALES) body[l] = exList.map((ex) => pick(localeDict(ex.label), l)).join(', ');
    const title = localeDict(g.label);
    list.push({ id: `muscle:${i}`, type: 'exercise', title, body, aliases: [title.en, title.zh].filter(Boolean), screenId: 'video-gallery-screen', entityKey: String(i) });
  });

  // 한국어 전용 데이터(challengeTracks.js 자체 방침 — chatbot.js 머리 설명
  // 참고, 칼리스테닉스 전문 용어 오역 위험). en/zh 자리에도 ko 값을 그대로
  // 채운다(localeDict 가 알아서 한다) — 없는 번역을 지어내지 않는다.
  CHALLENGE_TRACK_ORDER.forEach((key) => {
    const track = CHALLENGE_TRACKS[key];
    if (!track) return;
    const firstPhase = track.phases && track.phases[0];
    const ko = firstPhase ? `${track.totalWeeks}주 · ${track.phases.length}단계. 1단계 — ${firstPhase.title}: ${firstPhase.goal}` : `${track.totalWeeks}주 · ${track.phases.length}단계`;
    list.push({ id: `challenge:${key}`, type: 'challenge', title: localeDict(track.name), body: localeDict(ko), aliases: track.short ? [track.short] : [], screenId: 'challenge-screen', entityKey: key });
  });

  CHATBOT_FAQ.forEach((f, i) => {
    // "안녕"·"고마워" 같은 잡담용 FAQ 항목은 뺀다 — respond.js 가 이런
    // 질문을 classifySmallTalk 로 먼저 따로 처리하는데(intent 를 정확히
    // greeting/motivation 으로 매기려고), 여기 남겨 두면 검색이 먼저
    // 걸려서 intent 가 엉뚱하게 'knowledge' 로 나간다.
    if (classifySmallTalk(f.keywords[0])) return;
    list.push({ id: `faq:${i}`, type: 'faq', title: localeDict(f.keywords[0]), body: localeDict(f.answer), aliases: f.keywords, screenId: null, entityKey: String(i) });
  });

  return list;
}

export const KNOWLEDGE = build();

export function getById(id) {
  return KNOWLEDGE.find((k) => k.id === id) || null;
}
