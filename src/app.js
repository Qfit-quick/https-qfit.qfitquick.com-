import { ICON } from './ui/icons.js';
import { openSheet, closeSheet } from './ui/sheet.js';
import { toast } from './ui/toast.js';
import { advanceProgramProgress, clearPendingProgramDay } from './ui/programs.js';
import { getSupabase, hasStoredSession, isSupabaseReady, isCloudEnabled } from './cloud/supabase.js';
import * as reminder from './notify/reminder.js';
import { RECOVERY_CARDS, INJURY_GUIDES, SPECIAL_GUIDES, DIET_GUIDES } from './data/recovery.js';
import { INJURY_AVOID } from './data/injury-avoid.js';
// Q-fit 앱 본체. legacy/index.html 의 IIFE 본문을 그대로 옮긴 것이다.
// 화면별 분리는 라우터를 다시 짜는 단계에서 이어서 한다.

import { Sound } from './audio/sound.js';
import { STATIC_UI } from './data/i18n-strings.js';
import { COACHES } from './data/coaches.js';
import { EXERCISES } from './data/exercises.js';
import { MUSCLE_GROUPS, EX_TO_GROUP } from './data/muscle-groups.js';
import { DURATION_PRESETS } from './data/durations.js';
import { MOTIVATION_LINES } from './data/motivation.js';
import { PHOTO_SEQUENCES, photoCycle } from './data/photo-sequences.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { VIDEO_CLIPS } from './data/video-clips.js';
import { phasesFor } from './data/exercise-phases.js';
import { AI_GOAL_POOLS } from './data/ai-goals.js';
import { photoUrl, clipUrl, petUrl } from './core/assets.js';
import { clipThumb, disposeClipThumbs } from './ui/clip-thumb.js';
import { markWorkoutDone, wipeHealthData } from './health/store.js';

// ---------- DATA ----------
// ---------- i18n ----------
let LANG = (function(){
 try{ return localStorage.getItem('wodrush_lang_v1') || 'ko'; }catch(e){ return 'ko'; }
})();
let vibrationEnabled = (function(){
 try{ return localStorage.getItem('wodrush_vibration_v1') !== 'off'; }catch(e){ return true; }
})();
export function t(obj){
 if(obj == null) return '';
 if(typeof obj === 'string') return obj;
 return obj[LANG] || obj.ko || '';
}
// 언어는 셋이다. 버튼은 '다음에 갈 언어'를 보여 준다 —
// 지금 언어를 보여 주면 누르면 뭐가 되는지 알 수 없다.
const LANGS = ['ko', 'en', 'zh'];
const LANG_LABEL = { ko: '한글', en: 'EN', zh: '中文' };

function nextLang(){
 return LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length];
}

// 테마는 셋이다: 자동(시스템을 따름) · 라이트 · 다크.
// tokens.css 가 :root[data-theme] 로 갈라 두었으므로 여기서는 그 값만 쓴다.
const THEMES = ['auto', 'light', 'dark'];
const THEME_LABEL = {
 auto: {ko:'자동', en:'Auto', zh:'自动'},
 light: {ko:'라이트', en:'Light', zh:'浅色'},
 dark: {ko:'다크', en:'Dark', zh:'深色'},
};
function currentTheme(){
 try{ return THEMES.includes(localStorage.getItem('wodrush_theme_v1')) ? localStorage.getItem('wodrush_theme_v1') : 'auto'; }
 catch(e){ return 'auto'; }
}
function applyTheme(name){
 // 'auto' 는 속성을 아예 지운다 — 두면 prefers-color-scheme 이 못 이긴다.
 if(name === 'auto') document.documentElement.removeAttribute('data-theme');
 else document.documentElement.setAttribute('data-theme', name);
 try{ localStorage.setItem('wodrush_theme_v1', name); }catch(e){}
}
function cycleTheme(){
 applyTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]);
}
applyTheme(currentTheme());

// 글자 크기: 작게 · 보통 · 크게. tokens.css 의 --t-xs/sm/md 만 이 값을 곱해
// 쓴다 — 제목·통계 숫자까지 같이 키우면 카드 레이아웃이 줄바꿈으로 깨진다.
const FONT_SCALES = ['sm', 'md', 'lg'];
const FONT_SCALE_VALUE = { sm: 0.94, md: 1.06, lg: 1.2 };
const FONT_SCALE_LABEL = {
 sm: {ko:'작게', en:'Small', zh:'小'},
 md: {ko:'보통', en:'Medium', zh:'中'},
 lg: {ko:'크게', en:'Large', zh:'大'},
};
function currentFontScale(){
 try{ const v = localStorage.getItem('wodrush_font_scale_v1'); return FONT_SCALES.includes(v) ? v : 'md'; }
 catch(e){ return 'md'; }
}
function applyFontScale(name){
 const v = FONT_SCALES.includes(name) ? name : 'md';
 document.documentElement.style.setProperty('--font-scale', String(FONT_SCALE_VALUE[v]));
 try{ localStorage.setItem('wodrush_font_scale_v1', v); }catch(e){}
}
function cycleFontScale(){
 applyFontScale(FONT_SCALES[(FONT_SCALES.indexOf(currentFontScale()) + 1) % FONT_SCALES.length]);
}
applyFontScale(currentFontScale());

// 친구 초대 링크(?ref=<보낸 사람 아이디>)로 들어온 경우, 나중에 이 사람이
// 가입할 때 쓸 수 있도록 담아 둔다. 이미 담긴 게 있으면 덮어쓰지 않는다 —
// 링크를 두 번 거치면(공유 → 재공유) 처음 보낸 사람 몫이 사라진다.
try{
 const ref = new URLSearchParams(location.search).get('ref');
 if(ref && !localStorage.getItem('qfit_pending_ref')) localStorage.setItem('qfit_pending_ref', ref);
}catch(e){}

function setLang(lang){
 LANG = LANGS.includes(lang) ? lang : 'ko';
 try{ localStorage.setItem('wodrush_lang_v1', LANG); }catch(e){}
 document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
 applyStaticTranslations();
 renderExGrid();
 renderGroupRow();
 if(typeof updateBestBox === 'function') updateBestBox();
 const lb = document.getElementById('lang-btn');
 if(lb) lb.textContent = LANG_LABEL[nextLang()];
 document.dispatchEvent(new CustomEvent('qfit:lang', { detail: { lang: LANG } }));
}


function applyStaticTranslations(){
 const map = [
 ['.eyebrow', 'eyebrow'], ['.tagline', 'tagline'],
 // 더보기의 다섯 줄은 이제 제목+설명 두 줄이라 data-i18n 이 몬다.
 // 여기서 textContent 로 채우면 그 두 줄이 통째로 지워진다.
 ['#open-account-btn', 'accountBtn'],
 ['#save-routine-btn', 'saveRoutineBtn'],
 ['#manual-back-btn', 'backBtn'],
 ['#setup-back-btn', 'backBtn'],
 ['#lb-back-btn', 'lbBackBtn'],
 // 공유는 아이콘+글자 두 조각이라 textContent 로 채우면 아이콘이 지워진다.
 ['#retry-btn', 'retryBtn'], ['#home-btn', 'homeBtn'],
 ['#records-back-btn', 'lbBackBtn'],
 ['#inapp-open-btn', 'inappOpenBtn'], ['#inapp-dismiss-btn', 'inappDismiss'],
 ['#warmup-toggle-text', 'warmupToggle'], ['#warmup-title', 'warmupTitle'],
 ['#warmup-skip-btn', 'warmupSkip'],
 ];
 map.forEach(([sel, key])=>{
 if(!key) return;
 const el = document.querySelector(sel);
 if(el) el.textContent = t(STATIC_UI[key]);
 });

 updateSetNote();
 // 개수를 말하는 라벨들은 사전 훑기가 못 만든다 — 값이 섞여 있어서
 // 마크업에 적어 둘 수 없다. 언어가 바뀔 때 여기서 다시 그린다.
 try{ updateStartNote(); }catch(e){}
 try{ syncPlayBtn(); }catch(e){}
 try{ syncSelectCount(); }catch(e){}
 // .section-label 을 순서로 집어 채우던 두 줄을 지웠다. 그 두 자리(오늘의 WOD
 // 구성 · 부위별 빠른 선택)는 설계 03 에서 없어졌고, 남은 라벨들은 전부
 // data-i18n 을 달고 있어 사전이 통째로 몬다. 순서로 집으면 마크업에서 무언가
 // 하나만 빠져도 엉뚱한 자리에 엉뚱한 말이 조용히 찍힌다.
 const durationLabelEl = document.getElementById('duration-section-label');
 if(durationLabelEl) durationLabelEl.textContent = t(STATIC_UI.durationLabel);

 // 시작 시트의 세 갈래(제목+설명 두 줄)와 시간 칩은 이제 마크업에 data-i18n 이
 // 붙어 있어 사전이 통째로 몬다. 여기서 textContent 로 채우던 코드를 지웠다 —
 // 그러면 두 줄과 아이콘이 지워지고, 시간 칩은 '짧게6~9초' 처럼 두 말이 붙었다.
 // 칩에는 '짧게/보통/길게' 대신 실제 초를 적는다. 이름은 상대적이라
 // 셋을 나란히 놓기 전에는 몇 초인지 알 수 없다.

 const disclaimer = document.querySelector('.disclaimer');
 if(disclaimer) disclaimer.innerHTML = t(STATIC_UI.disclaimer);

 // 칸 위에 '닉네임' 이라는 라벨이 붙었으므로 placeholder 는 예시를 든다.
 // 라벨과 placeholder 가 같은 말이면 둘 중 하나는 아무 일도 안 한다.
 const nickInput = document.getElementById('nickname-input');
 if(nickInput) nickInput.placeholder = 'Q-fitter';
 const routinesTitleEl = document.querySelector('#routines-screen .lb-title');
 if(routinesTitleEl) routinesTitleEl.textContent = t(STATIC_UI.routinesTitle);

 const howtoTitle = document.querySelector('.howto-title');
 if(howtoTitle) howtoTitle.textContent = t(STATIC_UI.howtoTitle);
 const howtoPlatforms = document.querySelectorAll('.howto-platform');
 if(howtoPlatforms[0]) howtoPlatforms[0].textContent = t(STATIC_UI.howtoIOSTitle);
 if(howtoPlatforms[1]) howtoPlatforms[1].textContent = t(STATIC_UI.howtoAndroidTitle);
 const howtoLists = document.querySelectorAll('.howto-list');
 if(howtoLists[0]){
 const items = howtoLists[0].querySelectorAll('li');
 if(items[0]) items[0].innerHTML = t(STATIC_UI.howtoIOS1);
 if(items[1]) items[1].innerHTML = t(STATIC_UI.howtoIOS2);
 if(items[2]) items[2].innerHTML = t(STATIC_UI.howtoIOS3);
 if(items[3]) items[3].innerHTML = t(STATIC_UI.howtoIOS4);
 }
 if(howtoLists[1]){
 const items = howtoLists[1].querySelectorAll('li');
 if(items[0]) items[0].innerHTML = t(STATIC_UI.howtoAndroid1);
 if(items[1]) items[1].innerHTML = t(STATIC_UI.howtoAndroid2);
 if(items[2]) items[2].innerHTML = t(STATIC_UI.howtoAndroid3);
 }
 const howtoNote = document.querySelector('.howto-note');
 if(howtoNote) howtoNote.textContent = t(STATIC_UI.howtoNote);

 const recTitle = document.querySelector('#records-screen .lb-title');
 if(recTitle) recTitle.textContent = t(STATIC_UI.recTitle);
 // data-i18n 이 붙은 것은 사전이 통째로 몬다.
 //
 // 이 함수의 나머지는 셀렉터를 손으로 나열해 채우는데, 그러면 문구를 하나 넣을
 // 때마다 여기에도 적어야 하고 잊으면 그 자리만 번역이 안 된다 — 오류도 경고도
 // 없이, 그 언어로 화면을 열어 봐야만 보인다. 실제로 기록 화면 라벨이 인덱스로
 // 밀려 '이번 주 횟수' 자리에 '이번 달 완주' 가 찍히고 있었다.
 // 마크업에 이름을 적어 두면 그 사고가 구조적으로 안 난다.
 try{ renderRecovery(); }catch(e){ console.error('renderRecovery failed:', e); }
 document.querySelectorAll('[data-i18n]').forEach(el => {
 const entry = STATIC_UI[el.dataset.i18n];
 if(entry) el.textContent = t(entry);
 });
 document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
 const entry = STATIC_UI[el.dataset.i18nPlaceholder];
 if(entry) el.placeholder = t(entry);
 });
 try{ renderBodyparts(); }catch(e){ console.error('renderBodyparts failed:', e); }
 // 기록 화면 '최근 출석' 라벨도 인덱스로 집고 있었다. [0] 은 '이번 달' 이라
 // 이 줄이 바로 위 사전 훑기를 덮어써서 '이번 달' 자리에 '최근 출석' 이
 // 찍히고 있었다 — 그 라벨은 이제 마크업에 data-i18n="recHistoryLabel" 로 있다.

 const inappTitle = document.querySelector('.inapp-title');
 if(inappTitle) inappTitle.textContent = t(STATIC_UI.inappTitle);
 const inappText = document.querySelector('.inapp-text');
 if(inappText) inappText.innerHTML = t(STATIC_UI.inappText);
 const inappHint = document.querySelector('.inapp-hint');
 if(inappHint) inappHint.innerHTML = t(STATIC_UI.inappHint);
 // '칼로리' 를 강조해 달라는 피드백(2026-09-10) — 위 data-i18n 훑기는
 // textContent 라 <b> 가 글자 그대로 찍힌다. 여기서 innerHTML 로 덮어쓴다.
 const weightHintEl = document.getElementById('weight-hint');
 if(weightHintEl) weightHintEl.innerHTML = t(STATIC_UI.weightHint);

}




let selectedTotalSets = 8; // total sets shown to user, including boss
function regularSetCount(){ return selectedTotalSets - 1; }
function updateSetNote(){
 const setNote = document.querySelector('.set-note');
 if(!setNote) return;
 const restAt = Math.min(Math.floor(selectedTotalSets/2), selectedTotalSets-2);
 setNote.textContent = t({
 ko:'· 총 ' + selectedTotalSets + '세트 (' + restAt + '세트 후 휴식)',
 en:'· ' + selectedTotalSets + ' sets total (rest after ' + restAt + ')',
 zh:'· 共' + selectedTotalSets + '组（第' + restAt + '组后休息）'});
}

// 시작 버튼 밑 한 줄은 홈 화면이 복잡하다는 피드백으로 없앴다(2026-09-09).
// 세트 수·시간은 이제 설정 화면 요약 카드에서만 보인다 — 그래도 그 카드는
// 같은 두 값(세트·초)을 쓰므로 여기서 계속 갱신해 준다.
function updateStartNote(){
 updateSetupSummary();
}

// 설정 화면 맨 위 '지금 설정' 카드. 세 단을 스크롤해 내려가도 지금 값이
// 무엇인지 늘 위에 남아 있게 하는 게 이 카드가 하는 일 전부다.
function updateSetupSummary(){
 const setsEl = document.getElementById('summary-sets');
 if(!setsEl) return;
 const secs = getDurationPreset().base;
 setsEl.textContent = selectedTotalSets;
 const secsEl = document.getElementById('summary-secs');
 if(secsEl){
  secsEl.textContent = secs;
  // 세 자리부터는 --t-stat 에서 --t-xl 로 낮춘다(설계의 경계값 규칙).
  secsEl.classList.toggle('narrow', String(secs).length >= 3);
 }
 const noteEl = document.getElementById('setup-summary-note');
 if(noteEl){
  const warm = document.getElementById('warmup-toggle');
  const mins = Math.max(1, Math.round((selectedTotalSets * secs) / 60));
  noteEl.textContent = (warm && warm.checked ? t(STATIC_UI.warmIncluded) + ' · ' : '') +
   t(STATIC_UI.estMinutes).replace('%s', mins);
 }

 // 칩의 켜짐도 여기서 맞춘다. 예전에는 저장된 설정을 불러올 때만 켜져서,
 // 처음 들어온 사람에게는 기본값 8세트인데 4·8·12 중 아무것도 안 켜져 있었다 —
 // 화면이 "아직 안 골랐다" 고 말하는데 요약 카드는 8이라고 말했다.
 const customSets = document.getElementById('custom-setcount-toggle');
 const setsCustom = !!(customSets && customSets.checked);
 document.querySelectorAll('#setcount-row [data-count]').forEach(b=>{
  b.classList.toggle('active', !setsCustom && parseInt(b.dataset.count, 10) === selectedTotalSets);
 });
 // '직접 입력' 칩도 켜짐을 보여야 한다 — 안 그러면 네 칩 중 아무것도
 // 안 켜진 채로 요약 카드만 값을 말하는 상태가 된다.
 document.getElementById('custom-setcount-btn')?.classList.toggle('active', setsCustom);

 const customSecs = document.getElementById('custom-duration-toggle');
 const secsCustom = !!(customSecs && customSecs.checked);
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=>{
  b.classList.toggle('active', !secsCustom && b.dataset.preset === selectedDurationPreset);
 });
 document.getElementById('custom-duration-btn')?.classList.toggle('active', secsCustom);
}

// 저장된 루틴을 한 줄로. 네 개까지만 적고 나머지는 개수로 줄인다 —
// 행 아래 줄은 한 줄 안에 들어가야 하고, 넘치면 말줄임이 되어 아무 정보도 못 준다.
function routineSummary(keys){
 if(!Array.isArray(keys) || !keys.length) return '';
 const names = keys.map(k=>{
  const ex = EXERCISES.find(e=>e.key===k);
  return ex ? t(ex.label) : null;
 }).filter(Boolean);
 if(!names.length) return '';
 if(names.length <= 4) return names.join(' · ');
 return names.slice(0,3).join(' · ') + t(STATIC_UI.andMore).replace('%s', names.length - 3);
}

