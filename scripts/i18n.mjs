// 번역이 빠진 자리를 찾는다.
//
// 이 앱의 i18n 은 "사전에 등록된 것만 번역된다" 구조라, 문구를 새로 넣고
// 등록을 잊으면 그 자리만 한국어로 남는다. 그런데 한국어로 남은 것은
// 화면을 그 언어로 열어 봐야만 보인다 — 오류도, 경고도 안 난다.
// 그래서 세어서 막는다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LANGS = ['ko', 'en', 'zh'];

const files = [
  ...fs.readdirSync(path.join(ROOT, 'src', 'data')).map((f) => path.join('src', 'data', f)),
  path.join('src', 'app.js'),
].filter((f) => f.endsWith('.js'));

let missing = 0;
let total = 0;

for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  const holes = [];

  // {ko:'…', en:'…'} 꼴을 찾아 각 언어가 다 있는지 본다.
  // 중첩 따옴표를 정확히 파싱하려는 대신, ko 부터 닫는 중괄호까지를 한 덩어리로 본다.
  for (const m of src.matchAll(/\{\s*ko\s*:\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")[\s\S]*?\}/g)) {
    total++;
    const chunk = m[0];
    // 빈 값(en:'')을 '있음'으로 세면 안 된다 — 자리만 만들어 두고 안 채운 것이
    // 통과해 버리고, 화면에서는 한국어로 되돌아가 있어서 눈치채기 어렵다.
    const lack = LANGS.filter((l) => {
      const has = new RegExp(`\\b${l}\\s*:\\s*(['"])((?:[^'"\\\\]|\\\\.)*)\\1`).exec(chunk);
      if (!has) return !new RegExp(`\\b${l}\\s*:`).test(chunk); // 배열 값 등은 존재만 본다
      return has[2].trim() === '';
    });
    if (lack.length) {
      const line = src.slice(0, m.index).split('\n').length;
      const ko = (chunk.match(/ko\s*:\s*['"]([^'"]{0,28})/) || [])[1] ?? '?';
      holes.push({ line, lack, ko });
    }
  }

  if (holes.length) {
    console.log(`\n${rel.replace(/\\/g, '/')}  — ${holes.length}곳`);
    holes.slice(0, 12).forEach((h) =>
      console.log(`  ${String(h.line).padStart(4)}행  [${h.lack.join(',')} 없음]  ${h.ko}`)
    );
    if (holes.length > 12) console.log(`  … 그 밖에 ${holes.length - 12}곳`);
    missing += holes.length;
  }
}

// 코드 안에 박힌 2갈래 분기도 센다. LANG==='ko' ? A : B 는 언어가 셋이 되는 순간
// 중국어에서 영어가 나온다 — 틀린 것도 아니고 맞는 것도 아닌 상태다.
const app = fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf-8');
const inline = [...app.matchAll(/LANG\s*===\s*'ko'\s*\?/g)].length;

console.log(`\n{ko,…} 덩어리 ${total}개 중 빠진 것 ${missing}개`);
console.log(`app.js 안의 2갈래 분기(LANG==='ko' ? …) ${inline}곳 — 중국어에서 영어가 나온다`);

// 마크업 안의 한글 중 data-i18n 도 없고 사전에도 안 걸린 것.
// 이런 자리는 언어를 바꿔도 한국어로 남는데, 오류가 안 나서 안 보인다.
const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf-8');
const bare = [];
// JS 가 부팅 때 값을 넣는 자리. 여기에 data-i18n 을 붙이면 사전 값이
// 실제 값을 덮어써서, 기록이 잠깐 보였다가 '0일' 로 되돌아간다.
const FILLED_BY_JS = new Set([
  'rec-best-streak', 'rec-current-streak', 'rec-week', 'rec-month',
  'rec-total', 'rec-total-time', 'neon-avatar-label', 'warmup-video-error',
  'ex-name', 'ex-cue', 'result-time-val', 'final-sub', 'final-rank',
  // Cindy AMRAP(src/ui/amrap.js) — 마크업의 한글은 자리만 잡아 둔 예시값이고
  // 실제 값은 render()/renderDone() 이 매번 새로 채운다.
  'amrap-move-name', 'amrap-move-reps', 'amrap-done-rounds', 'amrap-done-kcal',
  // QCE 서킷(src/ui/circuit.js) — 위와 같은 이유.
  'circuit-move-name', 'circuit-move-target', 'circuit-done-time', 'circuit-done-kcal',
  // '3초 후 시작'(src/ui/quickStart.js, 2026-09-23) — 위와 같은 이유.
  'quick-title', 'quick-move-name', 'quick-done-time', 'quick-done-kcal',
  'quick-move-timer',
]);

for (const m of html.matchAll(/<([a-z][\w-]*)([^>]*)>([^<>{}]*[가-힣][^<>]*)</g)) {
  const [, tag, attrs, text] = m;
  if (attrs.includes('data-i18n')) continue;
  const id = (attrs.match(/id="([\w-]+)"/) || [])[1];
  if (id && FILLED_BY_JS.has(id)) continue;
  const line = html.slice(0, m.index).split('\n').length;
  bare.push({ line, tag, text: text.trim().slice(0, 34) });
}
if (bare.length) {
  console.log(`\nindex.html — data-i18n 없는 한글 ${bare.length}곳`);
  bare.slice(0, 10).forEach((b) => console.log(`  ${String(b.line).padStart(4)}행  <${b.tag}>  ${b.text}`));
  if (bare.length > 10) console.log(`  … 그 밖에 ${bare.length - 10}곳`);
}

const limit = Number(process.env.I18N_ALLOW ?? 0);
const bareLimit = Number(process.env.I18N_MARKUP_ALLOW ?? 0);
const bad = missing + inline + (bare.length > bareLimit ? bare.length - bareLimit : 0);
if (bad > limit) {
  console.log(`\n남은 것 ${bad}개 (허용 ${limit})`);
  process.exit(1);
}
console.log('\n통과');