// ---------- STATE ----------
let selectedCoach = COACHES[0];
let selectedExKeys = new Set(['SQUAT','RUNINPLACE','BURPEE','JUMPSQUAT']);
// 세트당 시간과 세트 수의 한계. 여기 한 곳에서만 정한다 —
// 예전에는 30 이라는 숫자가 마크업 min/max 와 JS 네 곳에 흩어져 있어서,
// 한 곳만 고치면 입력창은 받아 주는데 값이 조용히 잘리는 상태가 됐다.
export const LIMITS = { setSec: { min: 4, max: 50 }, setCount: { min: 2, max: 40 } };
const clamp = (v, {min, max}, fallback) => {
 const n = parseInt(v, 10);
 return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

// 범위 밖 입력을 그 자리에서 알린다. 조용히 잘라 버리면 사용자는 자기가 넣은
// 값이 왜 다른 값이 됐는지 알 수 없다 — 입력창이 값을 먹은 것처럼 보인다.
function markRange(input, range, message){
 if(!input) return;
 const raw = parseInt(input.value, 10);
 const bad = input.value !== '' && Number.isFinite(raw) && (raw < range.min || raw > range.max);
 input.classList.toggle('out-of-range', bad);
 const note = document.getElementById(input.id.replace('custom-', '').replace('-input', '') + '-range-note');
 if(note) note.textContent = bad ? message : '';
}

let selectedDurationPreset = 'normal';
function getDurationPreset(){
 if(selectedDurationPreset === 'custom'){
 const input = document.getElementById('custom-duration-input');
 const val = clamp(input && input.value, LIMITS.setSec, 10);
 return { base: val, range: 1 }; // range:1 → always exactly `val` seconds
 }
 return DURATION_PRESETS[selectedDurationPreset] || DURATION_PRESETS.normal;
}
let score = 0, streak = 0;
let tipTimeout = null;
let motivationTimeout = null;
let midRestIndex = 0, midRestGiven = false;
let bonusMissionIndex = -1, bonusXpEarned = 0;
let missions = [];
let missionIndex = 0;
let warmupCompletedThisSession = false;
let wodStartTimestamp = 0;
let missionActive = false;
let isPaused = false;
let missionInterval = null;

// ---------- DOM ----------
const startScreen = document.getElementById('start-screen');
const setupScreen = document.getElementById('setup-screen');
const countdownScreen = document.getElementById('countdown-screen');
const wodPreviewScreen = document.getElementById('wod-preview-screen');
const warmupScreen = document.getElementById('warmup-screen');
const warmupVideo = document.getElementById('warmup-video');
const warmupSkipBtn = document.getElementById('warmup-skip-btn');
const warmupToggle = document.getElementById('warmup-toggle');
// 준비운동을 켜고 끄면 예상 시간이 달라진다 — 요약 카드가 그 자리에서 따라온다.
if(warmupToggle) warmupToggle.addEventListener('change', ()=>{ try{ updateSetupSummary(); }catch(e){} });
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const app = document.getElementById('app');

// ---------- SUPABASE (선택 기능 — 로그인 없이도 앱은 완전히 돈다) ----------
// 주소·키와 '언제 받을지'는 cloud/supabase.js 가 들고 있다.
let currentUserId = null;

// 설정은 홈 톱니와 더보기 줄, 두 곳에서 들어올 수 있다. 뒤로가기는 들어온
// 문으로 그대로 나가야 한다 — 더보기에서 들어왔는데 홈으로 나가면
// 뒤로가기가 두 칸을 건너뛴 것처럼 느껴진다. 두 진입점이 서로 멀리 떨어진
// try 블록에 있어서, 블록 스코프 밖인 여기 모듈 스코프에 둔다.
let settingsEnteredFromMore = false;

const accountScreen = document.getElementById('account-screen');
const openAccountBtn = document.getElementById('open-account-btn');
// 클라우드를 잠갔으면 들어가는 문도 없앤다. 눌러도 아무 일이 없는 버튼은
// 고장으로 읽힌다. 마크업에서 지우지 않고 감추는 건, 스위치 하나를
// 되돌리면 그대로 돌아오게 하기 위해서다.
if(openAccountBtn && !isCloudEnabled()) openAccountBtn.hidden = true;
// 그리고 그 사실을 말한다. 로그인이 사라지면 기록이 어디 있는지가
// 화면 어디에도 안 적혀 있게 되는데, 브라우저 자료를 지우면 그날로
// 끝이라 조용히 두면 안 된다.
if(!isCloudEnabled()){
 // 로그인 버튼은 홈 머리로 올라갔다(설계). 그래서 그 옆이 아니라
 // 더보기 목록 아래에 붙인다 — 기록을 보러 오는 자리가 거기다.
 const box = document.querySelector('#more-screen .menu-box');
 if(box && !document.getElementById('local-only-note')){
  const note = document.createElement('p');
  note.id = 'local-only-note';
  note.className = 'sub';
  note.dataset.i18n = 'localOnlyNote';
  box.insertAdjacentElement('afterend', note);
 }
}
const accountBackBtn = document.getElementById('account-back-btn');
const flashOverlay = document.getElementById('flash-overlay');

const exGrid = document.getElementById('ex-grid');
const exSearchInput = document.getElementById('ex-search-input');
if(exSearchInput){ exSearchInput.addEventListener('input', ()=> renderExGrid()); }
const groupRow = document.getElementById('group-row');
const playBtn = document.getElementById('play-btn');
const manualSelectScreen = document.getElementById('manual-select-screen');
const aiQuizScreen = document.getElementById('ai-quiz-screen');
const routinesScreen = document.getElementById('routines-screen');
const settingsScreen = document.getElementById('settings-screen');
const setupBackBtn = document.getElementById('setup-back-btn');
const countdownNum = document.getElementById('countdown-num');
const nicknameInput = document.getElementById('nickname-input');
const weightInput = document.getElementById('weight-input');
const recordsScreen = document.getElementById('records-screen');
const openRecordsBtn = document.getElementById('open-records-btn');
const langBtn = document.getElementById('lang-btn');
const recordsBackBtn = document.getElementById('records-back-btn');
const recoveryScreen = document.getElementById('recovery-screen');
const recoveryBackBtn = document.getElementById('recovery-back-btn');
const videoGalleryScreen = document.getElementById('video-gallery-screen');
const moreScreen = document.getElementById('more-screen');
// 새로 붙은 세 화면. showScreen 의 목록에 같이 들어간다 —
// 목록에서 빠지면 다른 화면으로 넘어가도 이 화면이 안 꺼진 채 겹친다.
const planScreen = document.getElementById('plan-screen');
const bodyScreen = document.getElementById('body-screen');
const logScreen = document.getElementById('log-screen');
const programsScreen = document.getElementById('programs-screen');
const openVideoGalleryBtn = document.getElementById('open-video-gallery-btn');
const videoGalleryBackBtn = document.getElementById('video-gallery-back-btn');
const videoGalleryGrid = document.getElementById('video-gallery-grid');
const shareBtn = document.getElementById('share-btn');
const historyList = document.getElementById('history-list');

const scoreVal = document.getElementById('score-val');
const missionCountEl = document.getElementById('mission-count');
const nextPreview = document.getElementById('next-preview');
const missionTimebarFill = document.getElementById('mission-timebar-fill');
const bossBanner = document.getElementById('boss-banner');
const bonusBanner = document.getElementById('bonus-banner');
const coachEmoji = document.getElementById('coach-emoji');
const coachLine = document.getElementById('coach-line');
const restWrap = document.getElementById('rest-wrap');
const restNum = document.getElementById('rest-num');
const restGo = document.getElementById('rest-go');
const restTouchCard = document.getElementById('rest-touch-card');
const restTouchZone = document.getElementById('rest-touch-zone');
const restTouchProg = document.getElementById('rest-touch-prog');
const restTouchIcon = document.getElementById('rest-touch-icon');
const restTouchLabelEl = document.getElementById('rest-touch-label');
const photoDemoWrap = document.getElementById('photo-demo-wrap');
const photoDemoA = document.getElementById('photo-demo-a');
const photoDemoB = document.getElementById('photo-demo-b');
const exName = document.getElementById('ex-name');
const exTarget = document.getElementById('ex-target');
const exCue = document.getElementById('ex-cue');
const holdRing = document.getElementById('hold-ring');
const holdRingProg = document.getElementById('hold-ring-prog');
const holdNum = document.getElementById('hold-num');
const exTargetNum = document.getElementById('ex-target-num');
const missionTotalEl = document.getElementById('mission-total');
const exWarn = document.getElementById('ex-warn');
const easySwapBtn = document.getElementById('easy-swap-btn');

// 남은 초를 두 자리에 같이 쓴다. 반복 동작은 큰 숫자로, 버티는 동작은 링 안에.
// 이 앱은 횟수를 세지 않는다 — 카메라도 판정도 없이 전부 시간 기반이다(FR-02).
function showRemain(sec){
 const v = String(Math.max(0, sec));
 if(exTargetNum) exTargetNum.textContent = v;
 if(holdNum) holdNum.firstChild ? (holdNum.firstChild.nodeValue = v) : (holdNum.textContent = v);
}
const clearBanner = document.getElementById('clear-banner');

const finalSub = document.getElementById('final-sub');
const finalRank = document.getElementById('final-rank');
const resultCoachEmoji = document.getElementById('result-coach-emoji');
const resultCoachLine = document.getElementById('result-coach-line');
const retryBtn = document.getElementById('retry-btn');
const homeBtn = document.getElementById('home-btn');

const bestScoreBox = document.getElementById('best-score-box');
const bestScoreVal = document.getElementById('best-score-val');

function showScreen(el){
 [startScreen,accountScreen,manualSelectScreen,aiQuizScreen,routinesScreen,settingsScreen,setupScreen,wodPreviewScreen,warmupScreen,countdownScreen,gameScreen,resultScreen,recordsScreen,recoveryScreen,videoGalleryScreen,moreScreen,planScreen,bodyScreen,logScreen,programsScreen].filter(Boolean).forEach(s=>s.classList.remove('active'));
 el.classList.add('active');
 if(el === moreScreen){
 try{
 const savedPrefs = loadSetupPrefs();
 const show = !!(savedPrefs && Array.isArray(savedPrefs.exKeys) && savedPrefs.exKeys.length);
 const moreBtn = document.getElementById('repeat-trigger-more');
 if(moreBtn) moreBtn.style.display = show ? '' : 'none';
 // '내 루틴' 줄에 몇 개가 저장돼 있는지. 0 개라면 들어가 봐야 빈 화면이라
 // 그 사실을 여기서 미리 말해 준다.
 const sub = document.getElementById('routines-count-sub');
 if(sub){
  const n = loadRoutines().length;
  sub.textContent = n ? t(STATIC_UI.routinesSaved).replace('%s', n) : t(STATIC_UI.routinesNone);
 }
 updateBestBox();
 // 초대 링크는 로그인해야 의미가 있다 — 익명 상태로는 ?ref= 에 넣을
 // 내 아이디가 없다.
 const inviteCard = document.getElementById('invite-friend-card');
 if(inviteCard) inviteCard.style.display = currentUserId ? 'flex' : 'none';
 }catch(e){ console.error('more screen refresh failed:', e); }
 }
 if(el === startScreen){
 try{
 const savedPrefs = loadSetupPrefs();
 const show = !!(savedPrefs && Array.isArray(savedPrefs.exKeys) && savedPrefs.exKeys.length);
 const startBtn = document.getElementById('repeat-trigger-start');
 if(startBtn) startBtn.style.display = show ? '' : 'none';
 // 행 아래 줄에 그 루틴이 무엇인지 적는다. '지난 루틴 다시' 만으로는
 // 무엇이 다시 도는지 눌러 봐야만 알 수 있다.
 const sub = document.getElementById('repeat-trigger-sub');
 if(sub) sub.textContent = show ? routineSummary(savedPrefs.exKeys) : '';
 }catch(e){ console.error('repeat button refresh failed:', e); }
 try{ renderWeekStrip(); }catch(e){ console.error('week strip render failed:', e); }
 // 운동을 끝내고 홈으로 오면 XP 가 늘어 있다. 여기서 다시 그리지 않으면
 // 알은 앱을 다시 켤 때까지 옛 레벨로 남는다.
 try{ renderPetCard(); }catch(e){ console.error('pet card render failed:', e); }
 }
 // 화면이 바뀌었다고 알린다. 탭바와 뒤로가기가 이 신호를 듣는다 —
 // 그쪽에서 showScreen 을 직접 부르게 하면 위에 붙은 훅들을 건너뛰게 된다.
 document.dispatchEvent(new CustomEvent('screenchange', { detail: { id: el.id } }));
}

// 밖에서 화면을 부를 수 있는 유일한 문. 다만 여는 버튼이 따로 있는 화면은
// 그 버튼을 누르는 편이 낫다 — 버튼이 화면을 채우는 렌더까지 들고 있다.
export function showScreenById(id){
 const el = document.getElementById(id);
 if(el) showScreen(el);
}
export function isWorkoutRunning(){ return missionActive; }

/**
 * 밖에서 루틴을 정해 두고 설정 화면으로 보낸다.
 * 계획 화면(src/ui/plan.js)의 '이 날 운동 시작' 이 이걸 부른다.
 *
 * 바로 카운트다운으로 보내지 않는 이유: 계획은 제안이고, 무엇을 몇 세트
 * 하는지는 마지막에 사람이 봐야 한다. 설정 화면이 그 확인 자리다 —
 * '지난 루틴 다시' 도 같은 길을 쓴다.
 */
export function startRoutine({ keys, totalSets, durationPreset } = {}){
 try{
 Sound.unlock();
 if(Array.isArray(keys) && keys.length) selectedExKeys = pickSet(keys);
 if(Number.isFinite(totalSets)) selectedTotalSets = clamp(totalSets, LIMITS.setCount, selectedTotalSets);
 if(durationPreset && DURATION_PRESETS[durationPreset]) selectedDurationPreset = durationPreset;
 // 직접 입력 토글이 켜져 있으면 위에서 정한 프리셋이 무시된다 — 계획이
 // 정한 값을 쓰려면 두 토글을 먼저 내려야 한다(AI 퀴즈도 같이 한다).
 const setToggle = document.getElementById('custom-setcount-toggle');
 const durToggle = document.getElementById('custom-duration-toggle');
 if(setToggle) setToggle.checked = false;
 if(durToggle) durToggle.checked = false;
 revealDurationCard();
 renderExGrid();
 renderGroupRow();
 showScreen(setupScreen);
 syncPlayBtn();
 updateStartNote();
 }catch(e){ console.error('startRoutine failed:', e); }
}

/** 지금 쓰이는 체중(kg). 계획 화면이 칼로리 추정에 같은 값을 쓴다. */
export function activeWeightKg(){ return currentWeightKg(); }

// ---------- AUDIO (synthesized, no files) ----------

// ---------- VOICE ANNOUNCE (speak exercise name aloud) ----------
let cachedKoVoices = [];
let cachedEnVoices = [];
function refreshVoices(){
 if(!window.speechSynthesis) return;
 const all = window.speechSynthesis.getVoices();
 cachedKoVoices = all.filter(v => v.lang && v.lang.toLowerCase().startsWith('ko'));
 cachedEnVoices = all.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
}
if(window.speechSynthesis){
 refreshVoices();
 window.speechSynthesis.onvoiceschanged = refreshVoices;
}
// 설정 화면의 '코치 목소리' — 낮은 톤(male)/높은 톤(female, 기본값).
// 기본값을 female 로 두는 이유: 이 앱은 원래부터 밝고 높은 코치 톤을 기본으로
// 써 왔다(pickEnergeticVoice 의 여성향 가중치, u.pitch 의 높은 기본값들) —
// 토글을 안 건드린 기존 사용자에게는 지금 들리는 소리가 그대로 나야 한다.
const VOICE_PREFS = ['male', 'female'];
function currentVoicePref(){
 try{ const v = localStorage.getItem('wodrush_voice_pref_v1'); return VOICE_PREFS.includes(v) ? v : 'female'; }
 catch(e){ return 'female'; }
}
function setVoicePref(name){
 const v = VOICE_PREFS.includes(name) ? name : 'female';
 try{ localStorage.setItem('wodrush_voice_pref_v1', v); }catch(e){}
 syncVoiceToggle();
}
function syncVoiceToggle(){
 const pref = currentVoicePref();
 const maleBtn = document.getElementById('voice-male-btn');
 const femaleBtn = document.getElementById('voice-female-btn');
 if(maleBtn) maleBtn.classList.toggle('active', pref === 'male');
 if(femaleBtn) femaleBtn.classList.toggle('active', pref === 'female');
}
// 남성 톤을 고르면 피치를 낮춘다 — 여성 톤은 기존 값 그대로.
function voicePitch(base){
 return currentVoicePref() === 'male' ? Math.max(0.7, base - 0.55) : base;
}
function pickEnergeticVoice(){
 const pool = LANG === 'en' ? cachedEnVoices : cachedKoVoices;
 if(!pool.length) return null;
 // score each voice — prefer higher-quality engines, and lean toward
 // whichever gender tone is picked in settings for a more fitting coach feel
 const preferMale = currentVoicePref() === 'male';
 const scoreOf = (v) => {
 const n = v.name.toLowerCase();
 let s = 0;
 if(/neural|natural|wavenet|online|google/.test(n)) s += 2;
 const femaleHit = /female|woman|yuna|arin|jimin|siri/.test(n);
 const maleHit = /male|man|minsu|minho|철수|민수/.test(n);
 if(preferMale){ if(maleHit) s += 3; if(femaleHit) s -= 3; }
 else { if(femaleHit) s += 3; if(maleHit) s -= 3; }
 if(/compact/.test(n)) s -= 1;
 return s;
 };
 const sorted = pool.slice().sort((a,b)=> scoreOf(b) - scoreOf(a));
 return sorted[0];
}
function speakExercise(label, cue){
 if(Sound.isMuted()) return;
 if(!window.speechSynthesis) return;
 try{
 window.speechSynthesis.cancel();
 const text = cue ? (label + '! ' + cue) : (label + '!');
 const doSpeak = () => {
 try{
 const u = new SpeechSynthesisUtterance(text);
 u.lang = LANG === 'en' ? 'en-US' : 'ko-KR';
 u.rate = 1.15;
 u.pitch = voicePitch(1.5);
 u.volume = 1;
 const voice = pickEnergeticVoice();
 if(voice) u.voice = voice;
 // iOS in particular can suspend the Web Audio session while/after
 // speech plays — try to wake it back up once speech finishes.
 u.onend = () => Sound.unlock();
 u.onerror = () => Sound.unlock();
 window.speechSynthesis.speak(u);
 }catch(e){}
 };
 // Some mobile browsers (Chrome/Android especially) silently drop a
 // speak() call issued in the same tick right after cancel() — a
 // short delay makes the announcement reliably audible on phones.
 setTimeout(doSpeak, 60);
 }catch(e){}
}

function speakTip(tipText){
 if(Sound.isMuted() || !tipText) return;
 if(!window.speechSynthesis) return;
 try{
 const u = new SpeechSynthesisUtterance(tipText);
 u.lang = LANG === 'en' ? 'en-US' : 'ko-KR';
 u.rate = 1.1;
 u.pitch = voicePitch(1.4);
 u.volume = 0.9;
 const voice = pickEnergeticVoice();
 if(voice) u.voice = voice;
 u.onend = () => Sound.unlock();
 u.onerror = () => Sound.unlock();
 window.speechSynthesis.speak(u);
 }catch(e){}
}
function speakMotivation(){
 if(Sound.isMuted()) return;
 if(!window.speechSynthesis) return;
 try{
 const lines = MOTIVATION_LINES[LANG] || MOTIVATION_LINES.ko;
 const line = lines[Math.floor(Math.random() * lines.length)];
 const u = new SpeechSynthesisUtterance(line);
 u.lang = LANG === 'en' ? 'en-US' : 'ko-KR';
 u.rate = 1.15;
 u.pitch = voicePitch(1.55);
 u.volume = 0.9;
 const voice = pickEnergeticVoice();
 if(voice) u.voice = voice;
 u.onend = () => Sound.unlock();
 u.onerror = () => Sound.unlock();
 window.speechSynthesis.speak(u);
 }catch(e){}
}

function updateMuteIcon(){
 const icon = Sound.isMuted() ? ICON.soundOff : ICON.soundOn;
 const a = document.getElementById('mute-btn-start');
 const b = document.getElementById('mute-btn-game');
 // 둘 다 innerHTML 이어야 한다. 한쪽만 고쳤더니 운동 화면의 음소거 버튼이
 // SVG 소스를 글자로 찍어서, 화면 왼쪽에 태그가 그대로 흘러나왔다.
 if(a) a.innerHTML = icon;
 if(b) b.innerHTML = icon;
}
try{
 const muteStartBtn = document.getElementById('mute-btn-start');
 const muteGameBtn = document.getElementById('mute-btn-game');
 if(muteStartBtn) muteStartBtn.addEventListener('click', ()=>{ Sound.toggleMute(); updateMuteIcon(); });
 if(muteGameBtn) muteGameBtn.addEventListener('click', ()=>{ Sound.toggleMute(); updateMuteIcon(); });
 updateMuteIcon();
}catch(e){ console.error('mute button setup failed:', e); }

try{
 const pauseBtn = document.getElementById('pause-btn');
 const pauseOverlay = document.getElementById('pause-overlay');
 const resumeBtn = document.getElementById('resume-btn');
 const quitBtn = document.getElementById('quit-btn');
 const skipBtn = document.getElementById('skip-btn');
 if(skipBtn && pauseOverlay){
 skipBtn.addEventListener('click', ()=>{
 isPaused = false;
 pauseOverlay.classList.remove('on');
 Sound.startBGM();
 skipMission();
 });
 }
 if(pauseBtn && pauseOverlay){
 pauseBtn.addEventListener('click', ()=>{
 isPaused = true;
 pauseOverlay.classList.add('on');
 // 몇 번째에서 멈췄는지 적는다(설계 11). 뒤 화면이 흐려져 있어서
 // n/N 을 못 읽으므로, 여기서 다시 말해 주지 않으면 알 길이 없다.
 const stepEl = document.getElementById('pause-step');
 if(stepEl) stepEl.textContent = t(STATIC_UI.paused) + ' · ' + (missionIndex + 1) + '/' + missions.length;
 try{ syncPauseClipBtn(); }catch(e){ console.error('syncPauseClipBtn failed:', e); }
 Sound.stopBGM();
 // 초점을 '계속하기' 로. 안 옮기면 키보드 사용자는 가려진 뒤 화면을
 // 계속 돌아다니게 된다.
 requestAnimationFrame(()=> resumeBtn?.focus?.());
 });
 }
 if(resumeBtn && pauseOverlay){
 resumeBtn.addEventListener('click', ()=>{
 isPaused = false;
 pauseOverlay.classList.remove('on');
 Sound.startBGM();
 });
 }
 // Esc 는 '계속하기' 와 같다(설계 11). 멈춘 화면에서 Esc 가 아무 일도 안 하면
 // 그 화면에 갇힌 것처럼 느껴진다.
 document.addEventListener('keydown', (e)=>{
 if(e.key === 'Escape' && pauseOverlay && pauseOverlay.classList.contains('on')) resumeBtn?.click();
 });
 if(quitBtn && pauseOverlay){
 quitBtn.addEventListener('click', ()=>{
 const msg = t({ko:'정말 운동을 종료할까요? 지금까지 기록은 저장되지 않아요.', en:"Quit this workout? Today's progress won't be saved.", zh:'确定要结束这次训练吗？当前进度不会保存。'});
 if(confirm(msg)){
 isPaused = false;
 pauseOverlay.classList.remove('on');
 missionActive = false;
 clearInterval(missionInterval);
 Sound.stopBGM();
 stopPhotoDemo();
 stopRest();
 stopRestTouch();
 if(app) app.classList.remove('workout-mode');
 showScreen(startScreen);
 }
 });
 }
}catch(e){ console.error('pause/quit setup failed:', e); }

try{
 const loginPromptOverlay = document.getElementById('login-prompt-overlay');
 const loginPromptYesBtn = document.getElementById('login-prompt-yes-btn');
 const loginPromptLaterBtn = document.getElementById('login-prompt-later-btn');
 if(loginPromptYesBtn) loginPromptYesBtn.addEventListener('click', ()=>{
 if(loginPromptOverlay) loginPromptOverlay.classList.remove('on');
 try{ localStorage.setItem('wodrush_login_prompt_dismissed', 'true'); }catch(e){}
 updateAccountUI();
 showScreen(accountScreen);
 });
 if(loginPromptLaterBtn) loginPromptLaterBtn.addEventListener('click', ()=>{
 if(loginPromptOverlay) loginPromptOverlay.classList.remove('on');
 try{ localStorage.setItem('wodrush_login_prompt_dismissed', 'true'); }catch(e){}
 });
}catch(e){ console.error('login prompt setup failed:', e); }

try{
 const openSettingsBtn = document.getElementById('open-settings-btn');
 const settingsBackBtn = document.getElementById('settings-back-btn');
 const bgmToggle = document.getElementById('settings-bgm-toggle');
 const sfxToggle = document.getElementById('settings-sfx-toggle');
 const vibrationToggle = document.getElementById('settings-vibration-toggle');

 // apply persisted settings on load
 let bgmOn = true, sfxOn = true;
 try{ bgmOn = localStorage.getItem('wodrush_bgm_v1') !== 'off'; }catch(e){}
 try{ sfxOn = localStorage.getItem('wodrush_sfx_v1') !== 'off'; }catch(e){}
 Sound.setBgmMuted(!bgmOn);
 Sound.setSfxMuted(!sfxOn);
 if(bgmToggle) bgmToggle.checked = bgmOn;
 if(sfxToggle) sfxToggle.checked = sfxOn;
 if(vibrationToggle) vibrationToggle.checked = vibrationEnabled;

 if(openSettingsBtn) openSettingsBtn.addEventListener('click', ()=>{ settingsEnteredFromMore = false; showScreen(settingsScreen); });
 if(settingsBackBtn) settingsBackBtn.addEventListener('click', ()=> showScreen(settingsEnteredFromMore ? moreScreen : startScreen));
 if(bgmToggle) bgmToggle.addEventListener('change', ()=>{
 Sound.setBgmMuted(!bgmToggle.checked);
 try{ localStorage.setItem('wodrush_bgm_v1', bgmToggle.checked ? 'on' : 'off'); }catch(e){}
 });
 if(sfxToggle) sfxToggle.addEventListener('change', ()=>{
 Sound.setSfxMuted(!sfxToggle.checked);
 try{ localStorage.setItem('wodrush_sfx_v1', sfxToggle.checked ? 'on' : 'off'); }catch(e){}
 });
 if(vibrationToggle) vibrationToggle.addEventListener('change', ()=>{
 vibrationEnabled = vibrationToggle.checked;
 try{ localStorage.setItem('wodrush_vibration_v1', vibrationToggle.checked ? 'on' : 'off'); }catch(e){}
 });
}catch(e){ console.error('settings screen setup failed:', e); }

// ---------- FLASH ----------
function flash(color){
 flashOverlay.style.background = color || '#fff';
 flashOverlay.style.opacity = '0.35';
 flashOverlay.style.transition = 'none';
 requestAnimationFrame(()=>{
 flashOverlay.style.transition = 'opacity 0.3s ease';
 flashOverlay.style.opacity = '0';
 });
}

// ---------- confetti burst (운동 직후 폭죽 연출) ----------
function fireConfetti(){
 const layer = document.getElementById('confetti-layer');
 if(!layer) return;
 const colors = ['--accent', '--hot', '--cool', '--text'];
 const count = 22;
 for(let i=0;i<count;i++){
 const piece = document.createElement('span');
 piece.className = 'confetti-piece';
 piece.style.background = `var(${colors[Math.floor(Math.random()*colors.length)]})`;
 piece.style.left = (Math.random()*100) + 'vw';
 piece.style.animationDelay = (Math.random()*0.4) + 's';
 piece.style.animationDuration = (1.3 + Math.random()*0.8) + 's';
 layer.appendChild(piece);
 setTimeout(()=>{ piece.remove(); }, 2400);
 }
}

// ---------- 세트 사이 휴식 ----------
//
// 쉬는 동안 이 자리에 로고가 뜬다. 예전에는 막대인간이 서 있었다 —
// 운동 동작을 흉내 내는 그림이라 '쉬라' 고 말하는 화면에서는 할 말이 없었다.
// 쉬는 시간은 결국 기다리는 시간이므로 기다리는 화면의 관용어를 쓴다.
//
// 끝나도 저절로 넘어가지 않는다. 예전에는 0 이 되는 순간 다음 세트가
// 시작됐는데, 물 마시러 간 사이에 한 세트가 지나가 있었다.
let restTapHandler = null;

function stopRest(){
 if(restWrap) restWrap.style.display = 'none';
 if(restGo) restGo.hidden = true;
 if(restNum) restNum.hidden = false;
 if(restTapHandler){
 gameScreen.removeEventListener('click', restTapHandler);
 restTapHandler = null;
 }
}

// 남은 초가 0 이 되면 부른다. 화면을 누를 때까지 기다린다.
function waitForTapToResume(){
 if(restNum) restNum.hidden = true;
 if(restGo) restGo.hidden = false;
 restTapHandler = (e)=>{
 // 조작 버튼(일시정지 등)은 제 일을 하게 둔다. 여기서 같이 걸리면
 // 멈추려고 누른 것이 운동을 시작시킨다.
 if(e.target.closest('button')) return;
 stopRest();
 Sound.markIntensified();
 runMission();
 };
 gameScreen.addEventListener('click', restTapHandler);
}

// ---------- 휴식 인증 (번개 꾹 누르기) ----------
//
// 쉬는 동안 화면 앞에 실제로 있는지 카메라 없이 가볍게 확인한다. 번개를
// 0.6초 꾹 누르고 있으면 원형 진행바가 차고 "인증 완료"로 바뀐다.
// 이 앱은 휴식이 한 번뿐이라(runRest 는 게임당 한 번만 불린다) 그 한 번이
// 곧 첫 휴식이다 — 따로 "첫 휴식인가"를 셀 필요가 없다.
const REST_TOUCH_HOLD_MS = 600;
const REST_TOUCH_R = 26;
const REST_TOUCH_CIRC = 2 * Math.PI * REST_TOUCH_R;
let restTouchActive = false;
let restTouchVerified = false;
let restTouchPressStart = 0;
let restTouchRaf = null;

function resetRestTouch(){
 restTouchVerified = false;
 restTouchPressStart = 0;
 if(restTouchRaf){ cancelAnimationFrame(restTouchRaf); restTouchRaf = null; }
 if(restTouchZone){
 restTouchZone.style.display = '';
 restTouchZone.classList.remove('verified');
 }
 if(restTouchProg){
 restTouchProg.style.strokeDasharray = String(REST_TOUCH_CIRC);
 restTouchProg.style.strokeDashoffset = String(REST_TOUCH_CIRC);
 }
 if(restTouchIcon) restTouchIcon.textContent = '⚡';
 if(restTouchLabelEl) restTouchLabelEl.textContent = t(STATIC_UI.restTouchLabel);
}

function stepRestTouch(){
 if(!restTouchActive || restTouchVerified || !restTouchPressStart) return;
 const elapsed = Date.now() - restTouchPressStart;
 const pct = Math.min(1, elapsed / REST_TOUCH_HOLD_MS);
 if(restTouchProg) restTouchProg.style.strokeDashoffset = String(REST_TOUCH_CIRC * (1 - pct));
 if(pct >= 1){
 restTouchVerified = true;
 restTouchPressStart = 0;
 if(restTouchZone) restTouchZone.classList.add('verified');
 if(restTouchIcon) restTouchIcon.textContent = '✅';
 if(restTouchLabelEl) restTouchLabelEl.textContent = t(STATIC_UI.restTouchDone);
 setTimeout(()=>{ if(restTouchZone) restTouchZone.style.display = 'none'; }, 500);
 return;
 }
 restTouchRaf = requestAnimationFrame(stepRestTouch);
}

function endRestTouchPress(){
 restTouchPressStart = 0;
 if(restTouchRaf){ cancelAnimationFrame(restTouchRaf); restTouchRaf = null; }
 if(!restTouchVerified && restTouchProg) restTouchProg.style.strokeDashoffset = String(REST_TOUCH_CIRC);
}

if(restTouchZone){
 restTouchZone.addEventListener('pointerdown', (e)=>{
 if(!restTouchActive || restTouchVerified) return;
 e.preventDefault();
 restTouchPressStart = Date.now();
 restTouchRaf = requestAnimationFrame(stepRestTouch);
 });
 restTouchZone.addEventListener('pointerup', endRestTouchPress);
 restTouchZone.addEventListener('pointerleave', endRestTouchPress);
 restTouchZone.addEventListener('pointercancel', endRestTouchPress);
}

function startRestTouch(){
 if(!restTouchCard) return;
 restTouchCard.style.display = '';
 restTouchActive = true;
 resetRestTouch();
}

function stopRestTouch(){
 restTouchActive = false;
 endRestTouchPress();
 if(restTouchCard) restTouchCard.style.display = 'none';
}

// ---------- 운동 중 사진 ----------
//
// 이 자리만 사진을 쓴다. 동작을 알려 주는 화면(고르기 카드, 미리보기 줄,
// 동작 도감, 일시정지)은 전부 영상이다. 둘을 섞어 쓰면 보는 사람은
// 어느 쪽을 따라 해야 하는지 매번 다시 판단해야 한다.
//
// 움직임은 두 겹으로 만든다:
//   1. 프레임 교차 페이드 — 한 운동의 국면을 순서대로 순환한다.
//   2. 천천한 화면 흐름(CSS) — 버티기처럼 프레임이 한 장뿐인 동작에도
//      정지 화면이 아니라는 감각을 남긴다.
let photoDemoTimer = null;
let photoDemoTop = 'a'; // 지금 보이는 쪽
let photoDemoKey = null;

// 미리 받아 둔다. 다음 프레임을 그자리에서 받기 시작하면 첫 바퀴가 빈 화면으로
// 지나가는데, 디졸브로 이으려는 화면에서 그 한 번이 제일 크게 눈에 띈다.
const photoWarmed = new Set();
function warmPhotos(files){
 files.forEach(f=>{
 if(photoWarmed.has(f)) return;
 photoWarmed.add(f);
 const img = new Image();
 img.decoding = 'async';
 img.src = photoUrl(f);
 });
}

function stopPhotoDemo(){
 if(photoDemoTimer){ clearTimeout(photoDemoTimer); photoDemoTimer = null; }
 photoDemoKey = null;
 if(photoDemoWrap){ photoDemoWrap.style.display = 'none'; photoDemoWrap.classList.remove('flowing'); }
}

function startPhotoDemo(key){
 const seq = PHOTO_SEQUENCES[key];
 const cycle = photoCycle(key);
 // 사진이 없으면 이 자리는 빈다. 예전에는 막대인간이 대신 섰지만
 // 그것을 걷어냈다 — 24종 전부 사진이 있고, npm run media 가 빠진 것을
 // 잡는다. 운동을 늘리면서 사진을 안 넣으면 그 검사에서 먼저 걸린다.
 if(!seq || cycle.length === 0 || !photoDemoWrap || !photoDemoA || !photoDemoB){ stopPhotoDemo(); return; }

 if(photoDemoTimer){ clearTimeout(photoDemoTimer); photoDemoTimer = null; }
 photoDemoKey = key;
 warmPhotos(seq.frames);

 photoDemoWrap.style.display = 'block';
 photoDemoWrap.classList.add('flowing');

 photoDemoA.src = photoUrl(cycle[0]);
 photoDemoA.classList.add('active');
 photoDemoB.classList.remove('active');
 photoDemoTop = 'a';

 // 교차 페이드는 머무는 시간에 비례해서 잡는다. 고정값으로 두면
 // 빠른 동작(제자리 달리기 380ms)에서는 페이드가 끝나기 전에 다음이 오고,
 // 느린 동작에서는 중간에 멈춰 있는 구간이 생긴다.
 //
 // 버티기(ms:0)는 여기서 1500 이 된다 — 바꿀 프레임이 없으니 화면 흐름만
 // 아주 느리게 돈다. 플랭크에서 화면이 빨리 흐르면 버티는 30초가 더 길게 느껴진다.
 const hold = seq.ms || 1800;
 // 머무는 시간의 0.7 배까지 겹친다. 짧게 잡으면 '떠 있다가 툭 바뀐다' 로
 // 읽히는데, 길게 겹쳐 두면 거의 항상 넘어가는 중이라 한 장면으로 이어진다.
 const fade = Math.round(Math.min(1100, Math.max(220, hold * 0.7)));
 photoDemoWrap.style.setProperty('--photo-fade', fade + 'ms');
 photoDemoWrap.style.setProperty('--photo-hold', hold + 'ms');

 // 한 장짜리 버티기는 바꿀 것이 없다. CSS 흐름만 남긴다.
 if(cycle.length < 2) return;

 let i = 0;
 const step = ()=>{
 // 다른 동작으로 넘어갔으면 이 타이머는 죽는다. 안 막으면 이전 세트의 사진이
 // 새 세트 위에 한 장 섞이는데, 그게 바로 '사진이 섞인다' 로 보이는 것이다.
 if(photoDemoKey !== key) return;
 i = (i + 1) % cycle.length;
 const showing = photoDemoTop === 'a' ? photoDemoA : photoDemoB;
 const hidden  = photoDemoTop === 'a' ? photoDemoB : photoDemoA;
 hidden.src = photoUrl(cycle[i]);
 hidden.classList.add('active');
 showing.classList.remove('active');
 photoDemoTop = photoDemoTop === 'a' ? 'b' : 'a';
 photoDemoTimer = setTimeout(step, hold);
 };
 photoDemoTimer = setTimeout(step, hold);
}

// ---------- LOCAL PROFILE (per-device, like Geometry Dash / Magic Tiles —
// no login, your records just keep building up on whatever device you play on) ----------
const NICK_KEY = 'wodrush_nickname_v1';
const WEIGHT_KEY = 'wodrush_weight_kg_v1';
function loadWeightKg(){
 try{
 const val = parseFloat(localStorage.getItem(WEIGHT_KEY));
 if(val && val > 0){ if(weightInput) weightInput.value = val; return val; }
 }catch(e){}
 return 65; // average adult fallback used when no weight is entered
}
function saveWeightKg(kg){
 try{ if(kg && kg > 0) localStorage.setItem(WEIGHT_KEY, String(kg)); }catch(e){}
}
function currentWeightKg(){
 const v = weightInput ? parseFloat(weightInput.value) : NaN;
 return (v && v > 0) ? v : loadWeightKg();
}

// ---------- LAST-USED SETUP (압도적 편리함: 매번 처음부터 다시 고르지 않도록) ----------
const SETUP_PREFS_KEY = 'wodrush_last_setup_v1';
function saveSetupPrefs(){
 try{
 const durationToggle = document.getElementById('custom-duration-toggle');
 const durationInput = document.getElementById('custom-duration-input');
 const setToggle = document.getElementById('custom-setcount-toggle');
 const setInput = document.getElementById('custom-setcount-input');
 const prefs = {
 exKeys: Array.from(selectedExKeys),
 durationPreset: selectedDurationPreset,
 customDurationOn: !!(durationToggle && durationToggle.checked),
 customDurationVal: durationInput ? durationInput.value : null,
 totalSets: selectedTotalSets,
 customSetOn: !!(setToggle && setToggle.checked),
 customSetVal: setInput ? setInput.value : null,
 warmupOn: !!(warmupToggle && warmupToggle.checked),
 };
 localStorage.setItem(SETUP_PREFS_KEY, JSON.stringify(prefs));
 }catch(e){ console.error('saveSetupPrefs failed:', e); }
}
function loadSetupPrefs(){
 try{
 const raw = localStorage.getItem(SETUP_PREFS_KEY);
 if(!raw) return null;
 return JSON.parse(raw);
 }catch(e){ return null; }
}
// Apply saved prefs to both the JS state AND the on-screen controls, so the
// setup screen visually reflects what you picked last time instead of
// silently resetting to the defaults every single visit.
// 시간 칩은 세트 수를 고른 뒤에 나온다 — 두 줄을 한꺼번에 보여 주면
// 어느 쪽을 먼저 정해야 하는지 알 수 없다.
// 다만 기본값(8세트)이 이미 켜져 있으므로, 화면에 들어올 때는 이미 고른
// 것으로 친다. 안 그러면 '8세트' 칩은 노란데 안내문은 아직 고르라고 말한다.
function revealDurationCard(){
 const card = document.getElementById('duration-card');
 const hint = document.getElementById('duration-hint');
 if(card && card.style.display === 'none'){ card.style.display = ''; }
 if(hint) hint.style.display = 'none';
}
function applySetupPrefs(prefs){
 if(!prefs) return;
 try{
 if(Array.isArray(prefs.exKeys) && prefs.exKeys.length){
 selectedExKeys = pickSet(prefs.exKeys);
 renderExGrid();
 renderGroupRow();
 }
 if(prefs.durationPreset){
 selectedDurationPreset = prefs.durationPreset;
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=>{
 b.classList.toggle('active', b.dataset.preset === prefs.durationPreset);
 });
 const durationToggle = document.getElementById('custom-duration-toggle');
 const durationInput = document.getElementById('custom-duration-input');
 if(durationToggle){ durationToggle.checked = !!prefs.customDurationOn; }
 if(durationInput){
 if(prefs.customDurationVal) durationInput.value = prefs.customDurationVal;
 }
 if(prefs.customDurationOn){
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=> b.classList.remove('active'));
 }
 }
 if(prefs.totalSets){
 selectedTotalSets = prefs.totalSets;
 document.querySelectorAll('#setcount-row [data-count]').forEach(b=>{
 b.classList.toggle('active', parseInt(b.dataset.count,10) === prefs.totalSets);
 });
 const setToggle = document.getElementById('custom-setcount-toggle');
 const setInput = document.getElementById('custom-setcount-input');
 if(setToggle){ setToggle.checked = !!prefs.customSetOn; }
 if(setInput){
 if(prefs.customSetVal) setInput.value = prefs.customSetVal;
 }
 if(prefs.customSetOn){
 document.querySelectorAll('#setcount-row [data-count]').forEach(b=> b.classList.remove('active'));
 }
 revealDurationCard();
 }
 if(warmupToggle) warmupToggle.checked = !!prefs.warmupOn;
 updateSetNote();
 try{ updateStartNote(); }catch(e){}
 }catch(e){ console.error('applySetupPrefs failed:', e); }
}
const PROFILE_KEY = 'wodrush_profile_v1';
let myNickname = '';
let myProfile = { totalCompletions:0, currentStreak:0, bestStreakEver:0, lastPlayDate:null, monthlyCounts:{}, history:[], totalWorkoutSeconds:0, xp:0, totalCalories:0, achievements:[], comebackCount:0 };

function levelFor(total){
 if(total >= 100) return { label:'Gold', icon:'', next:null };
 if(total >= 50) return { label:'Silver', icon:'', next:100 };
 if(total >= 30) return { label:'Bronze', icon:'', next:50 };
 return { label:null, icon:'', next:30 };
}
function monthKeyStr(){ return todayStr().slice(0,7); }

// ---------- XP / Level ----------
function xpLevel(xp){ return Math.floor((xp || 0) / 100) + 1; }
function xpIntoLevel(xp){ return (xp || 0) % 100; }

// ---------- Achievements ----------
function checkAchievements(){
 myProfile.achievements = myProfile.achievements || [];
 let newlyUnlocked = [];
 ACHIEVEMENTS.forEach(a=>{
 if(!myProfile.achievements.includes(a.id) && a.check(myProfile)){
 myProfile.achievements.push(a.id);
 newlyUnlocked.push(a);
 }
 });
 return newlyUnlocked;
}

// ---------- COMEBACK BONUS (재접속 유도) ----------
function checkComeback(){
 try{
 if(!myProfile.lastPlayDate || (myProfile.totalCompletions||0) < 1) return;
 const last = new Date(myProfile.lastPlayDate + 'T00:00:00');
 const today = new Date(todayStr() + 'T00:00:00');
 const gapDays = Math.round((today - last) / 86400000);
 if(gapDays < 2) return; // 어제까지 했으면 컴백 아님
 const shownKey = 'wodrush_comeback_shown_' + todayStr();
 if(localStorage.getItem(shownKey)) return;
 localStorage.setItem(shownKey, '1');
 myProfile.xp = (myProfile.xp||0) + 15;
 myProfile.comebackCount = (myProfile.comebackCount||0) + 1;
 checkAchievements();
 saveProfile();
 const banner = document.getElementById('comeback-banner');
 if(banner){
 banner.style.display = 'block';
 banner.innerHTML = t({
 ko:gapDays + '일 만에 복귀! <b>+15 XP</b> 보너스 지급. 오늘은 가볍게 몸부터 풀어봅니다.',
 en:'Welcome back after ' + gapDays + ' days! <b>+15 XP</b> bonus added. Ease back in today.',
 zh:'时隔' + gapDays + '天回来了！赠送 <b>+15 XP</b>。今天先轻松热身吧。'});
 }
 }catch(e){ console.error('checkComeback failed:', e); }
}


function loadNickname(){
 try{
 const val = localStorage.getItem(NICK_KEY);
 if(val){ myNickname = val; if(nicknameInput) nicknameInput.value = myNickname; }
 }catch(e){}
}
function saveNickname(name){
 try{ localStorage.setItem(NICK_KEY, name); }catch(e){}
}
function loadProfile(){
 try{
 const val = localStorage.getItem(PROFILE_KEY);
 if(val){
 const p = JSON.parse(val);
 myProfile = Object.assign({ totalCompletions:0, currentStreak:0, bestStreakEver:0, lastPlayDate:null, monthlyCounts:{}, history:[], totalWorkoutSeconds:0, xp:0, totalCalories:0, achievements:[], comebackCount:0 }, p);
 }
 }catch(e){}
 updateBestBox();
}
function saveProfile(){
 try{ localStorage.setItem(PROFILE_KEY, JSON.stringify(myProfile)); }catch(e){}
 syncProfileToCloud();
}

async function syncProfileToCloud(){
 if(!currentUserId) return;
 const sb = await getSupabase();
 if(!sb) return;
 try{
 await sb.from('profiles').upsert({
 id: currentUserId,
 nickname: myNickname || '익명',
 total_completions: myProfile.totalCompletions || 0,
 current_streak: myProfile.currentStreak || 0,
 best_streak_ever: myProfile.bestStreakEver || 0,
 last_play_date: myProfile.lastPlayDate,
 monthly_counts: myProfile.monthlyCounts || {},
 history: myProfile.history || [],
 updated_at: new Date().toISOString(),
 });
 }catch(e){ console.error('cloud sync failed:', e); }
}

async function fetchProfileFromCloud(){
 if(!currentUserId) return null;
 const sb = await getSupabase();
 if(!sb) return null;
 try{
 const { data, error } = await sb.from('profiles').select('*').eq('id', currentUserId).maybeSingle();
 if(error) throw error;
 return data;
 }catch(e){ console.error('cloud fetch failed:', e); return null; }
}

function applyCloudProfile(row){
 if(!row) return;
 myNickname = row.nickname || myNickname || '익명';
 myProfile = {
 totalCompletions: row.total_completions || 0,
 currentStreak: row.current_streak || 0,
 bestStreakEver: row.best_streak_ever || 0,
 lastPlayDate: row.last_play_date || null,
 monthlyCounts: row.monthly_counts || {},
 history: row.history || [],
 };
 saveNickname(myNickname);
 try{ localStorage.setItem(PROFILE_KEY, JSON.stringify(myProfile)); }catch(e){}
 updateBestBox();
}

function updateAccountUI(){
 const loginForm = document.getElementById('account-login-form');
 const signupForm = document.getElementById('account-signup-form');
 const tabs = document.querySelector('.auth-tabs');
 const backBtn = document.getElementById('account-back-btn');
 if(!loginForm) return;
 if(currentUserId){
 loginForm.style.display = 'none';
 signupForm.style.display = 'none';
 if(tabs) tabs.style.display = 'none';
 if(backBtn){
 backBtn.textContent = '로그아웃';
 backBtn.onclick = async ()=>{
 try{ if(isSupabaseReady()){ const sb = await getSupabase(); await sb.auth.signOut(); } }catch(e){}
 currentUserId = null;
 updateAccountUI();
 showScreen(startScreen);
 };
 }
 const eyebrow = document.querySelector('#account-screen .eyebrow');
 if(eyebrow) eyebrow.textContent = '계정 연동됨';
 } else {
 loginForm.style.display = 'flex';
 if(tabs){
 tabs.style.display = 'flex';
 const activeTab = tabs.querySelector('.auth-tab.active');
 signupForm.style.display = (activeTab && activeTab.dataset.tab === 'signup') ? 'flex' : 'none';
 loginForm.style.display = (activeTab && activeTab.dataset.tab === 'signup') ? 'none' : 'flex';
 }
 if(backBtn){
 backBtn.textContent = '계정 없이 계속하기';
 backBtn.onclick = ()=> showScreen(startScreen);
 }
 const eyebrow = document.querySelector('#account-screen .eyebrow');
 if(eyebrow) eyebrow.textContent = '계정 연동';
 }
}

async function checkSupabaseSession(){
 // 로그인한 적이 없으면 SDK 를 받지도 않는다. 로그인은 선택 기능이라
 // 안 쓰는 사람에게 120KB 를 받게 할 이유가 없다.
 if(!hasStoredSession()) return;
 const sb = await getSupabase();
 if(!sb) return;
 try{
 const { data } = await sb.auth.getSession();
 if(data && data.session && data.session.user){
 currentUserId = data.session.user.id;
 const row = await fetchProfileFromCloud();
 if(row) applyCloudProfile(row);
 else await syncProfileToCloud(); // first login on this device — push local data up
 updateAccountUI();
 updateBestBox();
 }
 }catch(e){ console.error('session check failed:', e); }
}

// 더보기 맨 아래의 '최고 기록' 카드(설계 16). 숫자 하나와 그 곁줄만 둔다 —
// 기록 화면을 여기 요약하려 들면 그 화면이 있을 이유가 없어진다.
function updateBestBox(){
 if(!bestScoreBox) return;
 // 한 번도 안 했으면 감춘다. 0점을 크게 보여 주는 것은 성적표다.
 if(!(myProfile.totalCompletions > 0)){ bestScoreBox.hidden = true; return; }
 bestScoreBox.hidden = false;
 if(bestScoreVal) bestScoreVal.textContent = myProfile.bestScoreEver || 0;
 const metaEl = document.getElementById('best-score-meta');
 if(metaEl) metaEl.textContent = t(STATIC_UI.pointUnit) + ' · ' + t({
  ko: '총 ' + myProfile.totalCompletions + '회 완주',
  en: myProfile.totalCompletions + ' sessions total',
  zh: '累计完成' + myProfile.totalCompletions + '次'});
}

// 오늘의 챌린지(설계 16). 규칙은 하나다 — 오늘 세 번 완주.
// 이미 있는 기록만으로 세므로 새 저장 항목을 만들지 않는다.
// 기록을 CSV 로 뽑는다(설계 17의 '기록 내보내기').
// 이 앱은 기록을 이 기기에만 두므로, 기기를 바꾸거나 브라우저 데이터를
// 지우면 그걸로 끝이다 — 내보내기가 유일한 백업 수단이다.
function exportHistoryCsv(){
 try{
 const rows = [['date', 'time', 'group']];
 (myProfile.history || []).forEach(e=>{
  const d = new Date(histTime(e));
  rows.push([
   d.toISOString().slice(0, 10),
   d.toTimeString().slice(0, 5),
   (typeof e === 'object' && e.g) ? e.g : '',
  ]);
 });
 if(rows.length === 1){ toast(t(STATIC_UI.nothingToExport)); return; }
 // BOM 을 붙인다 — 없으면 엑셀이 한글을 깨서 연다.
 const csv = '﻿' + rows.map(r=> r.join(',')).join('\n');
 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = 'qfit-history-' + todayStr() + '.csv';
 document.body.appendChild(a); a.click(); document.body.removeChild(a);
 setTimeout(()=> URL.revokeObjectURL(url), 4000);
 }catch(e){ console.error('csv export failed:', e); }
}

// 되돌릴 수 없는 일이라 두 번 묻는다. 한 번만 물으면 목록을 훑다가
// 잘못 눌러 그대로 지워지는 일이 실제로 일어난다.
function wipeAllData(){
 if(!confirm(t(STATIC_UI.wipeConfirm1))) return;
 if(!confirm(t(STATIC_UI.wipeConfirm2))) return;
 try{
 Object.keys(localStorage)
  .filter(k=> k.startsWith('wodrush_'))
  .forEach(k=> localStorage.removeItem(k));
 }catch(e){ console.error('wipe failed:', e); }
 // 신체정보와 기록지는 접두어가 'qfit_' 다. 위의 'wodrush_' 훑기로는 안
 // 걸리므로 따로 지운다 — '모든 데이터 지우기' 가 일부만 지우면
 // 남은 쪽이 다음에 되살아나고, 그건 지웠다는 말이 거짓이 된다.
 try{ wipeHealthData(); }catch(e){ console.error('wipe health failed:', e); }
 location.reload();
}

// 설계 16 에는 '오늘의 챌린지' 배너가 있지만 만들지 않는다 — 챌린지는 // FR-05 로 걷어낸 기능이다(커밋 150da98). 설계 파일은 그 결정보다 앞선 그림이라, // 둘이 어긋나면 요구사항이 이긴다.

function todayStr(){
 return new Date().toISOString().slice(0,10);
}
function todayCompletionCount(){
 const today = todayStr();
 return (myProfile.history || []).filter(e => new Date(histTime(e)).toISOString().slice(0,10) === today).length;
}
function isYesterday(dateStr){
 const d = new Date(dateStr + 'T00:00:00');
 d.setDate(d.getDate()+1);
 return d.toISOString().slice(0,10) === todayStr();
}

function escapeHtml(str){
 return String(str).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderHistoryList(){
 const hist = (myProfile.history || []);
 if(!hist.length){
 historyList.innerHTML = '<div class="lb-empty">' + t({ko:'아직 완주 기록이 없습니다.', en:'No sessions completed yet.', zh:'还没有完成记录。'}) + '</div>';
 return;
 }
 historyList.innerHTML = hist.map(e=>{
 const d = new Date(histTime(e));
 const dateStr = t({ko:(d.getMonth()+1)+'월 '+d.getDate()+'일', en:d.toLocaleString('en-US',{month:'short'}) + ' ' + d.getDate(), zh:(d.getMonth()+1)+'月'+d.getDate()+'日'});
 const timeStr = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
 return '<div class="lb-row"><div class="lb-name">'+dateStr+'</div><div class="lb-stats">'+timeStr+'</div></div>';
 }).join('');
}

// ---------- MY RECORDS UI ----------
function weeklyCompletionCount(){
 const now = Date.now();
 const weekMs = 7 * 24 * 60 * 60 * 1000;
 return (myProfile.history || []).filter(e => now - histTime(e) <= weekMs).length;
}

function renderWeekStrip(){
 const strip = document.getElementById('week-strip');
 if(!strip) return;
 strip.innerHTML = '';

 const countByDate = {};
 (myProfile.history || []).forEach(e=>{
  const d = new Date(histTime(e));
  countByDate[d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()] = 1;
 });

 // 설계의 주는 월요일에 시작한다. 오늘로 끝나는 굴러가는 7일이 아니라
 // '이번 주' 라 카드 제목과 같은 말이 되어야 한다.
 const dow = t({ko:['월','화','수','목','금','토','일'], en:['M','T','W','T','F','S','S'], zh:['一','二','三','四','五','六','日']});
 const today = new Date();
 const monday = new Date(today);
 monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
 monday.setHours(0,0,0,0);

 for(let i = 0; i < 7; i++){
  const d = new Date(monday);
  d.setDate(monday.getDate() + i);
  const done = !!countByDate[d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()];
  // 다섯 가지 상태는 설계의 cell() 과 같다: done · today · miss · future · off.
  // 완주가 오늘보다 먼저 오는 게 중요하다 — 오늘 이미 했으면 테두리가 아니라
  // 채워진 칸으로 보여야 "오늘 것은 끝났다" 가 한눈에 읽힌다.
  const isToday = d.toDateString() === today.toDateString();
  const state = done ? 'done' : (isToday ? 'today' : (d > today ? 'future' : 'miss'));

  const cell = document.createElement('div');
  cell.className = 'week-day ' + state;
  cell.innerHTML = '<span class="wd-label">' + dow[i] + '</span>';
  const dot = document.createElement('span');
  dot.className = 'wd-dot';
  dot.textContent = done ? '✓' : '';
  cell.appendChild(dot);
  strip.appendChild(cell);
 }

 // 카드 머리의 오른쪽. 기록이 없으면 숫자 대신 다음 할 일을 말한다 —
 // '연속 0일' 은 성적표처럼 읽혀서 처음 여는 사람을 쫓아낸다.
 const line = document.getElementById('streak-line');
 if(line){
  const st = myProfile.currentStreak || 0;
  line.textContent = st > 0 ? t(STATIC_UI.streakDays).replace('%s', st) : t(STATIC_UI.streakNone);
 }
}

// ---------- 알 (성장 펫) ----------
//
// XP 100 마다 레벨 하나(xpLevel), 레벨이 어느 구간에 드느냐로 단계가 갈린다.
// 표는 여기 한 벌뿐이다 — 홈의 작은 알과 성장 창이 같은 표를 본다.
// 두 벌로 두면 홈은 알인데 창은 큐피드인 날이 온다.
//
// 단계마다 그림 아니면 이모지 하나다. 아기 큐피드에는 그림이 없어서
// 이모지로 세운다(그림 두 장은 알과 완전체뿐이다).
const PET_STAGES = [
 { min:1,  max:5,        img:'egg-v1.webp',        emoji:'🥚', name:{ko:'알', en:'Egg', zh:'蛋'} },
 { min:5,  max:10,       img:null,                 emoji:'🐣', name:{ko:'아기 큐피드', en:'Baby Cupid', zh:'幼年丘比特'} },
 { min:10, max:Infinity, img:'cupid-logo-v3.webp', emoji:'💗', name:{ko:'완전체 큐피드', en:'Full Cupid', zh:'完全体丘比特'} },
];

function petStageIndex(level){
 const i = PET_STAGES.findIndex(s => level >= s.min && level < s.max);
 return i < 0 ? 0 : i;
}

/** 그림 한 장을 그린다. 그림이 있는 단계면 <img>, 없으면 이모지만 보인다. */
function paintPetVisual(imgEl, emojiEl, stage){
 if(imgEl){
  if(stage.img){
   const url = petUrl(stage.img);
   if(imgEl.getAttribute('src') !== url) imgEl.src = url;
   imgEl.style.display = '';
  } else {
   imgEl.style.display = 'none';
  }
 }
 if(emojiEl){
  emojiEl.textContent = stage.img ? '' : stage.emoji;
  emojiEl.style.display = stage.img ? 'none' : '';
 }
}

/** 홈의 작은 알. 그림과 레벨 두 가지만 말한다. */
function renderPetCard(){
 const card = document.getElementById('pet-card');
 if(!card) return;
 const level = xpLevel(myProfile.xp || 0);
 const stage = PET_STAGES[petStageIndex(level)];
 paintPetVisual(document.getElementById('pet-img'), document.getElementById('pet-emoji'), stage);
 const lvEl = document.getElementById('pet-level');
 if(lvEl) lvEl.textContent = 'Lv. ' + level;
 // 눈으로는 그림과 숫자로 읽히지만, 소리로 들으면 'Lv. 3' 뿐이라
 // 무엇의 레벨인지 알 수 없다. 단계 이름을 붙여 준다.
 card.setAttribute('aria-label', t(stage.name) + ' · Lv. ' + level);
}

/** 성장 창을 채우고 연다. */
function openPetDetail(){
 const overlay = document.getElementById('pet-overlay');
 if(!overlay) return;
 const xp = myProfile.xp || 0;
 const level = xpLevel(xp);
 const into = xpIntoLevel(xp);
 const idx = petStageIndex(level);
 const stage = PET_STAGES[idx];
 const next = PET_STAGES[idx + 1];

 paintPetVisual(document.getElementById('pet-detail-img'), document.getElementById('pet-detail-emoji'), stage);

 const nameEl = document.getElementById('pet-detail-name');
 if(nameEl) nameEl.textContent = t(stage.name);
 const lvEl = document.getElementById('pet-detail-level');
 if(lvEl) lvEl.textContent = 'Lv. ' + level;
 const bar = document.getElementById('pet-detail-bar');
 if(bar) bar.style.width = into + '%';
 const xpEl = document.getElementById('pet-detail-xp');
 if(xpEl) xpEl.textContent = into + ' / 100 XP';

 // 다음 단계까지 남은 XP. 레벨 하나가 100 XP 이므로
 // (다음 단계의 첫 레벨 - 지금 레벨) × 100 에서 이번 레벨에 쌓인 만큼을 뺀다.
 const nextEl = document.getElementById('pet-detail-next');
 if(nextEl){
  nextEl.textContent = next
   ? t(STATIC_UI.petNext).replace('%s', Math.max(0, (next.min - level) * 100 - into))
   : t(STATIC_UI.petMax);
 }

 overlay.classList.add('on');
}

function renderCalendar(){
 const grid = document.getElementById('calendar-grid');
 if(!grid) return;
 grid.innerHTML = '';
 const now = new Date();
 const year = now.getFullYear(), month = now.getMonth();
 const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const todayDate = now.getDate();
 // which day-numbers this month have at least one completion
 const doneDays = new Set();
 (myProfile.history || []).forEach(e=>{
 const d = new Date(histTime(e));
 if(d.getFullYear() === year && d.getMonth() === month) doneDays.add(d.getDate());
 });
 const dowLabels = t({ko:['일','월','화','수','목','금','토'], en:['S','M','T','W','T','F','S'], zh:['日','一','二','三','四','五','六']});
 dowLabels.forEach(l=>{
 const el = document.createElement('div');
 el.className = 'cal-dow';
 el.textContent = l;
 grid.appendChild(el);
 });
 for(let i=0;i<firstDow;i++){
 const el = document.createElement('div');
 el.className = 'cal-day empty';
 grid.appendChild(el);
 }
 for(let day=1; day<=daysInMonth; day++){
 const el = document.createElement('div');
 // 앞으로 올 날은 '미완' 이 아니다 — 아직 오지 않았을 뿐이다.
 // 같은 회색으로 칠하면 이번 달 내내 실패한 것처럼 보인다.
 const state = doneDays.has(day) ? ' done'
  : (day === todayDate ? ' today' : (day > todayDate ? ' future' : ' miss'));
 el.className = 'cal-day' + state;
 el.textContent = String(day);
 grid.appendChild(el);
 }

 // 카드 머리: 이번 달과 완주 일수.
 const monthEl = document.getElementById('cal-month');
 if(monthEl) monthEl.textContent = t({
  ko: year + '년 ' + (month+1) + '월',
  en: new Date(year, month, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' }),
  zh: year + '年' + (month+1) + '月'});
 const doneEl = document.getElementById('cal-done');
 if(doneEl) doneEl.textContent = t(STATIC_UI.calDoneDays).replace('%s', doneDays.size);
}

function renderRecordsScreen(){
 // 기록이 하나도 없으면 통계 여섯 칸과 캘린더를 통째로 감춘다.
 // 0 을 여섯 번 늘어놓는 것은 "아직 아무것도 없다"를 여섯 번 말하는 것이고,
 // 처음 온 사람에게는 그게 실패한 화면처럼 보인다.
 const hasAny = (myProfile.totalCompletions || 0) > 0;
 const emptyBox = document.getElementById('records-empty');
 const bodyBox = document.getElementById('records-body');
 if(emptyBox) emptyBox.hidden = hasAny;
 if(bodyBox) bodyBox.hidden = !hasAny;
 if(!hasAny) return;   // 감춘 것을 그릴 이유가 없다

 // 부위 비중도 여기서 같이 그린다. 화면을 켜기만 하고 렌더를 건너뛰면
 // 빈 자리가 남는데, 그건 '이번 주 운동을 안 했다'로 읽힌다.
 try{ renderBodyparts(); }catch(e){ console.error('renderBodyparts failed:', e); }
 renderCalendar();
 document.getElementById('rec-best-streak').textContent = (myProfile.bestStreakEver || 0) + t({ko:'일',en:'d',zh:'天'});
 // 큰 숫자 자리에 부연을 넣으면 44px 로 '0일(오늘 0회)' 가 되어 두 줄로 넘친다.
  // 숫자는 숫자대로 두고 부연만 작게 떼어 붙인다.
  document.getElementById('rec-current-streak').innerHTML =
    (myProfile.currentStreak || 0) + t({ko:'일', en:'d', zh:'天'}) +
    '<span class="val-sub">' +
    t({ko:'오늘 ' + todayCompletionCount() + '회', en:todayCompletionCount() + ' today', zh:'今天' + todayCompletionCount() + '次'}) +
    '</span>';
 document.getElementById('rec-week').textContent = (n => t({ko:n+'회', en:String(n), zh:n+'次'}))(weeklyCompletionCount());
 document.getElementById('rec-month').textContent = (n => t({ko:n+'회', en:String(n), zh:n+'次'}))(myProfile.monthlyCounts[monthKeyStr()] || 0);
 document.getElementById('rec-total').textContent = (n => t({ko:n+'회', en:String(n), zh:n+'次'}))(myProfile.totalCompletions || 0);
 const totalMin = Math.round((myProfile.totalWorkoutSeconds || 0) / 60);
 document.getElementById('rec-total-time').textContent = totalMin >= 60
 ? (Math.floor(totalMin/60) + t({ko:'시간 ',en:'h ',zh:'小时'}) + (totalMin%60) + t({ko:'분',en:'m',zh:'分'}))
 : (totalMin + t({ko:'분',en:'m',zh:'分'}));

 const total = myProfile.totalCompletions || 0;
 const lvl = levelFor(total);
 document.getElementById('badge-current').textContent = lvl.label ? (lvl.icon + ' ' + lvl.label) : t(STATIC_UI.recNoBadge);
 document.getElementById('badge-next').textContent = lvl.next
 ? t({ko:lvl.next + '회까지 ' + (lvl.next - total) + '회 남음', en:(lvl.next - total) + ' more to reach ' + lvl.next, zh:'距离' + lvl.next + '次还差' + (lvl.next - total) + '次'})
 : t(STATIC_UI.recMaxBadge);
 const prevThreshold = lvl.label === 'Gold' ? 100 : lvl.label === 'Silver' ? 50 : lvl.label === 'Bronze' ? 30 : 0;
 const nextThreshold = lvl.next || 100;
 const pct = lvl.next ? Math.min(100, Math.max(0, ((total - prevThreshold) / (nextThreshold - prevThreshold)) * 100)) : 100;
 document.getElementById('badge-bar-fill').style.width = pct + '%';

 const xp = myProfile.xp || 0;
 const lvlNum = xpLevel(xp);
 const intoLevel = xpIntoLevel(xp);
 document.getElementById('xp-level-label').textContent = 'Lv.' + lvlNum;
 document.getElementById('xp-progress-label').textContent = intoLevel + ' / 100 XP';
 const waterFill = document.getElementById('xp-water-fill');
 if(waterFill){
 const bodyTop = 34, bodyBottom = 104, bodyHeight = bodyBottom - bodyTop; // bottle body region in the 60x104 viewBox
 const pct = Math.max(0, Math.min(100, intoLevel)) / 100;
 const fillHeight = Math.max(4, bodyHeight * pct);
 waterFill.setAttribute('y', bodyBottom - fillHeight);
 waterFill.setAttribute('height', fillHeight + 10); // small overflow, safely clipped by bottle shape
 const XP_LEVEL_COLORS = ['#4fc3f7', '#26c6a5', '#9ccc3f', '#ffd60a', '#ff8a3d', '#ff3d00', '#c159ff'];
 waterFill.style.fill = XP_LEVEL_COLORS[(lvlNum - 1) % XP_LEVEL_COLORS.length];
 // 네온 아바타도 같은 색 팔레트로 레벨 따라 자동으로 오라 색·표정이 진화 (별도 상점/재화 없이 단순하게)
 const avatarEl = document.getElementById('neon-avatar');
 const avatarLabelEl = document.getElementById('neon-avatar-label');
 if(avatarEl){
 const auraColor = XP_LEVEL_COLORS[(lvlNum - 1) % XP_LEVEL_COLORS.length];
 avatarEl.style.boxShadow = '0 0 18px 4px ' + auraColor + ', 0 0 4px 1px ' + auraColor + ' inset';
 avatarEl.style.borderColor = auraColor;
 avatarEl.textContent = String(lvlNum);
 }
 if(avatarLabelEl) avatarLabelEl.textContent = 'Lv.' + lvlNum + ' ' + t({ko:'캐릭터', en:'character', zh:'角色'});
 }

 const achvContainer = document.getElementById('achievements-grid');
 if(achvContainer){
 const unlocked = myProfile.achievements || [];
 achvContainer.innerHTML = '';
 ACHIEVEMENTS.forEach(a=>{
 const isUnlocked = unlocked.includes(a.id);
 const box = document.createElement('div');
 box.className = 'achv-box' + (isUnlocked ? ' unlocked' : '');
 box.innerHTML = '<span class="achv-icon">'+a.icon+'</span><span class="achv-label">'+t(a.label)+'</span>';
 achvContainer.appendChild(box);
 });
 }

 renderHistoryList();
}

try{
 if(openRecordsBtn) openRecordsBtn.addEventListener('click', ()=>{
 renderRecordsScreen();
 showScreen(recordsScreen);
 });
 if(recordsBackBtn) recordsBackBtn.addEventListener('click', ()=> showScreen(moreScreen));
}catch(e){ console.error('records button setup failed:', e); }

try{
 const inviteCard = document.getElementById('invite-friend-card');
 if(inviteCard) inviteCard.addEventListener('click', async ()=>{
 if(!currentUserId) return;
 const link = location.href.split('#')[0].split('?')[0] + '?ref=' + encodeURIComponent(currentUserId);
 const shareText = t(STATIC_UI.inviteShareText) + '\n' + link;
 try{
 if(navigator.share){ await navigator.share({ text: shareText, url: link }); return; }
 }catch(e){}
 try{
 await navigator.clipboard.writeText(shareText);
 toast(t(STATIC_UI.linkCopied));
 }catch(e){ console.error('invite friend copy failed:', e); }
 });
}catch(e){ console.error('invite friend card wiring failed:', e); }

try{
 document.querySelectorAll('.recovery-trigger-btn').forEach(btn=>{
 btn.addEventListener('click', ()=> showScreen(recoveryScreen));
 });
 if(recoveryBackBtn) recoveryBackBtn.addEventListener('click', ()=> showScreen(moreScreen));

 const openMoreBtn = document.getElementById('open-more-btn');
 const moreBackBtn = document.getElementById('more-back-btn');
 if(openMoreBtn) openMoreBtn.addEventListener('click', ()=> showScreen(moreScreen));
 if(moreBackBtn) moreBackBtn.addEventListener('click', ()=> showScreen(startScreen));

 // ---------- Video clip gallery (운동영상 모음) ----------
 let videoClipObserver = null;
 const videoLightboxCloseBtn = document.getElementById('video-lightbox-close');
 if(videoLightboxCloseBtn) videoLightboxCloseBtn.addEventListener('click', closeVideoLightbox);
 const videoLightboxEl = document.getElementById('video-lightbox');
 if(videoLightboxEl) videoLightboxEl.addEventListener('click', (e)=>{ if(e.target === videoLightboxEl) closeVideoLightbox(); });

 function renderVideoGallery(){
 const countEl = document.getElementById('moves-count');
 if(countEl) countEl.textContent = t(STATIC_UI.movesCount).replace('%s', VIDEO_CLIPS.length);
 if(!videoGalleryGrid || videoGalleryGrid.children.length) return; // render once
 VIDEO_CLIPS.forEach(clip=>{
 const card = document.createElement('div');
 card.className = 'video-clip-card';
 card.dataset.label = clip.label.toLowerCase();
 const video = document.createElement('video');
 video.src = clipUrl(clip.file);
 video.muted = true;
 video.loop = true;
 video.playsInline = true;
 video.setAttribute('webkit-playsinline', '');
 video.preload = 'metadata';
 const errMsg = document.createElement('div');
 errMsg.className = 'video-clip-error';
 errMsg.style.display = 'none';
 errMsg.textContent = '' + clip.file + ' 파일을 찾을 수 없습니다';
 video.addEventListener('error', ()=>{
 console.error('video clip failed to load:', clip.file, '— check that it is in the same folder as index.html');
 video.style.display = 'none';
 errMsg.style.display = 'flex';
 });
 // 영상 위의 재생 표식. 이게 없으면 정지 프레임이 그냥 사진으로 읽혀서
 // 누를 수 있다는 걸 모른다(설계 15).
 const shot = document.createElement('div');
 shot.className = 'video-clip-shot';
 const play = document.createElement('span');
 play.className = 'video-clip-play';
 play.innerHTML = ICON.play;
 shot.appendChild(video);
 shot.appendChild(errMsg);
 shot.appendChild(play);

 const textWrap = document.createElement('div');
 textWrap.className = 'video-clip-text';
 const label = document.createElement('div');
 label.className = 'video-clip-label';
 label.textContent = clip.label;
 // 카드에는 부위와 큐만. 긴 설명은 눌러서 크게 볼 때 읽는다 —
 // 열두 장이 각각 세 줄이면 화면이 목록이 아니라 글이 된다.
 const ex = EXERCISES.find(e=>e.key === clip.key);
 const g = ex && MUSCLE_GROUPS.find(x=>x.id === EX_TO_GROUP[ex.key]);
 const desc = document.createElement('div');
 desc.className = 'video-clip-desc';
 desc.textContent = [g ? t(g.label) : '', ex ? t(ex.type === 'hold' ? STATIC_UI.kindHold : STATIC_UI.kindReps) : '']
  .filter(Boolean).join(' · ');
 const tip = document.createElement('div');
 tip.className = 'video-clip-tip';
 tip.textContent = clip.tip;
 const risk = document.createElement('div');
 risk.className = 'video-clip-risk';
 // risk 문구가 이미 '부상 위험 부위:' 로 시작한다 — 앞에 '주의' 를 또 붙이지 않는다.
 risk.textContent = clip.risk || '';
 textWrap.appendChild(label);
 textWrap.appendChild(desc);
 textWrap.appendChild(tip);
 textWrap.appendChild(risk);
 card.appendChild(shot);
 card.appendChild(textWrap);
 card.addEventListener('click', ()=> openVideoLightbox(clip));
 videoGalleryGrid.appendChild(card);
 });
 // Only play the clip(s) actually visible on screen — keeps 12 muted
 // videos from all decoding at once, which would drain battery/CPU.
 try{
 videoClipObserver = new IntersectionObserver((entries)=>{
 entries.forEach(entry=>{
 const vid = entry.target;
 if(entry.isIntersecting){ const p = vid.play(); if(p && p.catch) p.catch(()=>{}); }
 else { vid.pause(); }
 });
 }, { threshold:0.5 });
 videoGalleryGrid.querySelectorAll('video').forEach(v=> videoClipObserver.observe(v));
 }catch(e){ console.error('video gallery observer failed:', e); }
 }
 document.querySelectorAll('.video-gallery-trigger-btn').forEach(btn=>{
 btn.addEventListener('click', ()=>{
 Sound.unlock();
 showScreen(videoGalleryScreen);
 renderVideoGallery();
 Sound.startBGM(); // fun upbeat music instead of the clips' own (muted) audio
 });
 });
 const videoSearchInput = document.getElementById('video-search-input');
 const videoSearchEmpty = document.getElementById('video-search-empty');
 if(videoSearchInput){
 videoSearchInput.addEventListener('input', ()=>{
 const term = videoSearchInput.value.trim().toLowerCase();
 let visibleCount = 0;
 if(videoGalleryGrid){
 videoGalleryGrid.querySelectorAll('.video-clip-card').forEach(card=>{
 const match = !term || (card.dataset.label || '').includes(term);
 card.style.display = match ? '' : 'none';
 if(match) visibleCount++;
 });
 }
 if(videoSearchEmpty) videoSearchEmpty.style.display = (term && visibleCount === 0) ? 'block' : 'none';
 });
 }
 if(videoGalleryBackBtn){
 videoGalleryBackBtn.addEventListener('click', ()=>{
 Sound.stopBGM();
 if(videoGalleryGrid) videoGalleryGrid.querySelectorAll('video').forEach(v=> v.pause());
 closeVideoLightbox();
 showScreen(startScreen);
 });
 }
 // '부위별 부상 대처법 바로가기 ↓' 버튼은 없앴다 — 부위 검색이 화면 맨 위로
 // 올라와서 가리킬 곳이 없어졌다(설계 14).
 // 아코디언은 이제 데이터로 그려지므로, 부팅 때 한 번 훑어 붙이면 아직 없는
 // 요소에 붙게 된다. 목록 자체에 걸어 두고 위임한다.
 // 아코디언 둘(부위별 대처법 · 회복 습관)이 같은 방식으로 열린다.
 // 화면에 위임해 두면 어느 쪽을 다시 그려도 다시 연결할 필요가 없다.
 const recoveryScreenEl = document.getElementById('recovery-screen');
 if(recoveryScreenEl){
 recoveryScreenEl.addEventListener('click', (e)=>{
 const btn = e.target.closest('.injury-summary');
 if(!btn) return;
 const acc = btn.parentElement;
 if(acc) acc.classList.toggle('open');
 });
 }
 const injurySearchInput = document.getElementById('injury-search-input');
 const injurySearchEmpty = document.getElementById('injury-search-empty');
 if(injurySearchInput){
 injurySearchInput.addEventListener('input', ()=>{
 const term = injurySearchInput.value.trim().toLowerCase();
 let visibleCount = 0;
 document.querySelectorAll('#injury-list .injury-accordion').forEach(acc=>{
 const summaryBtn = acc.querySelector('.injury-summary');
 const label = summaryBtn ? summaryBtn.textContent.toLowerCase() : '';
 const match = !term || label.includes(term);
 acc.style.display = match ? '' : 'none';
 if(match) visibleCount++;
 // auto-expand the matched section(s) so the answer is right there
 if(term && match && summaryBtn) acc.classList.add('open');
 if(!term) acc.classList.remove('open');
 });
 if(injurySearchEmpty) injurySearchEmpty.style.display = (term && visibleCount === 0) ? 'block' : 'none';
 });
 }
}catch(e){ console.error('recovery button setup failed:', e); }

// ---------- BOOT SEQUENCE ----------
// (moved to the very end of the script — see bottom of file. This comment
// marks where it used to live; keeping the actual calls at the end avoids
// any chance of calling a function before a const/let it depends on has
// been declared, which is exactly what caused this bug before.)

// history 항목은 두 모양이다 — 옛것은 숫자(시각), 새것은 {t, g}.
// 읽는 곳마다 분기하면 한 군데를 빠뜨리므로 여기서 한 번만 편다.
function histTime(entry){ return typeof entry === 'number' ? entry : (entry && entry.t) || 0; }

// 최근 7일 동안 어느 부위를 얼마나 했나(FR-12).
// 부위 정보가 없는 옛 기록은 세지 않는다 — 0으로 세면 비중이 실제보다 낮게 나온다.
function weeklyBodyparts(){
 const since = Date.now() - 7 * 86400000;
 const tally = {};
 let total = 0;
 (myProfile.history || []).forEach(e => {
 if(histTime(e) < since) return;
 const g = (typeof e === 'object' && e.g) || null;
 if(!g) return;
 for(const [id, n] of Object.entries(g)){ tally[id] = (tally[id] || 0) + n; total += n; }
 });
 if(!total) return null;
 return MUSCLE_GROUPS
 .map(g => ({ id: g.id, label: g.label, pct: Math.round((tally[g.id] || 0) / total * 100) }))
 .filter(x => x.pct > 0)
 .sort((a, b) => b.pct - a.pct);
}

// 회복 화면을 데이터로 그린다.
// 언어가 바뀌면 다시 그려야 하므로 applyStaticTranslations 에서도 부른다.
function renderRecovery(){
 // 회복 습관 카드(설계 14). 배지 + 제목 한 줄로 접어 두고, 누르면 펼친다.
 // 다섯 카드의 스무 줄이 늘 펼쳐져 있으면 화면이 네 배로 길어지고,
 // 정작 지금 필요한 부위별 대처법이 그 아래로 밀려난다.
 const cards = document.getElementById('recovery-cards');
 if(cards){
 cards.innerHTML = RECOVERY_CARDS.map(c =>
 '<div class="card injury-accordion recovery-card">' +
 '<button type="button" class="injury-summary">' +
 '<span class="rc-tag">' + t(c.tag) + '</span>' +
 '<span class="rc-title">' + t(c.title) + '</span>' +
 '</button>' +
 '<div class="injury-body">' +
 '<ol class="recovery-list">' +
 c.items.map(it => '<li>' + t(it) + '</li>').join('') +
 '</ol></div></div>'
 ).join('');
 }
 const guideHtml = (guides) => guides.map(g =>
 '<div class="injury-accordion">' +
 '<button type="button" class="injury-summary">' + t(g.part) + '</button>' +
 '<div class="injury-body">' +
 g.groups.map(gr =>
 '<h4>' + t(gr.h) + '</h4><ul>' +
 gr.items.map(it => '<li>' + t(it) + '</li>').join('') +
 '</ul>'
 ).join('') +
 (g.warn ? '<p class="warn-line">' + t(g.warn) + '</p>' : '') +
 '</div></div>'
 ).join('');
 const list = document.getElementById('injury-list');
 if(list) list.innerHTML = guideHtml(INJURY_GUIDES);
 // 대상별 가이드(노인·어린이·부상 회복 중·오십견)와 식단(목적별)은 부위별
 // 목록과 다른 이야기라 따로 그린다 — 검색·칩은 부위별에만 건다.
 const specialList = document.getElementById('special-list');
 if(specialList) specialList.innerHTML = guideHtml(SPECIAL_GUIDES);
 const dietList = document.getElementById('diet-list');
 if(dietList) dietList.innerHTML = guideHtml(DIET_GUIDES);
 renderInjuryChips();
}

// 부위 칩(설계 14). 검색창에 부위 이름을 넣어 주는 지름길이다 —
// 이미 있는 거르기 하나를 두 방식으로 열어 주는 것이라, 걸러진 결과가
// 칩과 검색어 사이에서 갈라지는 일이 없다.
function renderInjuryChips(){
 const row = document.getElementById('injury-chip-row');
 const input = document.getElementById('injury-search-input');
 if(!row || !input) return;
 row.innerHTML = '';
 const apply = (term)=>{
  input.value = term;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  renderInjuryChips();
 };
 const mk = (label, term)=>{
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  const on = input.value.trim() === term;
  if(on) b.dataset.on = '1';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.textContent = label;
  b.addEventListener('click', ()=> apply(on ? '' : term));
  return b;
 };
 row.appendChild(mk(t(STATIC_UI.filterAll), ''));
 INJURY_GUIDES.forEach(g => row.appendChild(mk(t(g.part), t(g.part))));
}

function renderBodyparts(){
 const box = document.getElementById('bodyparts');
 if(!box) return;
 const rows = weeklyBodyparts();
 if(!rows){
 box.innerHTML = '<p class="dim-note">' + t(STATIC_UI.weekPartsEmpty) + '</p>';
 return;
 }
 box.innerHTML = rows.map(r =>
 '<div class="bp-row">' +
 '<span class="bp-name">' + t(r.label) + '</span>' +
 '<span class="bp-track"><i class="bp-fill" style="width:' + r.pct + '%"></i></span>' +
 '<b class="bp-pct">' + r.pct + '%</b>' +
 '</div>'
 ).join('');
}

function recordCompletion(){
 const today = todayStr();
 const mKey = monthKeyStr();
 myProfile.totalCompletions = (myProfile.totalCompletions||0) + 1;
 if(myProfile.lastPlayDate === today){
 // already counted today, streak unchanged
 } else if(myProfile.lastPlayDate && isYesterday(myProfile.lastPlayDate)){
 myProfile.currentStreak = (myProfile.currentStreak||0) + 1;
 } else {
 myProfile.currentStreak = 1;
 }
 myProfile.lastPlayDate = today;
 myProfile.bestStreakEver = Math.max(myProfile.bestStreakEver || 0, myProfile.currentStreak);

 myProfile.monthlyCounts = myProfile.monthlyCounts || {};
 myProfile.monthlyCounts[mKey] = (myProfile.monthlyCounts[mKey] || 0) + 1;

 myProfile.history = myProfile.history || [];
 // 예전에는 시각만 남겼다. 부위 비중(FR-12)을 세려면 어떤 동작을 했는지가 있어야 해서
 // {t: 시각, g: {묶음: 세트수}} 로 바꿨다.
 // 옛 기록은 숫자 그대로 남아 있으므로 읽는 쪽이 두 모양을 다 견뎌야 한다.
 const groups = {};
 (missions || []).forEach(m => {
 const g = EX_TO_GROUP[m.ex.key];
 if(g) groups[g] = (groups[g] || 0) + 1;
 });
 myProfile.history.unshift({ t: Date.now(), g: groups });
 myProfile.history = myProfile.history.slice(0, 50);

 saveProfile();
 updateBestBox();

 // 기록지의 '오늘 운동' 칸도 같이 켠다. 앱에서 운동을 끝냈는데 기록지에
 // 손으로 또 체크해야 한다면 그건 장부를 두 번 적는 것이고, 두 벌은
 // 반드시 어긋난다. 기록지가 이 함수를 유일한 출처로 삼는다.
 try{ markWorkoutDone(); }catch(e){ console.error('markWorkoutDone failed:', e); }
 document.dispatchEvent(new CustomEvent('qfit:completed'));
}

// ---------- SETUP: coach + exercise pickers ----------
// 고른 동작이 없으면 시작할 수 없다. 다만 흐리게만 두지 않고 라벨이
// 무엇을 해야 하는지 말한다 — 못 누르는 이유가 버튼 안에 있어야 한다.
function syncPlayBtn(){
 const btn = document.getElementById('play-btn');
 if(!btn) return;
 const none = selectedExKeys.size === 0;
 btn.disabled = none;
 // 이 버튼은 이제 바로 시작하지 않고 미리보기로 간다(설계 05→06).
 // 라벨이 'START Q' 였을 때는 누르면 곧장 카운트다운이 도는 줄 알게 된다.
 btn.textContent = none ? t(STATIC_UI.pickAtLeastOne) : t(STATIC_UI.previewBtn);
}

// 거르기 상태. 'all' 이거나 MUSCLE_GROUPS 의 id, 또는 난이도('novice'/'pro').
// 칩은 고르는 것이 아니라 거르는 것이다 — 예전에는 부위 칩을 누르면 선택이
// 그 묶음으로 통째로 갈아 끼워져서, 지금까지 고른 것이 조용히 사라졌다.
let exFilter = 'all';

// 아픈 부위(2026-09-10). null 이거나 INJURY_GUIDES[].id 중 하나.
// 세션 동안만 유지한다 — 저장해 두면 통증이 나은 뒤에도 계속 회피하게 된다.
// '1분 시작' 시트에서 고르고, 직접선택·랜덤선택·AI시작 세 길이 전부 이걸 본다.
let painArea = null;
function avoidedKeys(){
 return painArea ? new Set(INJURY_AVOID[painArea] || []) : new Set();
}

// 한 판에 고르는 동작 수는 상한이 없다(설계 03의 4개 제한을 2026-09-10 에
// 없앴다). buildMissions() 가 세트 수(regularSetCount)에 맞춰 pool 에서
// 뽑거나 채워 넣으므로, pool 이 1개든 24개든 그대로 돈다.

// 고른 목록을 만드는 유일한 문. 랜덤·AI·저장된 루틴·공유 링크가 전부
// 여기를 지난다.
function pickSet(keys){
 return new Set(Array.isArray(keys) ? keys : []);
}

// 거르는 칩은 다섯 개다: 전체 + 부위 넷(설계 03).
function exFilterList(){
 return [{ id:'all', label: STATIC_UI.filterAll }]
  .concat(MUSCLE_GROUPS.map(g=>({ id:g.id, label:g.label })));
}

function exMatchesFilter(ex){
 if(exFilter === 'all') return true;
 const g = MUSCLE_GROUPS.find(x=>x.id === exFilter);
 return !!(g && g.keys.includes(ex.key));
}

// 카드 아래 한 줄. 부위와 동작 종류만 — 목표 횟수는 이 앱에 없다(전부 시간 기반).
function exMeta(ex){
 const g = MUSCLE_GROUPS.find(x=>x.id === EX_TO_GROUP[ex.key]);
 const kind = t(ex.type === 'hold' ? STATIC_UI.kindHold : STATIC_UI.kindReps);
 return (g ? t(g.label) : '') + ' · ' + kind;
}

function renderExGrid(){
 // 다시 그리기 전에 지금 붙어 있는 영상을 놓아 준다. 검색어를 한 자
 // 칠 때마다 도는 함수라, 안 놓으면 관찰 대상과 내려받기가 계속 쌓인다.
 disposeClipThumbs(exGrid);
 exGrid.innerHTML = '';
 const searchEl = document.getElementById('ex-search-input');
 const term = searchEl ? searchEl.value.trim().toLowerCase() : '';
 const ordered = EXERCISES.slice().sort((a,b)=> (a.pro?1:0) - (b.pro?1:0));
 const filtered = ordered
  .filter(exMatchesFilter)
  .filter(ex=> !term || t(ex.label).toLowerCase().includes(term));

 if(filtered.length === 0){
 // 검색어를 그대로 인용한다 — '결과 없음' 만 뜨면 자기가 뭘 쳤는지 다시
 // 확인해야 하고, 오타였다는 것도 그때 알게 된다.
 // 거르기만 걸려 있고 검색어가 없을 때는 인용할 말이 없으므로 일반 문구를 쓴다.
 const empty = document.createElement('div');
 empty.className = 'empty-state ex-empty';
 const line = document.createElement('p');
 line.className = 'empty-line';
 line.textContent = term
  ? t(STATIC_UI.searchEmptyQuoted).replace('%s', term)
  : t(STATIC_UI.searchEmpty);
 const hint = document.createElement('p');
 hint.className = 'dim';
 hint.textContent = t(STATIC_UI.resetFilterHint);
 const clearBtn = document.createElement('button');
 clearBtn.type = 'button';
 clearBtn.className = 'sec2';
 clearBtn.textContent = t(STATIC_UI.resetFilters);
 clearBtn.addEventListener('click', ()=>{
  if(searchEl) searchEl.value = '';
  exFilter = 'all';
  renderExGrid();
  renderGroupRow();
 });
 empty.append(line, hint, clearBtn);
 exGrid.appendChild(empty);
 }

 filtered.forEach(ex=>{
 const checked = selectedExKeys.has(ex.key);
 const locked = !!ex.premium && !myProfile.isPremium;
 // 아픈 부위와 겹치는 동작은 막지 않는다 — 최종 판단은 사람 몫이다
 // (이 앱은 "마지막 하나도 못 지우게 막지 않는다"는 원칙을 이미 쓰고
 // 있다). 잠금 카드와 같은 원칙으로 흐리지 않고 배지 하나로만 알려 준다.
 const avoided = avoidedKeys().has(ex.key);
 const btn = document.createElement('button');
 btn.type = 'button';
 btn.className = 'ex-card' + (checked ? ' checked' : '') + (ex.pro ? ' pro' : '') + (locked ? ' locked' : '') + (avoided ? ' avoided' : '');
 btn.setAttribute('role', 'checkbox');
 btn.setAttribute('aria-checked', checked ? 'true' : 'false');

 if(locked){
 const lock = document.createElement('span');
 lock.className = 'premium-lock';
 lock.textContent = '✨';
 btn.appendChild(lock);
 }
 if(avoided){
 const warn = document.createElement('span');
 warn.className = 'avoided-badge';
 warn.title = t(STATIC_UI.avoidedHint);
 warn.textContent = '⚠️';
 btn.appendChild(warn);
 }

 // 무엇을 하는 동작인지 알려 주는 자리다 — 영상을 쓴다.
 // 사진 한 장으로는 스쿼트와 '앉아 있는 사람' 이 구분되지 않는다.
 const shot = document.createElement('span');
 shot.className = 'ex-card-photo';
 const thumb = clipThumb(ex.key);
 if(thumb) shot.appendChild(thumb);

 const head = document.createElement('span');
 head.className = 'ex-card-head';
 const name = document.createElement('span');
 name.className = 'ex-card-name';
 name.textContent = t(ex.label);
 const box = document.createElement('span');
 box.className = 'ex-card-check';
 box.innerHTML = ICON.check;
 head.append(name, box);

 const meta = document.createElement('span');
 meta.className = 'ex-card-meta dim';
 meta.textContent = exMeta(ex);

 btn.append(shot, head, meta);
 btn.addEventListener('click', ()=>{
 if(locked){ window.openPremiumUpsell?.(); return; }
 // 마지막 하나를 못 지우게 막지 않는다. 눌러도 아무 일이 없으면 고장으로
 // 읽히고, 왜 안 되는지도 알 수 없다. 대신 0개일 때 시작 버튼이 말한다.
 if(selectedExKeys.has(ex.key)) selectedExKeys.delete(ex.key);
 else selectedExKeys.add(ex.key);
 renderExGrid();
 renderGroupRow();
 syncPlayBtn();
 syncSelectCount();
 });
 exGrid.appendChild(btn);
 });

 syncSelectCount();
}

// 머리 오른쪽의 '고른 개수'. aria-live 로 두는 이유는 카드를 눌러도 화면이
// 안 바뀌기 때문이다 — 눈으로는 체크가 보이지만 스크린리더에는 아무 일도 없다.
function syncSelectCount(){
 const el = document.getElementById('select-count');
 if(el){
 el.textContent = t(STATIC_UI.selectedCount).replace('%s', selectedExKeys.size);
 el.setAttribute('aria-live', 'polite');
 el.setAttribute('aria-label', t(STATIC_UI.selectedCount).replace('%s', selectedExKeys.size));
 }
 syncSelectCta();
}

// 비활성 상태에서도 무엇을 해야 하는지 라벨이 말한다. '다음' 이 회색으로
// 죽어 있기만 하면 왜 못 누르는지 알 길이 없다.
function syncSelectCta(){
 const btn = document.getElementById('manual-confirm-btn');
 if(!btn) return;
 const none = selectedExKeys.size === 0;
 btn.disabled = none;
 btn.textContent = none
  ? t(STATIC_UI.pickAtLeastOne)
  : t(STATIC_UI.toSetupWithCount).replace('%s', selectedExKeys.size);
}

function renderGroupRow(){
 groupRow.innerHTML = '';
 exFilterList().forEach(f=>{
 const btn = document.createElement('button');
 btn.type = 'button';
 btn.className = 'chip';
 btn.dataset.group = f.id;
 if(exFilter === f.id) btn.dataset.on = '1';
 btn.setAttribute('aria-pressed', exFilter === f.id ? 'true' : 'false');
 btn.textContent = t(f.label);
 btn.addEventListener('click', ()=>{
 exFilter = f.id;
 renderExGrid();
 renderGroupRow();
 });
 groupRow.appendChild(btn);
 });
}
try{ renderExGrid(); }catch(e){ console.error('renderExGrid failed:', e); }
try{ renderGroupRow(); }catch(e){ console.error('renderGroupRow failed:', e); }

// ---------- START: mode selection ----------
function pickModeAndGo(keys){
 Sound.unlock();
 selectedExKeys = pickSet(keys);
 renderExGrid();
 renderGroupRow();
 showScreen(setupScreen);
 try{ syncPlayBtn(); }catch(e){}
 try{ revealDurationCard(); }catch(e){}
}
try{
 const modeRandomBtn = document.getElementById('mode-random');
 const modeManualBtn = document.getElementById('mode-manual');
 // 세트 수만큼 무작위로 고른다(2026-09-10) — 전체 24개 중에서, 세트가
 // 6개면 6개를 뽑는 식. buildMissions() 가 이미 pool 을 세트 수만큼
 // 무작위로 줄여 쓰므로, 여기서는 자르지 않고 전체를 그대로 넘긴다.
 if(modeRandomBtn) modeRandomBtn.addEventListener('click', ()=>{
 let pool = EXERCISES.filter(e=> !e.premium || myProfile.isPremium).map(e=>e.key);
 // 아픈 부위가 있으면 그 부위를 자극하는 동작은 뺀다. 다 빠져서 아무것도
 // 안 남으면(회피 부위가 넓은데 프리미엄도 없는 경우 등) 회피를 접고
 // 원래 pool 로 되돌아간다 — 시작을 아예 막으면 안 된다.
 if(painArea){
  const avoided = avoidedKeys();
  const safe = pool.filter(k=> !avoided.has(k));
  if(safe.length) pool = safe;
 }
 for(let i = pool.length - 1; i > 0; i--){
  const j = Math.floor(Math.random() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
 }
 pickModeAndGo(pool);
 });
 if(modeManualBtn) modeManualBtn.addEventListener('click', ()=>{
 Sound.unlock();
 showScreen(manualSelectScreen);
 });
}catch(e){ console.error('mode buttons failed:', e); }

// 아픈 부위 고르기(2026-09-10). 시트는 직접 입력 시트와 같은 열고 닫는
// 방식(openSheet/closeSheet)을 쓴다. 부위 목록은 회복 화면의 INJURY_GUIDES
// 를 그대로 읽어서 만든다 — 목록을 따로 두면 둘이 어긋나는 날이 온다.
try{
 const painAreaBtn = document.getElementById('pain-area-btn');
 const painAreaPanel = document.getElementById('pain-area-panel');
 const painAreaSub = document.getElementById('pain-area-sub');
 const painAreaChips = document.getElementById('pain-area-chips');
 const painAreaRecoveryLink = document.getElementById('pain-area-recovery-link');

 function paintPainAreaSub(){
 if(!painAreaSub) return;
 const g = painArea && INJURY_GUIDES.find(x=>x.id===painArea);
 painAreaSub.textContent = g ? t(STATIC_UI.painAreaOn).replace('%s', t(g.part)) : t(STATIC_UI.painAreaOff);
 }

 // 부위를 고르면 그 부위의 회복 스트레칭으로 바로 넘어갈 수 있게 링크를
 // 보여준다 — renderInjuryChips() 가 칩에서 검색창을 채우는 것과 같은
 // 방식으로 회복 화면을 그 부위만 펼친 상태로 연다.
 function goToPainRecovery(g){
 closeSheet();
 showScreen(recoveryScreen);
 renderRecovery();
 const input = document.getElementById('injury-search-input');
 if(input){ input.value = t(g.part); input.dispatchEvent(new Event('input', { bubbles: true })); }
 }

 function paintPainAreaLink(){
 if(!painAreaRecoveryLink) return;
 const g = painArea && INJURY_GUIDES.find(x=>x.id===painArea);
 painAreaRecoveryLink.hidden = !g;
 if(g){
 painAreaRecoveryLink.textContent = t(STATIC_UI.painAreaRecoveryLink).replace('%s', t(g.part));
 painAreaRecoveryLink.onclick = ()=> goToPainRecovery(g);
 }
 }

 function renderPainAreaChips(){
 if(!painAreaChips) return;
 painAreaChips.innerHTML = '';
 const mk = (label, id)=>{
 const b = document.createElement('button');
 b.type = 'button';
 b.className = 'chip';
 const on = painArea === id;
 if(on) b.dataset.on = '1';
 b.setAttribute('aria-pressed', on ? 'true' : 'false');
 b.textContent = label;
 b.addEventListener('click', ()=>{
 painArea = (painArea === id) ? null : id;
 paintPainAreaSub();
 paintPainAreaLink();
 renderPainAreaChips();
 // 이미 열려 있는 직접선택 화면이 있으면 회피 표시가 바로 반영돼야 한다.
 try{ renderExGrid(); }catch(err){}
 });
 return b;
 };
 painAreaChips.appendChild(mk(t(STATIC_UI.painAreaNone), null));
 INJURY_GUIDES.forEach(g=> painAreaChips.appendChild(mk(t(g.part), g.id)));
 }

 if(painAreaBtn && painAreaPanel){
 painAreaBtn.addEventListener('click', ()=>{
 renderPainAreaChips();
 openSheet(painAreaPanel, { title: t(STATIC_UI.painAreaBtn), from: painAreaBtn });
 });
 }
 paintPainAreaSub();
 document.addEventListener('qfit:lang', ()=>{ paintPainAreaSub(); paintPainAreaLink(); });
}catch(e){ console.error('pain area picker failed:', e); }

// 난이도별 빠른 선택은 없앴다(설계 03). 초보·숙련은 이제 칩 하나로 '거르기' 다 —
// 누르면 지금까지 고른 것이 통째로 갈아 끼워지던 동작이 사라졌다.

// ---------- AI ROUTINE QUIZ ----------
// 질문이 이 화면에서 제일 큰 글자다(--t-title, 40px). 390 폭에서 한 줄에
// 열네 자쯤 들어가므로 그 안에서 끝나야 두 줄로 접히지 않는다.
// 중국어가 빠져 있어서 중국어로 열면 한국어 질문이 나왔다.
const QUIZ_TITLES = {
 ko: ['무엇이 목표인가요?', '어느 정도로 할까요?'],
 en: ["What's your goal?", 'How hard?'],
 zh: ['你的目标是什么？', '强度选多大？'],
};
let quizAnswers = {};
try{
 const modeAiBtn = document.getElementById('mode-ai-btn');
 const oneMinStartBtn = document.getElementById('one-min-start-btn');
 const oneMinPanel = document.getElementById('one-min-panel');
 if(oneMinStartBtn && oneMinPanel){
 oneMinStartBtn.addEventListener('click', ()=>{
 Sound.unlock();
 // 예전에는 시작 버튼을 숨기고 패널을 그 자리에 펼쳤는데, 닫는 길이 없어서
 // 한 번 열면 홈으로 되돌릴 수가 없었다. 시트는 배경을 누르거나 아래로
 // 끌어내리거나 Esc 로 닫힌다.
 openSheet(oneMinPanel, { title: t(STATIC_UI.startSheetTitle), from: oneMinStartBtn });
 });
 }
 const aiQuizBackBtn = document.getElementById('ai-quiz-back-btn');
 const savedPrefsAtBoot = loadSetupPrefs();
 const hasSavedRoutine = !!(savedPrefsAtBoot && Array.isArray(savedPrefsAtBoot.exKeys) && savedPrefsAtBoot.exKeys.length);
 const repeatTriggerMoreBtn = document.getElementById('repeat-trigger-more');
 const repeatTriggerStartBtn = document.getElementById('repeat-trigger-start');
 if(repeatTriggerMoreBtn && hasSavedRoutine) repeatTriggerMoreBtn.style.display = '';
 if(repeatTriggerStartBtn && hasSavedRoutine) repeatTriggerStartBtn.style.display = '';
 document.querySelectorAll('.repeat-trigger-btn').forEach(btn=>{
 btn.addEventListener('click', ()=>{
 Sound.unlock();
 flash('#ffe600');
 const prefs = loadSetupPrefs();
 applySetupPrefs(prefs); // re-apply in case the user changed things earlier this session
 saveWeightKg(currentWeightKg());
 buildMissions();
 showWodPreview(()=>{ if(prefs && prefs.warmupOn){ startWarmup(); } else { startCountdown(); } });
 });
 });
 if(modeAiBtn) modeAiBtn.addEventListener('click', ()=>{
 Sound.unlock();
 flash('#ffe600');
 quizAnswers = {};
 showQuizStep(0);
 showScreen(aiQuizScreen);
 });
 if(aiQuizBackBtn){
 aiQuizBackBtn.addEventListener('click', ()=>{
 const currentStep = document.querySelector('.quiz-step[style*="flex"]');
 const stepNum = currentStep ? Number(currentStep.dataset.step) : 0;
 if(stepNum > 0){ showQuizStep(stepNum - 1); }
 else { showScreen(startScreen); }
 });
 }

 function showQuizStep(n){
 document.querySelectorAll('.quiz-step').forEach(s=> s.style.display = (Number(s.dataset.step) === n) ? 'flex' : 'none');
 // 점은 켜진 쪽이 길어진다(8 → 20px). 색만 바꾸면 색을 구별하기 어려운
 // 사람에게는 두 점이 늘 같아 보인다.
 document.querySelectorAll('.quiz-progress .dot').forEach(d=> d.classList.toggle('active', Number(d.dataset.step) === n));
 const titleEl = document.getElementById('quiz-title');
 if(titleEl) titleEl.textContent = (QUIZ_TITLES[LANG] || QUIZ_TITLES.ko)[n];
 const labelEl = document.getElementById('quiz-step-label');
 if(labelEl) labelEl.textContent = t(STATIC_UI.quizStepOf).replace('%s', n + 1);
 const subEl = document.getElementById('quiz-sub');
 if(subEl) subEl.textContent = t(n === 0 ? STATIC_UI.quizSub1 : STATIC_UI.quizSub2);
 // 되돌아왔을 때 지난번에 고른 것이 표시돼 있어야 한다.
 document.querySelectorAll('#quiz-step-0 .quiz-btn').forEach(b=>{
  const on = quizAnswers.goal === b.dataset.goal;
  b.classList.toggle('on', on);
  b.setAttribute('aria-checked', on ? 'true' : 'false');
 });
 document.querySelectorAll('#quiz-step-1 .quiz-btn').forEach(b=>{
  const on = quizAnswers.level === b.dataset.level;
  b.classList.toggle('on', on);
  b.setAttribute('aria-checked', on ? 'true' : 'false');
 });
 // 세기 설명은 '가볍게' 같은 상대어가 아니라 실제 값이어야 한다 —
 // 셋을 나란히 놓기 전에는 무엇이 얼마나 가벼운지 알 수 없다.
 Object.entries(QUIZ_LEVELS).forEach(([id, lv])=>{
  const el = document.getElementById('quiz-level-' + id);
  if(el) el.textContent = lv.sets + t(STATIC_UI.setsUnit) + ' · ' +
   (DURATION_PRESETS[lv.preset] || DURATION_PRESETS.normal).base + t(STATIC_UI.secUnit);
 });
 }

 // 2단계의 세 갈래가 정하는 것. 세기 하나로 '어떤 동작' 과 '얼마나' 를
 // 같이 정한다 — 설계가 선택지 설명에 '4세트 · 40초' 라고 적어 둔 그 값이다.
 const QUIZ_LEVELS = {
 light:  { sets: 4,  preset: 'short',  pro: false },
 normal: { sets: 8,  preset: 'normal', pro: false },
 hard:   { sets: 12, preset: 'long',   pro: true  },
 };

 function finishQuiz(){
 const lv = QUIZ_LEVELS[quizAnswers.level] || QUIZ_LEVELS.normal;
 const pool = AI_GOAL_POOLS[quizAnswers.goal] || AI_GOAL_POOLS.full;
 let keys = pool.filter(k=>{
 const ex = EXERCISES.find(e=>e.key===k);
 if(!ex) return false;
 if(ex.premium && !myProfile.isPremium) return false;
 if(lv.pro) return true;
 return !ex.pro;
 });
 if(keys.length < 2) keys = pool; // fallback if filtering left too few
 // 아픈 부위 회피(랜덤과 같은 규칙) — 다 빠지면 회피를 접는다.
 if(painArea){
 const avoided = avoidedKeys();
 const safe = keys.filter(k=> !avoided.has(k));
 if(safe.length) keys = safe;
 }
 // 세트 수만큼 무작위로 고른다(2026-09-10, 랜덤과 같은 규칙) — 목표 풀
 // 전체를 넘기면 buildMissions() 가 세트 수에 맞춰 무작위로 줄여 쓴다.
 selectedExKeys = pickSet(keys);

 // 세기가 세트 수와 시간까지 정한다. 안 그러면 '세게' 를 골라도
 // 다음 화면의 요약 카드가 기본값 그대로라 고른 것이 무시된 것처럼 보인다.
 selectedTotalSets = lv.sets;
 selectedDurationPreset = lv.preset;
 const setToggle = document.getElementById('custom-setcount-toggle');
 const durToggle = document.getElementById('custom-duration-toggle');
 if(setToggle) setToggle.checked = false;
 if(durToggle) durToggle.checked = false;
 revealDurationCard();

 renderExGrid();
 renderGroupRow();
 showScreen(setupScreen);
 try{ syncPlayBtn(); }catch(e){}
 try{ updateSetNote(); updateStartNote(); }catch(e){}
 }

 document.querySelectorAll('#quiz-step-0 .quiz-btn').forEach(btn=>{
 btn.addEventListener('click', ()=>{ quizAnswers.goal = btn.dataset.goal; showQuizStep(1); });
 });
 document.querySelectorAll('#quiz-step-1 .quiz-btn').forEach(btn=>{
 btn.addEventListener('click', ()=>{ quizAnswers.level = btn.dataset.level; finishQuiz(); });
 });

 // 건너뛰기 — 두 문항짜리 퀴즈라도 나가는 길은 늘 열어 둔다.
 // 답이 없으면 지금 고른 동작 그대로 설정으로 넘긴다(퀴즈 전 상태를 지키는 쪽).
 const quizSkipBtn = document.getElementById('quiz-skip-btn');
 if(quizSkipBtn) quizSkipBtn.addEventListener('click', ()=>{
 Sound.unlock();
 showScreen(setupScreen);
 try{ syncPlayBtn(); }catch(e){}
 });
}catch(e){ console.error('AI quiz setup failed:', e); }

// ---------- MY ROUTINES (save / load / share a set of exercises + duration) ----------
const ROUTINES_KEY = 'wodrush_routines_v1';
function loadRoutines(){
 try{
 const raw = localStorage.getItem(ROUTINES_KEY);
 return raw ? JSON.parse(raw) : [];
 }catch(e){ return []; }
}
function saveRoutinesList(list){
 try{ localStorage.setItem(ROUTINES_KEY, JSON.stringify(list)); }catch(e){}
}
function encodeRoutine(routine){
 try{ return btoa(encodeURIComponent(JSON.stringify(routine))); }catch(e){ return null; }
}
function decodeRoutine(str){
 try{ return JSON.parse(decodeURIComponent(atob(str))); }catch(e){ return null; }
}

function renderRoutinesList(){
 const list = loadRoutines();
 const container = document.getElementById('routines-list');
 if(!container) return;
 if(!list.length){
 container.innerHTML = '<div class="lb-empty">아직 저장한 루틴이 없습니다.</div>';
 return;
 }
 container.innerHTML = '';
 list.forEach((r, i)=>{
 const row = document.createElement('div');
 row.className = 'routine-row';
 row.innerHTML =
 '<div class="info"><div class="rname"></div><div class="rmeta"></div></div>' +
 '<button class="load-btn">불러오기</button>' +
 '<button class="share-btn">공유</button>' +
 '<button class="danger del-btn">삭제</button>';
 row.querySelector('.rname').textContent = r.name;
 row.querySelector('.rmeta').textContent = r.keys.length + '개 운동 · ' + (r.duration||'normal');
 row.querySelector('.load-btn').addEventListener('click', ()=>{
 selectedExKeys = pickSet(r.keys);
 selectedDurationPreset = r.duration || 'normal';
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=>{
 b.classList.toggle('active', b.dataset.preset === selectedDurationPreset);
 });
 renderExGrid();
 renderGroupRow();
 showScreen(setupScreen);
 try{ syncPlayBtn(); }catch(e){}
 });
 row.querySelector('.share-btn').addEventListener('click', async ()=>{
 const encoded = encodeRoutine({ name:r.name, keys:r.keys, duration:r.duration });
 if(!encoded) return;
 const url = location.href.split('#')[0].split('?')[0] + '?routine=' + encoded;
 const text = t({ko:'내가 만든 루틴 "' + r.name + '" 해볼래?\n', en:'Try my "' + r.name + '" routine?\n', zh:'来试试我做的方案“' + r.name + '”？\n'}) + url;
 try{
 if(navigator.share){ await navigator.share({ text, url }); return; }
 }catch(e){}
 try{
 await navigator.clipboard.writeText(text);
 alert(t({ko:'링크를 복사했어요!', en:'Link copied!', zh:'链接已复制！'}));
 }catch(e){}
 });
 row.querySelector('.del-btn').addEventListener('click', ()=>{
 const cur = loadRoutines();
 cur.splice(i, 1);
 saveRoutinesList(cur);
 renderRoutinesList();
 });
 container.appendChild(row);
 });
}

try{
 const openRoutinesBtn = document.getElementById('open-routines-btn');
 const routinesBackBtn = document.getElementById('routines-back-btn');
 if(openRoutinesBtn) openRoutinesBtn.addEventListener('click', ()=>{
 renderRoutinesList();
 showScreen(routinesScreen);
 });
 if(routinesBackBtn) routinesBackBtn.addEventListener('click', ()=> showScreen(startScreen));
}catch(e){ console.error('routines UI setup failed:', e); }

// 하단 바의 '이 조합을 내 루틴으로 저장'(설계 05).
// 이름은 날짜로 자동으로 짓는다 — 이름 짓기를 시작 전에 시키면, 오늘 운동을
// 하려던 사람이 갑자기 작명을 하게 된다. 바꾸고 싶으면 내 루틴 화면에서 고친다.
function autoRoutineName(){
 const d = new Date();
 const day = t({
  ko: (d.getMonth()+1) + '월 ' + d.getDate() + '일',
  en: d.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
  zh: (d.getMonth()+1) + '月' + d.getDate() + '日'});
 const first = EXERCISES.find(e=> selectedExKeys.has(e.key));
 return (first ? t(first.label) + ' ' : '') + day;
}
function saveCurrentRoutine(){
 const keys = Array.from(selectedExKeys);
 if(!keys.length) return false;
 const list = loadRoutines();
 // 같은 구성이 이미 있으면 또 쌓지 않는다. 매번 저장을 켜 둔 사람에게는
 // 똑같은 루틴 스무 개가 남는다.
 const sig = keys.slice().sort().join(',') + '|' + selectedDurationPreset;
 if(list.some(r => (r.keys||[]).slice().sort().join(',') + '|' + (r.duration||'normal') === sig)) return false;
 list.unshift({ name: autoRoutineName(), keys, duration: selectedDurationPreset });
 saveRoutinesList(list.slice(0, 20));
 return true;
}

// ---------- Load a routine shared via URL (?routine=...) ----------
try{
 const params = new URLSearchParams(location.search);
 const sharedRoutine = params.get('routine');
 if(sharedRoutine){
 const decoded = decodeRoutine(sharedRoutine);
 if(decoded && Array.isArray(decoded.keys) && decoded.keys.length){
 selectedExKeys = pickSet(decoded.keys);
 selectedDurationPreset = decoded.duration || 'normal';
 renderExGrid();
 renderGroupRow();
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=>{
 b.classList.toggle('active', b.dataset.preset === selectedDurationPreset);
 });
 showScreen(setupScreen);
 try{ syncPlayBtn(); }catch(e){}
 const name = decoded.name ? (' "' + decoded.name + '"') : '';
 alert(t({ko:'친구가 공유한 루틴' + name + '을 불러왔어요!', en:'Loaded a shared routine' + name + '!', zh:'已载入好友分享的方案' + name + '！'}));
 }
 }
}catch(e){ console.error('shared routine load failed:', e); }


try{
 const manualConfirmBtn = document.getElementById('manual-confirm-btn');
 const manualBackBtn = document.getElementById('manual-back-btn');
 if(manualConfirmBtn) manualConfirmBtn.addEventListener('click', ()=>{
 Sound.unlock();
 showScreen(setupScreen);
 try{ syncPlayBtn(); }catch(e){}
 try{ revealDurationCard(); }catch(e){}
 });
 if(manualBackBtn) manualBackBtn.addEventListener('click', ()=> showScreen(startScreen));
}catch(e){ console.error('manual select buttons failed:', e); }

try{
 document.querySelectorAll('#duration-row [data-preset]').forEach(btn=>{
 btn.addEventListener('click', ()=>{
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=> b.classList.toggle('active', b === btn));
 selectedDurationPreset = btn.dataset.preset;
 const customToggle = document.getElementById('custom-duration-toggle');
 if(customToggle){ customToggle.checked = false; }
 try{ updateStartNote(); }catch(e){}
 });
 });
}catch(e){ console.error('duration preset buttons failed:', e); }

try{
 const customToggle = document.getElementById('custom-duration-toggle');
 const customInput = document.getElementById('custom-duration-input');
 if(customToggle && customInput){
 customToggle.addEventListener('change', ()=>{
 if(customToggle.checked){
 selectedDurationPreset = 'custom';
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=> b.classList.remove('active'));
 } else {
 selectedDurationPreset = 'normal';
 document.querySelectorAll('#duration-row [data-preset]').forEach(b=> b.classList.toggle('active', b.dataset.preset === 'normal'));
 }
 try{ updateStartNote(); }catch(e){}
 });
 customInput.addEventListener('input', ()=>{
 markRange(customInput, LIMITS.setSec, t({
 ko: LIMITS.setSec.min + '~' + LIMITS.setSec.max + '초까지 넣을 수 있습니다',
 en: 'Enter ' + LIMITS.setSec.min + '-' + LIMITS.setSec.max + ' seconds',
 zh: '可输入' + LIMITS.setSec.min + '~' + LIMITS.setSec.max + '秒'}));
 // 세트 수 쪽에는 있고 여기에는 없던 줄이다 — 시간을 직접 넣으면
 // 요약 카드와 홈의 한 줄이 옛 값(프리셋)에 머물러 있었다.
 try{ updateStartNote(); }catch(e){}
 });
 }
}catch(e){ console.error('custom duration toggle failed:', e); }

try{
 document.querySelectorAll('#setcount-row [data-count]').forEach(btn=>{
 btn.addEventListener('click', ()=>{
 document.querySelectorAll('#setcount-row [data-count]').forEach(b=> b.classList.toggle('active', b === btn));
 selectedTotalSets = parseInt(btn.dataset.count, 10) || 8;
 updateSetNote();
 try{ updateStartNote(); }catch(e){}
 const customToggle = document.getElementById('custom-setcount-toggle');
 const customInput = document.getElementById('custom-setcount-input');
 if(customToggle){ customToggle.checked = false; }
 revealDurationCard();
 });
 });
}catch(e){ console.error('set count buttons failed:', e); }

try{
 const customSetToggle = document.getElementById('custom-setcount-toggle');
 const customSetInput = document.getElementById('custom-setcount-input');
 if(customSetToggle && customSetInput){
 customSetToggle.addEventListener('change', ()=>{
 if(customSetToggle.checked){
 document.querySelectorAll('#setcount-row [data-count]').forEach(b=> b.classList.remove('active'));
 selectedTotalSets = clamp(customSetInput.value, LIMITS.setCount, 8);
 } else {
 selectedTotalSets = 8;
 document.querySelectorAll('#setcount-row [data-count]').forEach(b=> b.classList.toggle('active', b.dataset.count === '8'));
 }
 updateSetNote();
 try{ updateStartNote(); }catch(e){}
 revealDurationCard();
 });
 customSetInput.addEventListener('input', ()=>{
 selectedTotalSets = clamp(customSetInput.value, LIMITS.setCount, 8);
 markRange(customSetInput, LIMITS.setCount, t({
 ko: LIMITS.setCount.min + '~' + LIMITS.setCount.max + '세트까지 넣을 수 있습니다',
 en: 'Enter ' + LIMITS.setCount.min + '-' + LIMITS.setCount.max + ' sets',
 zh: '可输入' + LIMITS.setCount.min + '~' + LIMITS.setCount.max + '组'}));
 updateSetNote();
 try{ updateStartNote(); }catch(e){}
 });
 }
}catch(e){ console.error('custom set count failed:', e); }

// ---------- 직접 입력 시트 (설계 05) ----------
// −/+ 두 버튼 옆에 진짜 입력칸을 둔다(2026-09-10 — 숫자칸이 없어서
// 키보드로 못 친다는 피드백으로 되돌림). 가운데 칸이 실제 <input> 이라
// 타이핑도 되고, −/+ 로 한두 번 눌러 맞추는 길도 그대로 남는다.
try{
 const panel = document.getElementById('stepper-panel');
 const valEl = document.getElementById('stepper-val');
 const rangeEl = document.getElementById('stepper-range');
 let bound = null; // { input, toggle, range, unit }

 const FIELDS = {
 sets: { input:'custom-setcount-input', toggle:'custom-setcount-toggle',
         range: LIMITS.setCount, title: STATIC_UI.customSetsTitle, unit: STATIC_UI.setsUnit },
 secs: { input:'custom-duration-input', toggle:'custom-duration-toggle',
         range: LIMITS.setSec, title: STATIC_UI.customSecsTitle, unit: STATIC_UI.secUnit },
 };

 function paintStepper(){
 if(!bound || !valEl) return;
 // 지금 이 칸에 타이핑 중이면 값을 안 덮어쓴다 — 덮어쓰면 두 자리
 // 숫자를 치는 도중에 커서가 튄다.
 if(document.activeElement !== valEl) valEl.value = bound.input.value;
 if(rangeEl) rangeEl.textContent = t(STATIC_UI.betweenRange)
  .replace('%s', bound.range.min).replace('%s', bound.range.max) + ' ' + t(bound.unit);
 }

 function nudge(delta){
 if(!bound) return;
 const now = clamp(bound.input.value, bound.range, bound.range.min);
 bound.input.value = Math.max(bound.range.min, Math.min(bound.range.max, now + delta));
 // 값을 쥔 것은 여전히 저 input 이다. 이벤트를 흘려보내면 기존 계산과
 // 요약 카드가 알아서 따라온다 — 여기서 다시 계산하면 두 벌이 된다.
 bound.input.dispatchEvent(new Event('input', { bubbles: true }));
 paintStepper();
 }

 // 범위를 벗어난 채로 남겨 두지 않는다 — 시트를 나가는 순간(포커스 아웃,
 // 적용) 한 번만 정리한다. 타이핑 중에 매 글자마다 고치면 애초에 두 자리
 // 숫자를 못 친다(그게 이 시트를 다시 만든 이유다).
 function finalizeStepper(){
 if(!bound) return;
 const v = clamp(valEl.value, bound.range, bound.range.min);
 bound.input.value = v;
 bound.input.dispatchEvent(new Event('input', { bubbles: true }));
 paintStepper();
 }

 function openStepper(kind, from){
 const f = FIELDS[kind];
 const input = document.getElementById(f.input);
 const toggle = document.getElementById(f.toggle);
 if(!panel || !input || !toggle) return;
 bound = { input, toggle, range: f.range, unit: f.unit };
 if(valEl){ valEl.min = f.range.min; valEl.max = f.range.max; }
 // 칩을 누르는 것이 곧 '직접 입력을 켠다' 이다. 기존 change 핸들러가
 // 프리셋 칩의 켜짐을 끄고 선택 상태를 custom 으로 옮긴다.
 if(!toggle.checked){ toggle.checked = true; toggle.dispatchEvent(new Event('change', { bubbles: true })); }
 paintStepper();
 openSheet(panel, { title: t(f.title), from });
 }

 document.getElementById('stepper-down')?.addEventListener('click', ()=> nudge(-1));
 document.getElementById('stepper-up')?.addEventListener('click', ()=> nudge(1));
 if(valEl){
 // 타이핑하는 족족 실제 input 으로 흘려보낸다 — 계산은 그쪽이 하고,
 // 여기서는 clamp 하지 않는다(위 finalizeStepper 참고).
 valEl.addEventListener('input', ()=>{
  if(!bound) return;
  bound.input.value = valEl.value;
  bound.input.dispatchEvent(new Event('input', { bubbles: true }));
 });
 valEl.addEventListener('blur', finalizeStepper);
 }
 document.getElementById('stepper-apply')?.addEventListener('click', ()=>{
 finalizeStepper();
 closeSheet();
 });

 const setsBtn = document.getElementById('custom-setcount-btn');
 const secsBtn = document.getElementById('custom-duration-btn');
 if(setsBtn) setsBtn.addEventListener('click', ()=> openStepper('sets', setsBtn));
 if(secsBtn) secsBtn.addEventListener('click', ()=> openStepper('secs', secsBtn));
}catch(e){ console.error('stepper sheet failed:', e); }

// 더보기에서도 설정으로 갈 수 있다 — FR-11 로 가이드가 여기로 모였다
try{
 const moreSettingsBtn = document.getElementById('open-settings-btn-more');
 if(moreSettingsBtn) moreSettingsBtn.addEventListener('click', ()=>{ settingsEnteredFromMore = true; showScreen(settingsScreen); });
}catch(e){ console.error('more settings button failed:', e); }

// 기록이 없을 때의 '1분 시작'. 화면을 옮기고 시트를 여는 것까지 홈과 같아야
// 하므로 홈의 버튼을 그대로 누른다 — 여기서 따로 열면 두 벌이 된다.
try{
 const emptyStart = document.getElementById('records-empty-start');
 if(emptyStart) emptyStart.addEventListener('click', ()=>{
 showScreen(startScreen);
 setTimeout(()=> document.getElementById('one-min-start-btn')?.click(), 60);
 });
}catch(e){ console.error('records empty start failed:', e); }

setupBackBtn.addEventListener('click', ()=>{
 // 프로그램 날을 시작해 놓고 설정에서 나가면, 안 한 운동이 나중에 다른
 // 운동 완주로 잘못 세지 않게 대기 상태를 지운다.
 try{ clearPendingProgramDay(); }catch(e){}
 showScreen(startScreen);
});

playBtn.addEventListener('touchstart', ()=> Sound.unlock(), {passive:true});
playBtn.addEventListener('click', ()=>{
 Sound.unlock();
 flash('#ffe600');
 const nick = nicknameInput.value.trim().slice(0, 20);
 if(nick){ myNickname = nick; saveNickname(nick); }
 saveWeightKg(currentWeightKg());
 saveSetupPrefs();
 // 체크를 켜 두었으면 여기서 남긴다. 저장 버튼을 따로 누르게 하면
 // 켜 놓고도 안 눌러서 안 저장되는 일이 생긴다.
 try{
 const saveToggle = document.getElementById('save-routine-toggle');
 if(saveToggle && saveToggle.checked && saveCurrentRoutine()) toast(t(STATIC_UI.routineSaved));
 }catch(e){ console.error('routine save failed:', e); }
 buildMissions();
 showWodPreview(()=>{
 if(warmupToggle && warmupToggle.checked){
 startWarmup();
 } else {
 startCountdown();
 }
 });
});

// 동작 영상 보기. 갤러리·미리보기·일시정지 세 곳에서 부르므로 모듈 수준에 둔다 —
// try 블록 안에 있으면 엄격 모드에서 블록 스코프라 밖에서 못 부른다.
 // ── 국면 재생 ────────────────────────────────────────
 //
 // 한 국면은 0.3~0.5 초짜리 구간이다. <video> 의 loop 속성은 클립 전체만
 // 되돌리므로, 구간 반복은 직접 감시해서 되감아야 한다.
 //
 // timeupdate 로는 안 된다 — 초당 네 번쯤 오는 이벤트라 0.35 초 구간에서는
 // 최대 0.25 초를 지나쳐 버리고, 그러면 다음 국면이 슬쩍 보였다 사라진다.
 // 그래서 매 프레임(rAF) 본다. 라이트박스가 열려 있는 동안만 돈다.
 let phaseWin = null;   // {t0,t1} — null 이면 '전체 재생'
 let phaseRaf = null;

 function stopPhaseLoop(){
  if(phaseRaf){ cancelAnimationFrame(phaseRaf); phaseRaf = null; }
 }
 function startPhaseLoop(video){
  stopPhaseLoop();
  const tick = ()=>{
   if(!phaseWin){ phaseRaf = null; return; }
   // 뒤로도 본다. 사용자가 진행 막대를 끌어 구간 밖으로 나가면
   // 되감지 않는 한 영영 딴 데를 재생하게 된다.
   if(video.currentTime >= phaseWin.t1 || video.currentTime < phaseWin.t0 - 0.08){
    video.currentTime = phaseWin.t0;
   }
   phaseRaf = requestAnimationFrame(tick);
  };
  phaseRaf = requestAnimationFrame(tick);
 }

 /**
  * 국면 하나를 고른다. i < 0 이면 '전체 재생'(예전 동작 그대로).
  *
  * 국면일 때는 0.55 배속으로 튼다. 실제 속도로는 고관절이 언제 접히는지
  * 같은 것이 안 보인다 — 그걸 보려고 구간을 자른 것이므로 느려야 한다.
  */
 function selectPhase(clip, phases, i){
  const video = document.getElementById('video-lightbox-video');
  const label = document.getElementById('video-lightbox-label');
  const body = document.getElementById('phase-body');
  const desc = document.getElementById('video-lightbox-desc');
  const tip = document.getElementById('video-lightbox-tip');
  const risk = document.getElementById('video-lightbox-risk');
  const chips = document.getElementById('phase-chips');
  if(!video) return;

  if(chips){
   chips.querySelectorAll('.phase-chip').forEach((b, n)=>{
    const on = (n - 1) === i;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
   });
  }

  const phase = i >= 0 && phases ? phases[i] : null;
  if(phase){
   phaseWin = { t0: phase.t0, t1: phase.t1 };
   video.loop = false;
   video.playbackRate = 0.55;
   video.currentTime = phase.t0;
   if(label) label.textContent = (i + 1) + '. ' + t(phase.name);
   const formEl = document.getElementById('phase-form');
   const breathEl = document.getElementById('phase-breath');
   if(formEl) formEl.textContent = t(phase.form);
   if(breathEl) breathEl.textContent = t(phase.breath);
   if(body) body.hidden = false;
   // 전체 설명 세 줄은 감춘다. 국면을 읽는 동안에는 그것이 방해다.
   if(desc) desc.hidden = true;
   if(tip) tip.hidden = true;
   if(risk) risk.hidden = true;
   startPhaseLoop(video);
  } else {
   phaseWin = null;
   stopPhaseLoop();
   video.loop = true;
   video.playbackRate = 1;
   video.currentTime = 0;
   if(label) label.textContent = clip.label;
   if(body) body.hidden = true;
   if(desc) desc.hidden = false;
   if(tip) tip.hidden = false;
   if(risk) risk.hidden = false;
  }
  const p = video.play();
  if(p && p.catch) p.catch(()=>{});
 }

 /** 칩 줄을 세운다. 국면 자료가 없는 동작이면 줄 자체를 감춘다. */
 function buildPhaseChips(clip, phases){
  const chips = document.getElementById('phase-chips');
  if(!chips) return;
  chips.innerHTML = '';
  if(!phases || !phases.length){ chips.hidden = true; return; }
  chips.hidden = false;
  const mk = (text, i)=>{
   const b = document.createElement('button');
   b.type = 'button';
   b.className = 'phase-chip';
   b.textContent = text;
   b.setAttribute('aria-pressed', 'false');
   b.addEventListener('click', ()=>{
    try{ selectPhase(clip, phases, i); }catch(e){ console.error('phase select failed:', e); }
   });
   chips.appendChild(b);
  };
  mk(t(STATIC_UI.phaseAll), -1);
  phases.forEach((ph, i)=> mk((i + 1) + '. ' + t(ph.name), i));
 }

 function openVideoLightbox(clip){
 const lightbox = document.getElementById('video-lightbox');
 const video = document.getElementById('video-lightbox-video');
 const desc = document.getElementById('video-lightbox-desc');
 const tip = document.getElementById('video-lightbox-tip');
 const risk = document.getElementById('video-lightbox-risk');
 if(!lightbox || !video) return;
 video.src = clipUrl(clip.file);
 if(desc) desc.textContent = clip.desc;
 if(tip) tip.textContent = clip.tip;
 if(risk) risk.textContent = clip.risk || '';
 const phases = phasesFor(clip.key);
 buildPhaseChips(clip, phases);
 lightbox.classList.add('on');
 // 라벨·본문·재생은 '전체' 를 고른 것과 같다. 한 곳에서만 정하게 두면
 // 여는 길과 칩을 누르는 길이 서로 다른 상태를 만들 수 없다.
 selectPhase(clip, phases, -1);
 lightbox.scrollTop = 0;
 }
 function closeVideoLightbox(){
 const lightbox = document.getElementById('video-lightbox');
 const video = document.getElementById('video-lightbox-video');
 phaseWin = null;
 stopPhaseLoop();
 if(video){ video.pause(); video.playbackRate = 1; video.removeAttribute('src'); video.load(); }
 if(lightbox) lightbox.classList.remove('on');
 }

// 운동 key 로 영상을 찾는다. 없으면 null — 부르는 쪽이 버튼을 안 만들면 된다.
function clipForExercise(key){ return VIDEO_CLIPS.find(c => c.key === key) || null; }

// 일시정지 중에 지금 동작의 영상을 볼 수 있게 한다.
// 영상이 없는 동작에서는 버튼 자체를 감춘다 — 눌러도 아무 일이 없으면 고장으로 읽힌다.
function syncPauseClipBtn(){
 const btn = document.getElementById('pause-clip-btn');
 if(!btn) return;
 const m = missions[missionIndex];
 const clip = m && clipForExercise(m.ex.key);
 btn.hidden = !clip;
 btn.onclick = clip ? (()=> openVideoLightbox(clip)) : null;
}

// 미리보기 자동 진행. 영상을 보는 동안은 멈춰야 해서 밖에서 잡을 수 있게 둔다.
let previewTimer = null;
let previewNext = null;

// 자동 진행은 없앴다(설계 06). '이 순서로 한다' 를 읽으라고 만든 화면인데
// 3.2초 뒤 알아서 넘어가면 읽을 시간을 안 주는 것이다. 시작은 사람이 정한다.
// previewTimer 는 남겨 둔다 — 준비운동 영상 쪽이 아직 이 자리를 쓴다.
function startPreviewTimer(nextFn){
 previewNext = nextFn;
 clearTimeout(previewTimer);
 previewTimer = null;
}

// 영상을 여는 동안 멈춘다. 자동 진행이 없어진 지금은 사실상 아무 일도 안 하지만,
// 부르는 자리(미리보기 행 클릭)를 지워 두면 나중에 자동 진행을 되살릴 때
// 그 자리를 다시 찾아야 한다.
function holdPreview(){
 clearTimeout(previewTimer);
 previewTimer = null;
}

// 미리보기에서 뒤로.
try{
 const previewBackBtn = document.getElementById('preview-back-btn');
 if(previewBackBtn) previewBackBtn.addEventListener('click', ()=>{
 holdPreview();
 previewNext = null;
 showScreen(setupScreen);
 });
}catch(e){ console.error('preview back button failed:', e); }

// 미리보기의 '시작'.
try{
 const previewStartBtn = document.getElementById('preview-start-btn');
 if(previewStartBtn) previewStartBtn.addEventListener('click', ()=>{
 if(previewNext) previewNext();
 });
}catch(e){ console.error('preview start button failed:', e); }

function showWodPreview(nextFn){
 try{
 // 머리 오른쪽의 예상 소요, 그리고 준비운동이 먼저 붙는지.
 const totalEl = document.getElementById('preview-total');
 if(totalEl){
 const secs = missions.reduce((s, m)=> s + m.duration, 0);
 totalEl.textContent = t(STATIC_UI.aboutMinutes).replace('%s', Math.max(1, Math.round(secs / 60)));
 }
 const warmCard = document.getElementById('preview-warm');
 if(warmCard) warmCard.style.display = (warmupToggle && warmupToggle.checked) ? '' : 'none';

 const list = document.getElementById('wod-preview-list');
 if(list){
 disposeClipThumbs(list);
 list.innerHTML = '';
 missions.forEach((m, i)=>{
 const clip = clipForExercise(m.ex.key);
 // 영상이 있는 동작만 누를 수 있게 한다. 없는데 눌리면 아무 일도 안 일어나서
 // 고장으로 읽힌다.
 const item = document.createElement(clip ? 'button' : 'div');
 item.className = 'wod-preview-item card' + (m.isBoss ? ' boss' : '') + (clip ? ' has-clip' : '');
 item.style.animationDelay = (i * 0.04) + 's';

 const hold = m.ex.type === 'hold';
 item.innerHTML =
 '<span class="wpi-num">' + (i+1) + '</span>' +
 '<span class="wpi-shot"></span>' +
 '<span class="wpi-main">' +
   '<span class="wpi-name">' + t(m.ex.label) + (m.isBoss ? t({ko:' (보스)', en:' (BOSS)', zh:'（BOSS）'}) : '') + '</span>' +
   '<span class="wpi-meta dim">' + m.duration + t(STATIC_UI.secUnit) +
     ' · ' + t(m.ex.cue) + '</span>' +
 '</span>' +
 '<span class="wpi-tag' + (hold ? ' hold' : '') + '">' + t(hold ? STATIC_UI.kindHold : STATIC_UI.kindReps) + '</span>' +
 (clip ? '<span class="wpi-play" aria-hidden="true"></span>' : '');
 // 이 줄의 작은 화면도 영상이다. '이 순서로 한다' 를 읽는 자리라
 // 각 줄이 무슨 동작인지까지 같이 알려 줘야 순서가 뜻을 갖는다.
 const shot = item.querySelector('.wpi-shot');
 const thumb = clipThumb(m.ex.key);
 if(shot && thumb) shot.appendChild(thumb);
 if(clip){
 item.type = 'button';
 item.setAttribute('aria-label', t(m.ex.label) + ' ' + t(STATIC_UI.watchClip));
 item.addEventListener('click', ()=>{
 // 영상을 여는 순간 자동 진행을 멈춘다. 안 그러면 보는 도중에 운동이 시작된다.
 holdPreview();
 openVideoLightbox(clip);
 });
 }
 list.appendChild(item);
 });
 }
 showScreen(wodPreviewScreen);
 startPreviewTimer(nextFn);
 }catch(e){
 console.error('showWodPreview failed:', e);
 nextFn();
 }
}
function startWarmup(){
 try{
 showScreen(warmupScreen);
 const errEl = document.getElementById('warmup-video-error');
 if(errEl) errEl.style.display = 'none';
 if(warmupVideo){
 warmupVideo.style.display = '';
 // preload="none" 이라 여기서 처음 받는다. 준비운동을 건너뛰는 사람은
 // 8.6MB 를 아예 안 받게 된다 — 예전에는 화면을 열기만 해도 받았다.
 if(warmupVideo.readyState === 0) warmupVideo.load();
 warmupVideo.currentTime = 0;
 const p = warmupVideo.play();
 if(p && p.catch){
 p.catch((err)=>{
 // 재생 정책 거부(NotAllowedError)와 파일을 못 받은 것은 다른 일이다.
 // 예전에는 둘 다 '영상을 불러오지 못했어요' 로 나와 원인을 감췄다.
 // 재생 정책 거부(NotAllowedError)와 파일을 못 받은 것은 다른 일이다.
 // 예전에는 둘 다 '영상을 불러오지 못했어요' 로 나와 원인을 감췄다.
 const blocked = err && err.name === 'NotAllowedError';
 console.error('warmup video play() rejected:', err);
 if(errEl){
 errEl.textContent = blocked
 ? '화면을 한 번 눌러 주시면 준비운동이 시작됩니다.'
 : '준비운동 영상을 불러오지 못했습니다. 건너뛰고 시작해도 됩니다.';
 errEl.style.display = 'block';
 }
 if(blocked){
 // 소리를 끄지 않는다 — 준비운동 안내가 소리로 나오기 때문이다.
 // 대신 한 번 누르면 그 제스처로 재생한다.
 const retry = ()=>{
 warmupVideo.play().then(()=>{ if(errEl) errEl.style.display = 'none'; }).catch(()=>{});
 };
 warmupScreen.addEventListener('click', retry, { once: true });
 } else if(warmupVideo){
 warmupVideo.style.display = 'none';
 }
 });
 }
 }
 }catch(e){
 console.error('warm-up video failed to start:', e);
 startCountdown();
 }
}

function finishWarmup(){
 try{ if(warmupVideo) warmupVideo.pause(); }catch(e){}
 warmupCompletedThisSession = true;
 startCountdown();
}

try{
 if(warmupVideo) warmupVideo.addEventListener('ended', finishWarmup);
 if(warmupVideo){
 warmupVideo.addEventListener('error', ()=>{
 console.error('warmup video failed to load (check that warmup.mp4 is in the same folder as index.html)');
 const errEl = document.getElementById('warmup-video-error');
 if(errEl) errEl.style.display = 'block';
 warmupVideo.style.display = 'none';
 });
 }
 if(warmupSkipBtn) warmupSkipBtn.addEventListener('click', finishWarmup);
}catch(e){ console.error('warm-up video listeners failed:', e); }

function shuffleArr(arr){
 const a = arr.slice();
 for(let i=a.length-1;i>0;i--){
 const j = Math.floor(Math.random()*(i+1));
 [a[i],a[j]] = [a[j],a[i]];
 }
 return a;
}

function buildMissions(){
 warmupCompletedThisSession = false;
 const pool = EXERCISES.filter(e=> selectedExKeys.has(e.key));
 missions = [];

 const missionCount = regularSetCount();
 let sequence;
 if(pool.length <= missionCount){
 sequence = shuffleArr(pool);
 while(sequence.length < missionCount){
 sequence.push(pool[Math.floor(Math.random()*pool.length)]);
 }
 sequence = shuffleArr(sequence);
 } else {
 sequence = shuffleArr(pool).slice(0, missionCount);
 }

 const preset = getDurationPreset();
 let dur = preset.base + Math.floor(Math.random()*preset.range);
 for(let i=0;i<missionCount;i++){
 missions.push({ ex: sequence[i], duration: Math.round(dur), isBoss:false });
 dur *= 1.1; // 세트마다 1.1배씩 증가
 }

 // boss mission: continues the same progression, hardest version of a random pool exercise
 const bossEx = pool[Math.floor(Math.random()*pool.length)];
 missions.push({ ex:bossEx, duration: Math.round(dur), isBoss:true });

 midRestIndex = Math.min(Math.floor(missions.length/2), missions.length - 2);
 midRestGiven = false;

 // ---------- 깜짝 보너스 라운드 (재미 요소) ----------
 // ~60% chance one random non-boss set becomes a "bonus round" worth
 // double XP — an unpredictable little treat, not something you can
 // plan around, which is what makes it feel fun rather than routine.
 bonusMissionIndex = -1;
 bonusXpEarned = 0;
 if(missions.length > 2 && Math.random() < 0.6){
 bonusMissionIndex = Math.floor(Math.random() * (missions.length - 1)); // exclude boss (last index)
 missions[bonusMissionIndex].isBonus = true;
 }
}

function vibrate(pattern){
 if(!vibrationEnabled) return;
 try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}
// 카운트다운이 도는 동안의 타이머. 취소가 이걸 꺼야 한다 —
// 안 끄면 화면만 돌아가고 3초 뒤에 운동이 혼자 시작된다.
let countdownIv = null;
function stopCountdown(){
 clearInterval(countdownIv);
 countdownIv = null;
}
function startCountdown(){
 wodStartTimestamp = Date.now();
 showScreen(countdownScreen);
 // 무엇을 준비해야 하는지 이름을 얹는다. 숫자만 있으면 3초 동안
 // 무엇을 할지 모른 채로 서 있게 된다.
 const nextEl = document.getElementById('countdown-next');
 if(nextEl){
 const first = missions[0];
 nextEl.textContent = first ? t(STATIC_UI.firstMove) + ' · ' + t(first.ex.label) : '';
 }
 stopCountdown();
 let n = 3;
 countdownNum.textContent = n;
 restartAnim(countdownNum);
 Sound.countBeep(3);
 vibrate(40);
 countdownIv = setInterval(()=>{
 n--;
 if(n <= 0){
 stopCountdown();
 Sound.countBeep(0);
 vibrate([0,60,40,90]);
 startGame();
 return;
 }
 countdownNum.textContent = n;
 restartAnim(countdownNum);
 Sound.countBeep(n);
 vibrate(40);
 }, 650);
}
try{
 const cdCancel = document.getElementById('countdown-cancel-btn');
 if(cdCancel) cdCancel.addEventListener('click', ()=>{
 stopCountdown();
 showScreen(wodPreviewScreen);
 // 미리보기로 돌아오면 자동 진행이 다시 돌지 않게 '지금 시작' 을 띄운다.
 holdPreview();
 });
}catch(e){ console.error('countdown cancel failed:', e); }
// 애니메이션을 다시 트는 법. 이름을 지웠다가 되붙이면 브라우저가 처음부터 튼다.
//
// 예전에는 여기서 'pop' 을 걸었는데 그 키프레임은 translate(-50%,-50%) 를
// 품고 있다 — 화면 한가운데에 절대배치된 CLEAR 배너용이다. 흐름 안에 있는
// 카운트다운 숫자에 걸면 자기 크기의 절반만큼 왼쪽 위로 밀려서, 위에 있는
// 동작 이름을 덮는다. 숫자에 글자 크기가 없던 동안에는 안 보였을 뿐이다.
function restartAnim(el, name = 'countPop'){
 el.style.animation = 'none';
 void el.offsetWidth;
 el.style.animation = name + ' 0.4s var(--ease-pop)';
}

// ---------- GAME ----------
function startGame(){
 score = 0; streak = 0; missionIndex = 0;
 scoreVal.textContent = '0';
 showScreen(gameScreen);
 if(app) app.classList.add('workout-mode');
 Sound.unlock(); // re-attempt right before playback — some mobile browsers
 // re-suspend the audio context if enough async time
 // (preview screen, countdown) passed since the last unlock
 runMission();
}

function runMission(){
 if(missionIndex >= missions.length){ finishGame(); return; }
 const m = missions[missionIndex];
 missionActive = true;

 missionCountEl.textContent = String(missionIndex+1);
 if(missionTotalEl) missionTotalEl.textContent = '/ ' + missions.length;
 Sound.restartBGMForSet(missionIndex); // a slightly different tune each set
 const wodSideFill = document.getElementById('wod-side-fill');
 const wodSideBadge = document.getElementById('wod-side-badge');
 const wodPct = Math.round((missionIndex / missions.length) * 100);
 if(wodSideFill) wodSideFill.style.height = wodPct + '%';
 if(wodSideBadge) wodSideBadge.style.bottom = wodPct + '%';
 gameScreen.classList.toggle('boss', m.isBoss);
 bossBanner.classList.toggle('on', m.isBoss);
 if(bonusBanner) bonusBanner.classList.toggle('on', !!m.isBonus);
 Sound.setBGMIntensity(m.isBoss);
 if(m.isBoss){ setCoachLine(selectedCoach.bossIntro); Sound.bossHit(); }
 else { setCoachLine(pickVariant(t(selectedCoach.start))); }
 if(m.isBonus && !m.isBoss){ Sound.fanfare(); }

 stopRest();
 stopRestTouch();
 startPhotoDemo(m.ex.key);
 exName.textContent = t(m.ex.label) + (m.isBoss ? t({ko:' (보스)', en:' (BOSS)', zh:'（BOSS）'}) : '');
 // 버티는 동작(플랭크)은 링, 나머지는 큰 숫자. 둘 다 남은 초를 말한다 —
 // 링을 쓰는 이유는 '유지한다'가 모양으로 읽히기 때문이다.
 const isHold = m.ex.type === 'hold';
 if(exTarget) exTarget.style.display = isHold ? 'none' : '';
 if(holdRing) holdRing.style.display = isHold ? '' : 'none';
 exCue.textContent = t(m.ex.cue);
 if(exWarn) exWarn.textContent = m.ex.tip ? (t({ko:'주의 · ', en:'Careful · ', zh:'注意 · '}) + t(m.ex.tip)) : '';
 clearBanner.style.opacity = '0';
 // show what's coming up next continuously through the whole set,
 // instead of only flashing on for the last 3 seconds
 const upcomingNext = missions[missionIndex + 1];
 if(upcomingNext){
 nextPreview.textContent = t({ko:'다음 · ', en:'Next · ', zh:'下一个 · '}) + t(upcomingNext.ex.label);
 } else {
 nextPreview.textContent = t({ko:'마지막 세트!', en:'Final set!', zh:'最后一组！'});
 }
 nextPreview.classList.add('on');
 speakExercise(t(m.ex.label), t(m.ex.cue));

 // speak the caution tip partway through the set — a reminder mid-exercise
 // rather than front-loading everything into one long announcement
 if(tipTimeout){ clearTimeout(tipTimeout); tipTimeout = null; }
 if(m.ex.tip && m.duration >= 6){
 const tipDelayMs = Math.max(2500, Math.round(m.duration * 1000 * 0.45));
 tipTimeout = setTimeout(()=>{
 if(missionActive) speakTip(t(m.ex.tip));
 }, tipDelayMs);
 }

 // motivational voice line during the quiet stretch later in a longer
 // set — timed after the tip so the two never overlap, and only every
 // other set so it doesn't get repetitive
 if(motivationTimeout){ clearTimeout(motivationTimeout); motivationTimeout = null; }
 if(m.duration >= 9 && missionIndex % 2 === 0){
 const motivationDelayMs = Math.max(5000, Math.round(m.duration * 1000 * 0.75));
 motivationTimeout = setTimeout(()=>{
 if(missionActive) speakMotivation();
 }, motivationDelayMs);
 }

 syncEasySwapBtn(m);
 runTimer(m);
}

// ---------- 쉬운 동작 전환 ----------
//
// 힘들면 이 세트만 더 쉬운 동작으로 바꾼다. 보스 라운드는 빼고(난이도가
// 곧 그 라운드의 뜻이다), 매핑이 없는 동작(이미 쉬운 축)에는 버튼 자체를
// 감춘다. src/ 개편 때 통째로 빠졌다가 그 대상 동작 12종과 같이 되살렸다
// (2026-09-08, 옛 빌드 번들에서 그대로 옮김).
const EASY_ALT = {
 DIAMONDPUSHUP:'PUSHUP', WIDEPUSHUP:'PUSHUP', PIKEPUSHUP:'PUSHUP',
 HIGHPLANK:'PLANK', ARMYCRAWL:'PLANK',
 JUMPSQUAT:'SQUAT', COSSACKSQUAT:'SQUAT', BURPEE:'SQUAT', LUNGE:'SQUAT',
 LEGRAISE:'CRUNCH', VUP:'CRUNCH', DEADBUG:'CRUNCH',
 PLANKPUSHUP:'PUSHUP', MOUNTAINCLIMBER:'RUNINPLACE', ARMWALK:'PLANKPUSHUP', REVERSEPLANK:'PLANK',
};

function syncEasySwapBtn(m){
 if(!easySwapBtn) return;
 if(!m || m.isBoss || !missionActive){ easySwapBtn.style.display = 'none'; return; }
 if(m.easySwapOriginalKey){
 easySwapBtn.style.display = '';
 easySwapBtn.textContent = t(STATIC_UI.easySwapBackLabel);
 } else if(EASY_ALT[m.ex.key]){
 easySwapBtn.style.display = '';
 easySwapBtn.textContent = t(STATIC_UI.easySwapBtnLabel);
 } else {
 easySwapBtn.style.display = 'none';
 }
}

// runMission 의 화면 갱신 부분과 같은 자리를 건드린다 — 시간·진행률은
// 그대로 두고 지금 뭘 하는지만 바꾼다.
function applyMissionExercise(m, newEx, coachText){
 m.ex = newEx;
 startPhotoDemo(m.ex.key);
 exName.textContent = t(m.ex.label) + (m.isBoss ? t({ko:' (보스)', en:' (BOSS)', zh:'（BOSS）'}) : '');
 const isHold = m.ex.type === 'hold';
 if(exTarget) exTarget.style.display = isHold ? 'none' : '';
 if(holdRing) holdRing.style.display = isHold ? '' : 'none';
 exCue.textContent = t(m.ex.cue);
 if(exWarn) exWarn.textContent = m.ex.tip ? (t({ko:'주의 · ', en:'Careful · ', zh:'注意 · '}) + t(m.ex.tip)) : '';
 setCoachLine(coachText);
 syncEasySwapBtn(m);
}

function swapToEasier(){
 if(!missionActive) return;
 const m = missions[missionIndex];
 if(!m || m.isBoss) return;
 const altKey = EASY_ALT[m.ex.key];
 if(!altKey) return;
 const alt = EXERCISES.find(e=> e.key === altKey);
 if(!alt) return;
 m.easySwapOriginalKey = m.ex.key;
 applyMissionExercise(m, alt, {ko:'좋아요, 이걸로 가봐요! 💪', en:"Good call — let's do this one! 💪", zh:'好的，就选这个吧！💪'});
}

function revertEasySwap(){
 if(!missionActive) return;
 const m = missions[missionIndex];
 if(!m || !m.easySwapOriginalKey) return;
 const original = EXERCISES.find(e=> e.key === m.easySwapOriginalKey);
 m.easySwapOriginalKey = null;
 if(original) applyMissionExercise(m, original, {ko:'좋아요, 다시 도전해봐요! 🔥', en:"Alright, let's take it on again! 🔥", zh:'好的，再挑战一次吧！🔥'});
}

try{
 easySwapBtn?.addEventListener('click', ()=>{
 Sound.unlock();
 const m = missions[missionIndex];
 if(m && m.easySwapOriginalKey) revertEasySwap(); else swapToEasier();
 });
}catch(e){ console.error('easy swap button setup failed:', e); }

function setCoachLine(text){
 if(coachEmoji) coachEmoji.textContent = selectedCoach.emoji;
 if(coachLine) coachLine.textContent = t(text);
}

let lastVariant = null;
function pickVariant(list){
 if(!Array.isArray(list)) return list;
 if(list.length === 1) return list[0];
 let choice;
 do{ choice = list[Math.floor(Math.random()*list.length)]; } while(choice === lastVariant);
 lastVariant = choice;
 return choice;
}

function runTimer(m){
 // viewBox 120 에 r=54. 여기 숫자가 CSS 와 어긋나면 링이 절반만 차거나 넘친다.
 const r = 54, circumference = 2*Math.PI*r;
 holdRingProg.style.strokeDasharray = circumference;
 holdRingProg.style.strokeDashoffset = 0;
 showRemain(m.duration);
 missionTimebarFill.style.width = '100%';

 let elapsed = 0;
 clearInterval(missionInterval);
 missionInterval = setInterval(()=>{
 if(!missionActive || isPaused) return;
 elapsed++;
 const remain = m.duration - elapsed;
 showRemain(remain);
 const pct = Math.min(1, elapsed / m.duration);
 holdRingProg.style.strokeDashoffset = circumference * pct;
 missionTimebarFill.style.width = ((1-pct) * 100) + '%';
 if(remain === 3){ Sound.chaseThump(); }
 Sound.holdTick();

 if(remain === 1) setCoachLine(selectedCoach.last);
 else if(remain === Math.ceil(m.duration/2)) setCoachLine(selectedCoach.push);

 if(remain > 0 && remain <= 3){
 Sound.countBeep(remain);
 }

 if(elapsed >= m.duration){
 clearInterval(missionInterval);
 completeMission(m);
 }
 }, 1000);
}

const REST_DURATION = 11; // seconds between missions

function skipMission(){
 if(!missionActive) return;
 missionActive = false;
 clearInterval(missionInterval);
 missionIndex++;
 if(missionIndex >= missions.length){
 finishGame();
 } else if(missionIndex === midRestIndex && !midRestGiven){
 midRestGiven = true;
 runRest();
 } else {
 runMission();
 }
}

function completeMission(m){
 if(!missionActive) return;
 missionActive = false;
 streak++;

 score += 10;
 scoreVal.textContent = score;

 Sound.clear();
 setCoachLine(pickVariant(t(selectedCoach.clear)));
 const comboSuffix = (!m.isBoss && streak > 0 && streak % 3 === 0) ? (' COMBO x' + streak) : '';
 const bonusSuffix = m.isBonus ? ' +10 XP!' : '';
 clearBanner.textContent = (m.isBoss ? 'BOSS CLEAR!' : 'CLEAR!') + comboSuffix + bonusSuffix;
 if(m.isBonus){ bonusXpEarned += 10; }
 clearBanner.style.transition = 'none';
 clearBanner.style.opacity = '1';
 requestAnimationFrame(()=>{
 clearBanner.style.transition = 'opacity 0.6s ease';
 clearBanner.style.opacity = '0';
 });
 flash(m.isBoss ? 'rgba(255,80,40,0.5)' : '#fff');

 // brief ~1s beat showing what's coming up next — skipped when a rest
 // break is next, since a "next: rest" preview right before the actual
 // rest screen doesn't add anything
 stopPhotoDemo();
 stopRest();
 stopRestTouch();
 exTarget.style.display = 'none';
 const upcoming = missions[missionIndex + 1];
 const upcomingIsRest = (missionIndex + 1) === midRestIndex && !midRestGiven;
 if(!upcomingIsRest){
 if(upcoming){
 exName.textContent = t({ko:'다음: ', en:'Next: ', zh:'下一个：'}) + t(upcoming.ex.label);
 exCue.textContent = t(upcoming.ex.cue);
 } else {
 exName.textContent = t({ko:'마무리!', en:'Almost done!', zh:'收尾！'});
 exCue.textContent = '';
 }
 }

 setTimeout(()=>{
 missionIndex++;
 if(missionIndex >= missions.length){
 finishGame();
 } else if(missionIndex === midRestIndex && !midRestGiven){
 midRestGiven = true;
 runRest();
 } else {
 runMission();
 }
 }, 1000); // ~1s breather beat before the next exercise loads
}

function runRest(){
 bossBanner.classList.remove('on');
 gameScreen.classList.remove('boss');
 stopPhotoDemo();
 exName.textContent = t({ko:'휴식', en:'Rest', zh:'休息'});
 // 남은 초는 호흡 원 안에 하나만 둔다. 예전에는 큰 숫자와 링이 자리를
 // 나눠 갖고 있었는데, 링은 앞 동작이 버티기였을 때만 보이는 상태였다 —
 // 반복 동작 뒤에 쉬면 남은 초가 아예 안 보였다.
 exTarget.style.display = 'none';
 if(holdRing) holdRing.style.display = 'none';
 exCue.textContent = t({ko:'숨 고르기', en:'Catch your breath', zh:'调整呼吸'});
 setCoachLine(t({ko:'잠깐 숨 고르고 가자', en:'Take a quick breather', zh:'先喘口气'}));

 if(restNum) restNum.textContent = String(REST_DURATION);
 if(restWrap) restWrap.style.display = '';
 if(restGo) restGo.hidden = true;
 if(restNum) restNum.hidden = false;
 startRestTouch();

 let elapsed = 0;
 clearInterval(missionInterval);
 missionInterval = setInterval(()=>{
 elapsed++;
 const remain = REST_DURATION - elapsed;
 if(restNum) restNum.textContent = String(Math.max(0, remain));
 Sound.holdTick();
 if(elapsed >= REST_DURATION){
 clearInterval(missionInterval);
 // 여기서 바로 다음 세트를 시작하지 않는다. 누를 때까지 기다린다.
 // 인증 카드도 같이 접는다 — div 라 waitForTapToResume 의 button 예외에
 // 안 걸려서, 그대로 두면 번개를 짧게 눌렀다 뗀 것도 "화면 눌러 재개"로
 // 잡혀 세트가 먼저 넘어간다.
 stopRestTouch();
 waitForTapToResume();
 }
 }, 1000);
}

// ---------- AD TIMING (usage counter only — no real ad network wired up) ----------
// This tracks how many completed sessions the user has had, so that when
// an actual ad SDK (AdMob, etc.) is added later, it's easy to gate ad
// display behind "after workout" + "every 5th use" rules instead of
// showing ads immediately on open.
function checkAndMaybeShowAd(){
 let usageCount = 0;
 try{
 usageCount = parseInt(localStorage.getItem('wodrush_usage_count') || '0', 10) + 1;
 localStorage.setItem('wodrush_usage_count', String(usageCount));
 }catch(e){}
 if(usageCount % 5 === 0){
 // Placeholder hook: this is where a rewarded/interstitial ad call
 // would go once a real ad network SDK is integrated. Left as a
 // no-op for now — never shows anything fake to the user.
 console.log('[ad-timing] usage #' + usageCount + ' — would trigger ad here once a real network is connected');
 }
}

function finishGame(){
 const xpBeforeThisSession = myProfile.xp || 0;
 if(tipTimeout){ clearTimeout(tipTimeout); tipTimeout = null; }
 if(motivationTimeout){ clearTimeout(motivationTimeout); motivationTimeout = null; }
 gameScreen.classList.remove('boss');
 bossBanner.classList.remove('on');
 if(app) app.classList.remove('workout-mode');
 Sound.stopBGM();
 stopPhotoDemo();
 stopRest();
 stopRestTouch();
 Sound.fanfare();

 finalSub.textContent = t({ko:missions.length + '개 미션 완주', en:missions.length + ' missions completed', zh:'完成' + missions.length + '个动作'}) + ' · +20 XP';
 if(resultCoachEmoji) resultCoachEmoji.textContent = selectedCoach.emoji;
 if(resultCoachLine) resultCoachLine.textContent = t(selectedCoach.finish);

 // ---------- workout time + estimated calories ----------
 // Calorie estimate uses the standard formula
 // kcal = MET * 3.5 * weight(kg) / 200 * minutes, with a MET value per
 // exercise (from the Compendium of Physical Activities) instead of one
 // flat rate for everything, plus a light resting MET during the
 // mid-workout break. On top of that:
 // - warm-up minutes (if done) are added at a light MET, since that's
 // real activity time we weren't counting at all before
 // - the actual wall-clock time of the session (countdown + the short
 // gaps between sets while getting into position) is counted too, at
 // a light "transition" MET — not just the pure hold/rep seconds
 // - a modest EPOC/afterburn bonus is added for the exercise portion —
 // short, high-intensity circuits like this keep burning extra
 // calories for a while after you stop, which a plain "MET × minutes"
 // number ignores entirely
 // Still an estimate — actual burn varies by effort, body composition,
 // etc. — and a session this short (by design — "1분이면 끝") will
 // always land in a modest kcal range no matter how it's calculated;
 // that's real exercise physiology, not the app under-counting.
 const exerciseSeconds = missions.reduce((sum, m) => sum + m.duration, 0);
 const restSeconds = midRestGiven ? REST_DURATION : 0;
 const warmupSeconds = warmupCompletedThisSession ? 60 : 0;
 const wallClockSeconds = wodStartTimestamp ? Math.max(0, (Date.now() - wodStartTimestamp) / 1000) : exerciseSeconds + restSeconds;
 const transitionSeconds = Math.max(0, wallClockSeconds - exerciseSeconds - restSeconds);
 const totalSeconds = wallClockSeconds + warmupSeconds;
 const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
 const weightKg = currentWeightKg();
 const REST_MET = 1.3;
 const WARMUP_MET = 3.5;
 const TRANSITION_MET = 3.0; // light movement/positioning between sets — still real activity
 const EPOC_BONUS = 1.2; // ~20% afterburn bonus for high-intensity short circuits
 const exerciseKcal = missions.reduce((sum, m) => {
 const met = (m.ex && m.ex.met) || 6.0;
 return sum + met * 3.5 * weightKg / 200 * (m.duration / 60);
 }, 0) * EPOC_BONUS;
 const restKcal = REST_MET * 3.5 * weightKg / 200 * (restSeconds / 60);
 const warmupKcal = WARMUP_MET * 3.5 * weightKg / 200 * (warmupSeconds / 60);
 const transitionKcal = TRANSITION_MET * 3.5 * weightKg / 200 * (transitionSeconds / 60);
 const calories = Math.max(1, Math.round(exerciseKcal + restKcal + warmupKcal + transitionKcal));
 const timeVal = document.getElementById('result-time-val');
 const calVal = document.getElementById('result-cal-val');
 const timeLabel = document.getElementById('result-time-label');
 const calLabel = document.getElementById('result-cal-label');
 if(timeVal) timeVal.textContent = t({ko:totalMinutes + '분', en:totalMinutes + ' min', zh:totalMinutes + '分钟'});
 if(calVal) calVal.textContent = calories + 'kcal';
 if(timeLabel) timeLabel.textContent = t({ko:'운동시간', en:'Time', zh:'训练时长'});
 if(calLabel) calLabel.textContent = t({ko:'칼로리 (추정)', en:'Calories (est.)', zh:'消耗（估算）'});

 // 축하 줄의 날짜. '완료' 만 있으면 나중에 기록에서 다시 볼 때
 // 이게 언제 것인지 알 수 없다.
 // 이 화면의 큰 숫자. 0에서 값까지 세어 올린다 — 도착한 숫자만 툭 나오면
 // '얼마나 올랐나' 가 안 읽힌다. aria-label 로 최종값을 먼저 알려 두어
 // 스크린리더가 올라가는 숫자를 스무 번 읽지 않게 한다.
 const scoreEl = document.getElementById('result-score');
 if(scoreEl){
 scoreEl.setAttribute('aria-label', t(STATIC_UI.scorePoints).replace('%s', score));
 const target = score;
 const t0 = performance.now();
 const tick = (now)=>{
  const p = Math.min(1, (now - t0) / 400);
  scoreEl.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
  if(p < 1) requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
 }

 const checkEl = document.querySelector('.result-check');
 if(checkEl){
 const d = new Date();
 checkEl.textContent = t(STATIC_UI.doneLabel) + ' · ' + t({
  ko: (d.getMonth()+1) + '월 ' + d.getDate() + '일',
  en: d.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
  zh: (d.getMonth()+1) + '月' + d.getDate() + '日'});
 }

 showScreen(resultScreen);
 fireConfetti();
 try{ checkAndMaybeShowAd(); }catch(e){}
 const prevBest = myProfile.bestStreakEver || 0;
 myProfile.totalWorkoutSeconds = (myProfile.totalWorkoutSeconds || 0) + totalSeconds;
 myProfile.totalCalories = (myProfile.totalCalories || 0) + calories;
 const isWeekendToday = [0,6].includes(new Date().getDay());
 const baseXp = 20;
 const weekendBonusXp = isWeekendToday ? baseXp : 0; // 주말 한정: 기본 XP 2배
 myProfile.xp = (myProfile.xp || 0) + baseXp + weekendBonusXp;
 if(bonusXpEarned > 0){ myProfile.xp += bonusXpEarned; }

 let bonusMsg = weekendBonusXp > 0
 ? t({ko:' · 주말 2배 XP!', en:' · Weekend 2x XP!', zh:' · 周末双倍XP！'})
 : '';
 if(bonusXpEarned > 0){
 bonusMsg += t({ko:' · 보너스 라운드 +' + bonusXpEarned + ' XP!', en:' · Bonus round +' + bonusXpEarned + ' XP!', zh:' · 奖励回合 +' + bonusXpEarned + ' XP！'});
 }
 if(bonusMsg) finalSub.textContent = finalSub.textContent + bonusMsg;

 // ---------- XP gauge fill-up (도파민 피드백 연출) ----------
 try{
 const xpGainedTotal = (myProfile.xp || 0) - xpBeforeThisSession;
 const leveledUp = xpLevel(myProfile.xp) > xpLevel(xpBeforeThisSession);
 const lvEl = document.getElementById('result-xp-level');
 const gainEl = document.getElementById('result-xp-gain');
 const fillEl = document.getElementById('result-xp-fill');
 if(lvEl) lvEl.textContent = 'Lv.' + xpLevel(myProfile.xp) + (leveledUp ? '' : '');
 if(gainEl) gainEl.textContent = '+' + xpGainedTotal + ' XP';
 if(fillEl){
 fillEl.style.width = '0%';
 setTimeout(()=>{ fillEl.style.width = xpIntoLevel(myProfile.xp) + '%'; }, 150);
 }
 }catch(e){ console.error('result xp gauge failed:', e); }

 checkAchievements();
 recordCompletion();
 try{ advanceProgramProgress(); }catch(e){ console.error('advanceProgramProgress failed:', e); }

 // ---------- personalized recovery tip (workout → recovery synergy) ----------
 // Look at which exercises were actually in today's WOD and surface the
 // single most relevant body-part care tip, linking straight into the
 // recovery screen's search (pre-filled) instead of a generic message.
 try{
 const EX_TO_BODYPART = {
 SQUAT:'무릎', LUNGE:'무릎', JUMPSQUAT:'무릎', RUNINPLACE:'발목',
 BURPEE:'손목', PUSHUP:'손목', PIKEPUSHUP:'어깨', ARMYCRAWL:'손목',
 PLANK:'허리', LEGRAISE:'허리', CRUNCH:'목', HIPBRIDGE:'허리',
 };
 const BODYPART_TIP = {
 '목':'목을 과도하게 젖히거나 당기지 않았는지 확인해보십시오.',
 '어깨':'어깨가 으쓱 올라가지 않았는지, 팔꿈치 각도는 적당했는지 확인해보십시오.',
 '손목':'손목이 과도하게 꺾인 채로 체중을 지탱하지 않았는지 확인해보십시오.',
 '허리':'허리가 뜨거나 과하게 꺾이지 않았는지, 코어에 힘이 들어갔는지 확인해보십시오.',
 '무릎':'무릎이 발끝 방향을 잘 유지했는지, 착지 충격은 잘 흡수했는지 확인해보십시오.',
 '발목':'착지할 때 발목이 옆으로 꺾이지 않았는지 확인해보십시오.',
 };
 const tally = {};
 missions.forEach(m=>{
 const part = EX_TO_BODYPART[m.ex.key];
 if(part) tally[part] = (tally[part] || 0) + 1;
 });
 let topPart = null, topCount = 0;
 Object.keys(tally).forEach(part=>{
 if(tally[part] > topCount){ topPart = part; topCount = tally[part]; }
 });

 // ---------- 오늘의 운동 페르소나 (재미 요소) ----------
 // A playful, shareable title based on what today's WOD leaned toward —
 // purely for fun/personality, not a stat that affects anything.
 const PERSONA_BY_PART = {
 '무릎': { title:'레그데이 챔피언', icon:'' },
 '발목': { title:'러닝 스페셜리스트', icon:'' },
 '손목': { title:'상체 마스터', icon:'' },
 '어깨': { title:'숄더 킹', icon:'' },
 '허리': { title:'기본에 충실', icon:'' },
 '목': { title:'초콜릿복근', icon:'' },
 };
 const personaEl = document.getElementById('persona-badge');
 if(personaEl){
 // spread-out tally (no single part clearly dominant) → balance persona
 const distinctParts = Object.keys(tally).length;
 const isBalanced = !topPart || distinctParts >= 3 || (topCount / missions.length) < 0.4;
 const persona = isBalanced
 ? { title:'올라운더', icon:'' }
 : (PERSONA_BY_PART[topPart] || { title:'올라운더', icon:'' });
 personaEl.style.display = 'inline-flex';
 personaEl.textContent = persona.icon + ' 오늘의 당신: ' + persona.title;
 }

 const tipEl = document.getElementById('result-recovery-tip');
 if(tipEl && topPart){
 tipEl.style.display = 'block';
 tipEl.innerHTML = '오늘은 <b>' + topPart + '</b> 위주 운동이었습니다 — ' + (BODYPART_TIP[topPart] || '') + ' <u>회복 가이드에서 자세히 보기 →</u>';
 tipEl.onclick = ()=>{
 showScreen(recoveryScreen);
 const injuryInput = document.getElementById('injury-search-input');
 if(injuryInput){
 injuryInput.value = topPart;
 injuryInput.dispatchEvent(new Event('input'));
 const anchor = document.getElementById('injury-section-anchor');
 if(anchor) anchor.scrollIntoView({ behavior:'smooth', block:'start' });
 }
 };
 } else if(tipEl){
 tipEl.style.display = 'none';
 }
 }catch(e){ console.error('result recovery tip failed:', e); }

 // ---------- 신기록(PR) 감지 — 짐워크의 "PR 달성 알림"에서 착안 ----------
 // 스트릭뿐 아니라 칼로리·점수도 자기 최고 기록을 추적해서, 뭔가 하나라도
 // 경신하면 결과화면에 눈에 띄는 뱃지로 보여줌
 const prevBestCalories = myProfile.bestCaloriesEver || 0;
 const prevBestScore = myProfile.bestScoreEver || 0;
 const lastSessionCalories = myProfile.lastSessionCalories || 0;
 myProfile.bestCaloriesEver = Math.max(prevBestCalories, calories);
 myProfile.bestScoreEver = Math.max(prevBestScore, score);
 myProfile.lastSessionCalories = calories;
 saveProfile();

 // ---------- 지난 세션 대비 비교 (짐워크의 "이전 기록과 비교" 참고) ----------
 const vsLastEl = document.getElementById('vs-last-line');
 if(vsLastEl){
 if(lastSessionCalories > 0){
 const diff = calories - lastSessionCalories;
 vsLastEl.style.display = 'block';
 if(diff > 0){
 vsLastEl.innerHTML = t({ko:'지난번보다 <b>+' + diff + 'kcal</b> 더 태웠어요', en:'<b>+' + diff + 'kcal</b> more than last time', zh:'比上次多消耗 <b>+' + diff + 'kcal</b>'});
 } else if(diff < 0){
 vsLastEl.innerHTML = t({ko:'지난번보다 ' + Math.abs(diff) + 'kcal 적어요', en:Math.abs(diff) + 'kcal less than last time', zh:'比上次少' + Math.abs(diff) + 'kcal'});
 } else {
 vsLastEl.textContent = t({ko:'지난번과 동일해요', en:'Same as last time', zh:'与上次相同'});
 }
 } else {
 vsLastEl.style.display = 'none';
 }
 }
 const brokenRecords = [];
 if(myProfile.bestStreakEver > prevBest) brokenRecords.push(t({ko:'연속 기록', en:'streak', zh:'连续记录'}));
 if(myProfile.bestCaloriesEver > prevBestCalories && prevBestCalories > 0) brokenRecords.push(t({ko:'칼로리', en:'calories', zh:'消耗'}));
 if(myProfile.bestScoreEver > prevBestScore && prevBestScore > 0) brokenRecords.push(t({ko:'점수', en:'score', zh:'得分'}));
 // PR 은 이 화면에서 유일하게 앰버로 칠하는 것이다(설계 12) — 자기 기록을
 // 깬 날에만 나오므로 강조가 하나뿐이라는 규칙을 어기지 않는다.
 // 알약 한 줄이 아니라 트로피 + 두 줄짜리 행이다: 무엇을 깼는지 아래에 적는다.
 const prBadgeEl = document.getElementById('pr-badge');
 if(prBadgeEl){
 if(brokenRecords.length){
 prBadgeEl.style.display = 'flex';
 prBadgeEl.innerHTML =
  '<span class="pr-ic">' + ICON.trophy + '</span>' +
  '<span class="row-main">' +
   '<span class="pr-t"></span>' +
   '<span class="pr-d"></span>' +
  '</span>';
 prBadgeEl.querySelector('.pr-t').textContent = t(STATIC_UI.prTitle);
 prBadgeEl.querySelector('.pr-d').textContent = brokenRecords.join(' · ');
 } else {
 prBadgeEl.style.display = 'none';
 }
 }

 const newBest = myProfile.bestStreakEver > prevBest;
 if(LANG==='ko'){
 const prefix = newBest ? '자기 최고 기록 경신! · ' : '';
 finalRank.textContent = prefix + '연속 ' + myProfile.currentStreak + '일(오늘 ' + todayCompletionCount() + '회) · 총 ' + myProfile.totalCompletions + '회 완주';
 } else {
 const prefix = newBest ? 'New personal best! · ' : '';
 finalRank.textContent = prefix + myProfile.currentStreak + '-day streak (' + todayCompletionCount() + ' today) · ' + myProfile.totalCompletions + ' sessions total';
 }

 try{
 const dismissed = localStorage.getItem('wodrush_login_prompt_dismissed') === 'true';
 if(!currentUserId && !dismissed && myProfile.totalCompletions === 3){
 setTimeout(()=>{
 const el = document.getElementById('login-prompt-overlay');
 if(el) el.classList.add('on');
 }, 1200);
 }
 }catch(e){}
}

const retryChoiceOverlay = document.getElementById('retry-choice-overlay');
const retrySameBtn = document.getElementById('retry-same-btn');
const retryNewBtn = document.getElementById('retry-new-btn');
const retryCancelBtn = document.getElementById('retry-cancel-btn');

retryBtn.addEventListener('click', ()=>{
 Sound.unlock();
 if(retryChoiceOverlay) retryChoiceOverlay.classList.add('on');
});
if(retrySameBtn){
 retrySameBtn.addEventListener('click', ()=>{
 if(retryChoiceOverlay) retryChoiceOverlay.classList.remove('on');
 buildMissions();
 showWodPreview(()=> startCountdown());
 });
}
if(retryNewBtn){
 retryNewBtn.addEventListener('click', ()=>{
 if(retryChoiceOverlay) retryChoiceOverlay.classList.remove('on');
 showScreen(startScreen);
 });
}
if(retryCancelBtn){
 retryCancelBtn.addEventListener('click', ()=>{
 if(retryChoiceOverlay) retryChoiceOverlay.classList.remove('on');
 });
}

homeBtn.addEventListener('click', ()=>{
 Sound.unlock();
 showScreen(startScreen);
});

// ---------- SHARE RESULT (image card → native share sheet, or download+X fallback) ----------
function wrapText(ctx, text, x, y, maxWidth, lineHeight){
 const words = text.split(' ');
 let line = '';
 let curY = y;
 for(let n=0;n<words.length;n++){
 const testLine = line + words[n] + ' ';
 if(ctx.measureText(testLine).width > maxWidth && n > 0){
 ctx.fillText(line, x, curY);
 line = words[n] + ' ';
 curY += lineHeight;
 } else {
 line = testLine;
 }
 }
 ctx.fillText(line, x, curY);
 return curY;
}

function generateShareCard(){
 const canvas = document.createElement('canvas');
 canvas.width = 600; canvas.height = 860;
 const ctx = canvas.getContext('2d');

 const grad = ctx.createLinearGradient(0, 0, 600, 860);
 grad.addColorStop(0, '#150e0a');
 grad.addColorStop(1, '#0d0a08');
 ctx.fillStyle = grad;
 ctx.fillRect(0, 0, 600, 860);

 const glow = ctx.createRadialGradient(300, 120, 20, 300, 120, 320);
 glow.addColorStop(0, 'rgba(255,90,31,0.35)');
 glow.addColorStop(1, 'rgba(255,90,31,0)');
 ctx.fillStyle = glow;
 ctx.fillRect(0, 0, 600, 500);

 ctx.textAlign = 'center';
 ctx.fillStyle = '#ff5a1f';
 ctx.font = '800 22px sans-serif';
 ctx.fillText('Z I P', 300, 100);

 ctx.fillStyle = '#ffd60a';
 ctx.font = '900 76px sans-serif';
 ctx.fillText((myProfile.currentStreak || 1) + t({ko:'일 연속', en:'-day streak', zh:'天连续'}), 300, 210);

 ctx.fillStyle = '#f5f0e8';
 ctx.font = '700 30px sans-serif';
 ctx.fillText(t({ko:'총 ' + (myProfile.totalCompletions || 1) + '회 완주', en:(myProfile.totalCompletions || 1) + ' sessions total', zh:'累计完成' + (myProfile.totalCompletions || 1) + '次'}), 300, 260);

 ctx.fillStyle = '#8a7f74';
 ctx.font = '400 20px sans-serif';
 ctx.fillText(t({ko:(missions.length || 0) + '개 미션 완료 · ' + t(selectedCoach.name), en:(missions.length || 0) + ' missions done · ' + t(selectedCoach.name), zh:'完成' + (missions.length || 0) + '个动作 · ' + t(selectedCoach.name)}), 300, 300);

 ctx.strokeStyle = '#2c2420';
 ctx.lineWidth = 1;
 ctx.beginPath(); ctx.moveTo(80, 350); ctx.lineTo(520, 350); ctx.stroke();

 ctx.font = '64px sans-serif';
 ctx.fillText(selectedCoach.emoji, 300, 450);

 ctx.fillStyle = '#f5f0e8';
 ctx.font = '500 24px sans-serif';
 wrapText(ctx, t(selectedCoach.finish), 300, 500, 460, 32);

 ctx.fillStyle = '#ff5a1f';
 ctx.font = '800 26px sans-serif';
 ctx.fillText(t({ko:'이 기록, 깰 수 있어?', en:'Think you can beat this?', zh:'这个成绩，你能破吗？'}), 300, 600);

 ctx.fillStyle = '#5a5049';
 ctx.font = '400 15px sans-serif';
 ctx.fillText(t({ko:'#Qfit #홈트 #오늘도완주', en:'#Qfit #HomeWorkout #DailyGrind', zh:'#Qfit #居家健身 #今天也完成了'}), 300, 760);

 // bake the site link into the image itself — captions/text often get
 // stripped when sharing to platforms like Instagram Stories, but this
 // stays visible no matter where the image ends up.
 const siteLabel = (location.hostname + (location.pathname !== '/' ? location.pathname : '')).replace(/\/index\.html$/, '');
 ctx.font = '700 17px sans-serif';
 const linkWidth = ctx.measureText(siteLabel).width + 40;
 ctx.fillStyle = 'rgba(255,214,10,0.12)';
 const pillX = 300 - linkWidth/2, pillY = 800;
 ctx.beginPath();
 if(ctx.roundRect) ctx.roundRect(pillX, pillY, linkWidth, 34, 17);
 else ctx.rect(pillX, pillY, linkWidth, 34);
 ctx.fill();
 ctx.fillStyle = '#ffd60a';
 ctx.fillText(siteLabel, 300, pillY + 22);

 return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

async function shareResult(){
 const blob = await generateShareCard();
 if(!blob) return;
 const siteUrl = location.href.split('#')[0].split('?')[0];
 const personaEl = document.getElementById('persona-badge');
 const personaText = (personaEl && personaEl.style.display !== 'none') ? personaEl.textContent : '';
 const head = personaText ? (personaText + '\n') : '';
 const shareText = t({
 ko:head + (myProfile.currentStreak||1) + '일 연속, 총 ' + (myProfile.totalCompletions||1) + '회 완주 — 이거 깰 수 있어? Q-fit으로 붙어보자\n' + siteUrl,
 en:head + (myProfile.currentStreak||1) + '-day streak, ' + (myProfile.totalCompletions||1) + ' sessions total — think you can beat this? Try Q-fit\n' + siteUrl,
 zh:head + '连续' + (myProfile.currentStreak||1) + '天，累计完成' + (myProfile.totalCompletions||1) + '次 — 你能破吗？来试试 Q-fit\n' + siteUrl});

 try{
 const file = new File([blob], 'sports-game-result.png', { type:'image/png' });
 if(navigator.canShare && navigator.canShare({ files:[file] })){
 await navigator.share({ files:[file], text: shareText, title:'Q-fit', url: siteUrl });
 return;
 }
 }catch(e){ /* cancelled or unsupported — fall through to fallback below */ }

 // fallback for desktop / unsupported browsers: download image + open X compose
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = 'sports-game-result.png';
 document.body.appendChild(a); a.click(); document.body.removeChild(a);
 setTimeout(()=> URL.revokeObjectURL(url), 4000);
 window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText), '_blank');
}

shareBtn.addEventListener('click', shareResult);

// 도전장(설계 12). 공유가 '내 결과를 보여 주는 것' 이라면, 이건 '같은 루틴을
// 그대로 넘기는 것' 이다 — 링크에 방금 한 구성이 실려 가서 받은 사람은
// 앱을 열자마자 같은 운동을 하게 된다.
try{
 const challengeBtn = document.getElementById('challenge-btn');
 if(challengeBtn) challengeBtn.addEventListener('click', async ()=>{
 const keys = missions.filter(m=>!m.isBoss).map(m=>m.ex.key);
 const encoded = encodeRoutine({ name: autoRoutineName(), keys: Array.from(new Set(keys)), duration: selectedDurationPreset });
 if(!encoded) return;
 const url = location.href.split('#')[0].split('?')[0] + '?routine=' + encoded;
 const text = t({
  ko: '방금 ' + score + '점 했어. 같은 걸로 붙어볼래?\n',
  en: 'Just scored ' + score + '. Same routine — beat it?\n',
  zh: '我刚拿了' + score + '分，同样的组合，来比比？\n'}) + url;
 try{
  if(navigator.share){ await navigator.share({ text, url }); return; }
 }catch(e){ /* 사용자가 취소했다. 아래 복사로 넘어간다 */ }
 try{
  await navigator.clipboard.writeText(text);
  toast(t(STATIC_UI.linkCopied));
 }catch(e){ console.error('challenge copy failed:', e); }
 });
}catch(e){ console.error('challenge button failed:', e); }

// iOS/mobile often suspends the AudioContext when the tab loses focus
// (screen lock, app switch, etc.) and never auto-resumes it — re-arm on return.
document.addEventListener('visibilitychange', ()=>{
 if(document.visibilityState === 'visible'){
 Sound.unlock();
 }
});
window.addEventListener('pageshow', ()=> Sound.unlock());
window.addEventListener('focus', ()=> Sound.unlock());

// ---------- IN-APP BROWSER DETECTION (KakaoTalk, etc.) ----------
// These webviews restrict/block audio playback entirely — no JS fix
// exists for that. The only real fix is opening in the real browser.
try{
 (function checkInAppBrowser(){
 const ua = navigator.userAgent || '';
 const isKakao = /kakaotalk/i.test(ua);
 const isInstagram = /instagram/i.test(ua);
 const isFacebook = /FBAN|FBAV/i.test(ua);
 const isNaver = /NAVER\(inapp/i.test(ua);
 if(!isKakao && !isInstagram && !isFacebook && !isNaver) return;

 const banner = document.getElementById('inapp-banner');
 if(!banner) return;
 banner.classList.add('on');

 const openBtn = document.getElementById('inapp-open-btn');
 const dismissBtn = document.getElementById('inapp-dismiss-btn');
 if(openBtn){
 openBtn.addEventListener('click', ()=>{
 const url = encodeURIComponent(location.href);
 if(isKakao){
 location.href = 'kakaotalk://web/openExternal?url=' + url;
 } else {
 // most other in-app browsers don't expose a scheme — best effort:
 // try opening in a new tab, which sometimes escapes the webview.
 window.open(location.href, '_blank');
 }
 });
 }
 if(dismissBtn){
 dismissBtn.addEventListener('click', ()=>{
 banner.classList.remove('on');
 });
 }
 })();
}catch(e){ console.error('in-app browser check failed:', e); }

// ---------- REMAINING BOOT STEPS ----------
// Deliberately placed at the very end of the script, after every const/
// let/function in this scope has already been declared — this makes it
// impossible for one of these calls to fail with a "used before
// declaration" error and take down anything after it. Each call is also
// individually try/caught so a genuine runtime bug in one feature can
// never block another.
try{ loadNickname(); }catch(e){ console.error('loadNickname failed:', e); }
try{ loadWeightKg(); }catch(e){ console.error('loadWeightKg failed:', e); }
try{ applySetupPrefs(loadSetupPrefs()); }catch(e){ console.error('applySetupPrefs boot failed:', e); }
try{ renderWeekStrip(); }catch(e){ console.error('week strip boot render failed:', e); }
try{
 const weekendBanner = document.getElementById('weekend-banner');
 if(weekendBanner && [0,6].includes(new Date().getDay())){ weekendBanner.style.display = 'block'; }
}catch(e){ console.error('weekend banner setup failed:', e); }

// ---------- "Add to Home Screen" banner ----------
// Android/Chrome supports a real one-tap native install prompt via
// beforeinstallprompt. iOS Safari has no such API — there, tapping the
// banner just expands the manual "Share → Add to Home Screen" steps,
// since that's the only way to guide someone through it there.
try{
 let deferredInstallPrompt = null;
 const installBanner = document.getElementById('install-banner');
 const installBannerMain = document.getElementById('install-banner-main');
 const installBannerText = document.getElementById('install-banner-text');
 const installBannerDetail = document.getElementById('install-banner-detail');
 const installActionBtn = document.getElementById('install-action-btn');
 const installDismissBtn = document.getElementById('install-dismiss-btn');
 const isStandaloneMode = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
 const installDismissed = localStorage.getItem('wodrush_install_dismissed_v1') === '1';
 const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

 function showInstallBanner(kind){
 if(!installBanner || isStandaloneMode || installDismissed) return;
 installBanner.style.display = 'block';
 installBanner.dataset.kind = kind;
 if(kind === 'ios'){
 if(installBannerText) installBannerText.textContent = '홈 화면에 추가하면 더 빠르게 써요 (눌러서 방법 보기)';
 if(installActionBtn) installActionBtn.style.display = 'none';
 } else {
 if(installBannerText) installBannerText.textContent = '홈 화면에 추가하면 더 빠르게 써요';
 if(installActionBtn) installActionBtn.style.display = '';
 }
 }
 function dismissInstallBanner(){
 try{ localStorage.setItem('wodrush_install_dismissed_v1', '1'); }catch(e){}
 if(installBanner) installBanner.style.display = 'none';
 }

 window.addEventListener('beforeinstallprompt', (e)=>{
 e.preventDefault();
 deferredInstallPrompt = e;
 showInstallBanner('chrome');
 });
 if(isIOS && !isStandaloneMode && !installDismissed){
 showInstallBanner('ios');
 }
 if(installActionBtn){
 installActionBtn.addEventListener('click', async (e)=>{
 e.stopPropagation();
 if(deferredInstallPrompt){
 deferredInstallPrompt.prompt();
 try{ await deferredInstallPrompt.userChoice; }catch(err){}
 deferredInstallPrompt = null;
 }
 dismissInstallBanner();
 });
 }
 if(installDismissBtn){
 installDismissBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dismissInstallBanner(); });
 }
 if(installBannerMain){
 installBannerMain.addEventListener('click', ()=>{
 if(installBanner && installBanner.dataset.kind === 'ios' && installBannerDetail){
 installBannerDetail.style.display = installBannerDetail.style.display === 'none' ? 'block' : 'none';
 }
 });
 }
}catch(e){ console.error('install banner setup failed:', e); }
try{ loadProfile(); }catch(e){ console.error('loadProfile failed:', e); }
// 알은 프로필의 xp 로 그린다. 그래서 loadProfile 뒤에 있어야 한다.
try{ renderPetCard(); }catch(e){ console.error('pet card boot render failed:', e); }

// 홈의 알 → 성장 창.
try{
 const petCard = document.getElementById('pet-card');
 const petOverlay = document.getElementById('pet-overlay');
 const petCloseBtn = document.getElementById('pet-close-btn');
 const closePet = ()=>{ if(petOverlay) petOverlay.classList.remove('on'); };
 if(petCard) petCard.addEventListener('click', ()=>{
  try{ openPetDetail(); }catch(e){ console.error('pet detail open failed:', e); }
 });
 if(petCloseBtn) petCloseBtn.addEventListener('click', closePet);
 // 상자 밖(어두운 막)을 누르면 닫는다. 상자 안을 누른 것까지 닫으면
 // 글자를 짚어 읽는 동안 창이 사라진다.
 if(petOverlay) petOverlay.addEventListener('click', (e)=>{ if(e.target === petOverlay) closePet(); });
}catch(e){ console.error('pet card setup failed:', e); }

// 운동 알림(FR-03).
// 권한은 토글을 켤 때만 묻는다 — 부팅하자마자 물으면 대부분 거절하고,
// 브라우저가 그 거절을 기억해서 나중에 켜고 싶어도 못 켜게 된다.
// 프리미엄 게이팅(테스트 모드 — 실제 결제는 연결 안 됨). 설정 줄과 덮개
// 안의 값을 한 곳에서 채운다 — settings-premium-row 를 열 때도, 잠긴 카드를
// 눌러 바로 열 때도 이 함수부터 부른다.
function refreshPremiumUI(){
 const isPremium = !!myProfile.isPremium;
 const premiumCount = EXERCISES.filter(e=> e.premium).length;
 const label = document.getElementById('settings-premium-label');
 if(label) label.textContent = t(isPremium ? STATIC_UI.settingsPremiumOnLabel : STATIC_UI.settingsPremiumNotLabel);
 const activateBtn = document.getElementById('premium-activate-btn');
 if(activateBtn){
 activateBtn.style.display = isPremium ? 'none' : '';
 activateBtn.disabled = false;
 activateBtn.textContent = t(STATIC_UI.premiumStartBtn);
 }
 const priceBox = document.getElementById('premium-price-box');
 if(priceBox) priceBox.style.display = isPremium ? 'none' : 'flex';
 const fineprint = document.getElementById('premium-fineprint');
 if(fineprint){
 fineprint.style.display = isPremium ? 'none' : '';
 fineprint.textContent = t(STATIC_UI.premiumFineprint);
 }
 const title = document.getElementById('premium-title');
 if(title) title.textContent = t(isPremium ? STATIC_UI.premiumTitleOn : STATIC_UI.premiumTitleOff);
 const desc = document.getElementById('premium-desc');
 if(desc) desc.textContent = isPremium ? t(STATIC_UI.premiumDescOn) : t(STATIC_UI.premiumDescOff).replace('%s', premiumCount);
}
window.refreshPremiumUI = refreshPremiumUI;
window.openPremiumUpsell = function(){
 refreshPremiumUI();
 const overlay = document.getElementById('premium-overlay');
 if(overlay) overlay.classList.add('on');
};

try{
 // ---- 설정 화면의 나머지 (설계 17) ----
 // 프로필 카드 · 기본 세트 수 · 언어 · 테마 · 내보내기 · 삭제.
 // 값을 보여 주는 줄은 전부 syncSettings 한 곳에서 채운다 — 여러 자리에서
 // 나눠 채우면 언어를 바꿨을 때 한둘이 옛 값으로 남는다.
 window.syncSettings = function syncSettings(){
 const nameEl = document.getElementById('profile-name');
 if(nameEl) nameEl.textContent = myNickname || 'Q-fitter';
 const avEl = document.getElementById('profile-avatar');
 if(avEl) avEl.textContent = (myNickname || 'Q').trim().charAt(0).toUpperCase() || 'Q';
 const subEl = document.getElementById('profile-sub');
 if(subEl) subEl.textContent = t(isCloudEnabled() ? STATIC_UI.syncBlurb : STATIC_UI.localOnlyNote);

 const setsVal = document.getElementById('settings-sets-val');
 if(setsVal) setsVal.textContent = selectedTotalSets;
 const warmRow = document.getElementById('settings-warmup-toggle');
 if(warmRow && warmupToggle) warmRow.checked = warmupToggle.checked;
 const langVal = document.getElementById('settings-lang-val');
 if(langVal) langVal.textContent = LANG_LABEL[LANG];
 const themeVal = document.getElementById('settings-theme-val');
 if(themeVal) themeVal.textContent = t(THEME_LABEL[currentTheme()]);
 const fontSizeVal = document.getElementById('settings-fontsize-val');
 if(fontSizeVal) fontSizeVal.textContent = t(FONT_SCALE_LABEL[currentFontScale()]);
 };
 syncSettings();
 document.addEventListener('qfit:lang', ()=>{ try{ syncSettings(); }catch(e){} });

 // 로그인 문은 클라우드가 잠겨 있으면 같이 닫는다(NOTES.md 참고).
 const settingsLoginBtn = document.getElementById('settings-login-btn');
 if(settingsLoginBtn){
 if(!isCloudEnabled()) settingsLoginBtn.hidden = true;
 else settingsLoginBtn.addEventListener('click', ()=> showScreen(accountScreen));
 }

 // 기본 세트 수는 설정 화면에서 스테퍼를 또 만들지 않는다 —
 // 그 값을 정하는 자리는 '오늘의 설정' 이고, 여기서는 거기로 보낸다.
 document.getElementById('settings-default-sets')?.addEventListener('click', ()=>{
 showScreen(setupScreen);
 setTimeout(()=> document.getElementById('custom-setcount-btn')?.click(), 80);
 });
 document.getElementById('settings-warmup-toggle')?.addEventListener('change', (e)=>{
 if(warmupToggle){ warmupToggle.checked = e.target.checked; warmupToggle.dispatchEvent(new Event('change', { bubbles:true })); }
 });
 document.getElementById('settings-lang-btn')?.addEventListener('click', ()=>{
 setLang(nextLang());
 syncSettings();
 });
 document.getElementById('settings-theme-btn')?.addEventListener('click', ()=>{
 cycleTheme();
 syncSettings();
 });
 document.getElementById('settings-fontsize-btn')?.addEventListener('click', ()=>{
 cycleFontScale();
 syncSettings();
 });
 syncVoiceToggle();
 document.getElementById('voice-male-btn')?.addEventListener('click', ()=> setVoicePref('male'));
 document.getElementById('voice-female-btn')?.addEventListener('click', ()=> setVoicePref('female'));
 refreshPremiumUI();
 document.getElementById('settings-premium-row')?.addEventListener('click', ()=> window.openPremiumUpsell());
 document.getElementById('premium-activate-btn')?.addEventListener('click', function(){
 if(this.disabled) return;
 this.disabled = true;
 this.textContent = t(STATIC_UI.premiumProcessing);
 myProfile.isPremium = true;
 saveProfile();
 setTimeout(()=>{
 refreshPremiumUI();
 const desc = document.getElementById('premium-desc');
 if(desc) desc.textContent = t(STATIC_UI.premiumActivatedMsg);
 }, 500);
 });
 document.getElementById('premium-close-btn')?.addEventListener('click', ()=>{
 const overlay = document.getElementById('premium-overlay');
 if(overlay) overlay.classList.remove('on');
 });
 document.getElementById('settings-export-btn')?.addEventListener('click', exportHistoryCsv);
 document.getElementById('settings-wipe-btn')?.addEventListener('click', wipeAllData);

 // 화면 맨 아래 판 번호. 무언가 이상할 때 "어느 판을 보고 있나" 를
 // 물어볼 수 있는 유일한 자리다.
 const verEl = document.getElementById('settings-version');
 // package.json 의 version 을 vite 가 심는다(vite.config.js 의 define).
 // 손으로 적으면 배포마다 고쳐야 하고, 한 번 잊으면 그때부터 거짓말을 한다.
 if(verEl) verEl.textContent = 'Q-fit ' + __APP_VERSION__;

 const remToggle = document.getElementById('reminder-toggle');
 const remNote = document.getElementById('reminder-note');
 if(remToggle){
 remToggle.checked = reminder.isEnabled() && reminder.canNotify();
 remToggle.addEventListener('change', async ()=>{
 // 설명은 이제 줄 안에 붙어 있다. 이 자리는 '켤 수 없었다' 는 말만 한다 —
 // 잘될 때도 한 줄이 남아 있으면 그게 오류인지 안내인지 구별이 안 된다.
 if(!remToggle.checked){ reminder.disable(); if(remNote) remNote.textContent = ''; return; }
 if(typeof Notification === 'undefined'){
 remToggle.checked = false;
 if(remNote) remNote.textContent = t(STATIC_UI.reminderUnsupported);
 return;
 }
 const ok = await reminder.enable();
 remToggle.checked = ok;
 if(remNote) remNote.textContent = ok ? '' : t(STATIC_UI.reminderDenied);
 });
 }
 // 앱을 열었을 때 알릴 때가 됐으면 알린다. 닫혀 있는 사이는 웹푸시가
 // 필요하고 그건 배포가 붙어야 한다.
 const last = myProfile.lastPlayDate ? new Date(myProfile.lastPlayDate + 'T00:00:00').getTime() : 0;
 reminder.checkOnOpen(last);
}catch(e){ console.error('reminder setup failed:', e); }
try{ checkComeback(); }catch(e){ console.error('checkComeback boot failed:', e); }
try{
 langBtn.addEventListener('click', ()=>{
 try{ setLang(nextLang()); }catch(e){ console.error('setLang failed:', e); }
 });
 langBtn.textContent = LANG_LABEL[nextLang()];
}catch(e){ console.error('lang button setup failed:', e); }
try{ applyStaticTranslations(); }catch(e){ console.error('applyStaticTranslations failed:', e); }

try{
 if(openAccountBtn) openAccountBtn.addEventListener('click', ()=>{
 updateAccountUI();
 showScreen(accountScreen);
 });
}catch(e){ console.error('open account button failed:', e); }

try{
 document.querySelectorAll('#account-screen .auth-tab').forEach(btn=>{
 btn.addEventListener('click', ()=>{
 document.querySelectorAll('#account-screen .auth-tab').forEach(b=> b.classList.toggle('active', b === btn));
 updateAccountUI();
 });
 });
}catch(e){ console.error('account tabs failed:', e); }

try{
 const loginBtn = document.getElementById('account-login-btn');
 if(loginBtn) loginBtn.addEventListener('click', async ()=>{
 const errEl = document.getElementById('account-login-error');
 try{
 const email = document.getElementById('account-login-email').value.trim();
 const pw = document.getElementById('account-login-pw').value;
 errEl.textContent = '처리 중...';
 if(!email){ errEl.textContent = '이메일을 입력해주십시오.'; return; }
 const sb = await getSupabase();
 if(!sb){ errEl.textContent = '연결에 실패했어요. 페이지를 새로고침해서 다시 시도해주십시오.'; return; }
 const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
 if(error) throw error;
 currentUserId = data.user.id;
 const row = await fetchProfileFromCloud();
 if(row) applyCloudProfile(row);
 updateAccountUI();
 showScreen(startScreen);
 }catch(e){
 console.error('login failed:', e);
 if(errEl) errEl.textContent = '로그인 실패: ' + (e && e.message ? e.message : '이메일/비밀번호를 확인해주십시오.');
 }
 });
}catch(e){ console.error('login button failed:', e); }

try{
 const signupBtn = document.getElementById('account-signup-btn');
 if(signupBtn) signupBtn.addEventListener('click', async ()=>{
 const errEl = document.getElementById('account-signup-error');
 try{
 const email = document.getElementById('account-signup-email').value.trim();
 const pw = document.getElementById('account-signup-pw').value;
 errEl.style.color = '#ff6b5b';
 errEl.textContent = '처리 중...';
 if(!email){ errEl.textContent = '이메일을 입력해주십시오.'; return; }
 const sb = await getSupabase();
 if(!sb){ errEl.textContent = '연결에 실패했어요. 페이지를 새로고침해서 다시 시도해주십시오.'; return; }
 if(pw.length < 6){ errEl.textContent = '비밀번호는 6자리 이상이어야 합니다.'; return; }
 const { data, error } = await sb.auth.signUp({ email, password: pw });
 if(error) throw error;
 if(!data.session){
 errEl.style.color = 'var(--volt)';
 errEl.textContent = '가입 완료! 인증 메일이 1분 정도 후에 도착할 수 있습니다. (스팸함도 확인해주십시오)';
 return;
 }
 currentUserId = data.user.id;
 try{
 const pendingRef = localStorage.getItem('qfit_pending_ref');
 if(pendingRef && pendingRef !== currentUserId){
 myProfile.referredBy = pendingRef;
 localStorage.removeItem('qfit_pending_ref');
 }
 }catch(e){}
 await syncProfileToCloud(); // push whatever local progress this device already has
 updateAccountUI();
 showScreen(startScreen);
 }catch(e){
 console.error('signup failed:', e);
 if(errEl) errEl.textContent = '가입 실패: ' + (e && e.message ? e.message : '다시 시도해주십시오.');
 }
 });
}catch(e){ console.error('signup button failed:', e); }

try{
 window.addEventListener('beforeunload', (e)=>{
 if(missionActive){
 e.preventDefault();
 e.returnValue = '';
 }
 });
}catch(e){ console.error('beforeunload setup failed:', e); }

try{ checkSupabaseSession(); }catch(e){ console.error('checkSupabaseSession failed:', e); }
