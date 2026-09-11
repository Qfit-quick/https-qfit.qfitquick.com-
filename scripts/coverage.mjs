// 마크업이 쓰는 클래스 중 CSS 규칙이 없는 것을 찾는다.
//
// CSS 를 통째로 새로 쓸 때 제일 흔한 사고는 "몇 개를 빠뜨린 것"이다.
// 빠진 클래스는 오류를 내지 않는다 — 그냥 스타일이 없는 채로 렌더되고,
// 그건 화면을 하나하나 열어 봐야 알게 된다. 화면이 열여섯 개면 놓친다.
//
// JS 가 붙이는 클래스(classList.add)도 같이 센다. 마크업에 없어서
// HTML 만 훑으면 안 보이는데, 실제로는 운동 중에 붙는 것들이다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf-8');
// app.js 만 훑던 것을 src/ 전체로 넓혔다. 화면 셋(계획·기록지·관문)의
// 안쪽은 src/ui/*.js 가 문자열로 조립하는데, app.js 만 보면 그 클래스가
// '아무도 안 쓰는 것' 으로 보여서 검사가 통과하며 화면만 망가진다.
const jsFiles = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.js')) jsFiles.push(full);
  }
};
walk(path.join(ROOT, 'src'));
const js = jsFiles.map((f) => fs.readFileSync(f, 'utf-8')).join('\n');

const cssFiles = fs
  .readdirSync(path.join(ROOT, 'src', 'styles'))
  .filter((f) => f.endsWith('.css'));
const css = cssFiles
  .map((f) => fs.readFileSync(path.join(ROOT, 'src', 'styles', f), 'utf-8'))
  .join('\n');

// ── 쓰이는 클래스 ────────────────────────────────────────
const used = new Set();
for (const [, v] of html.matchAll(/class="([^"]*)"/g)) {
  v.split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
}
// JS: classList.add('x'), className = 'a b'
for (const [, v] of js.matchAll(/classList\.(?:add|remove|toggle)\(\s*'([^']+)'/g)) {
  v.split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
}
for (const [, v] of js.matchAll(/className\s*=\s*'([^']*)'/g)) {
  v.split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
}
// JS 안에서 문자열로 조립하는 마크업.
//
// 두 모양이 섞여 있다:
//   '<div class="card plan-meal">'                    ← 그냥 문자열
//   `<div class="log-half w${on ? ' on' : ''}">`      ← 조각을 이어 붙인 것
// 그래서 class=" 뒤를 따옴표·백틱·${ 중 먼저 오는 것까지만 자르고, 남은
// 토큰이 실제 클래스 이름 꼴인지 한 번 더 거른다. 안 거르면 '===' 이나
// '(done' 같은 코드 조각이 '스타일 없는 클래스' 로 보고된다.
//
// 삼항으로 붙는 수식어(' on', ' partial')는 여기서 안 잡힌다. 그것들은
// 잡히는 본 클래스에 딸린 상태라, 본 클래스가 없으면 같이 걸린다.
const CLASS_NAME = /^[a-zA-Z][\w-]*$/;
for (const [, v] of js.matchAll(/class="([^"'`$\n]*)/g)) {
  v.split(/\s+/).filter((c) => CLASS_NAME.test(c)).forEach((c) => used.add(c));
}

// ── CSS 가 정의하는 클래스 ───────────────────────────────
const defined = new Set();
// 주석을 먼저 걷어낸다. 주석 안의 .foo 를 정의로 세면 검사가 거짓말을 한다.
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
for (const [, c] of cssNoComments.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(c);

// ── 예외 ─────────────────────────────────────────────────
// 'anim-' 은 JS 가 'anim-' + key 로 조립한다. 접두사로 취급한다.
const PREFIX_OK = ['anim-'];
// JS 가 잡는 손잡이라 스타일이 없는 게 정상인 것들.
// 여기 추가할 때는 정말 손잡이인지 확인할 것 — 빠뜨린 것을 여기 넣으면
// 검사가 통과하면서 화면만 망가진다.
const IGNORE = new Set([
  'anim-',
  'recovery-trigger-btn', 'video-gallery-trigger-btn', 'repeat-trigger-btn',
  // 바텀시트 닫기 버튼. 보이는 모양은 .icb 가 다 정하고, 이 이름은
  // sheet.js 가 querySelector 로 집는 손잡이다(스타일이 없는 게 정상).
  'sheet-close',
  // 프로그램 목록의 '이어하기' 버튼. 보이는 모양은 .primary 가 다 정하고,
  // 이 이름은 programs.js 가 '고르는 버튼'과 구분해 집는 손잡이다.
  'program-continue-btn',
]);

const missing = [...used]
  .filter((c) => !IGNORE.has(c))
  .filter((c) => !defined.has(c))
  .filter((c) => !PREFIX_OK.some((p) => c.startsWith(p) && defined.has(c)))
  .sort();

// 반대쪽도 본다: CSS 에만 있고 아무도 안 쓰는 것 (지워도 되는 것)
const unused = [...defined].filter((c) => !used.has(c)).sort();

console.log(`쓰이는 클래스 ${used.size}개 / CSS 정의 ${defined.size}개`);

if (missing.length) {
  console.log(`\n=== 스타일이 없는 클래스 ${missing.length}개 ===`);
  missing.forEach((c) => console.log('  .' + c));
} else {
  console.log('\n스타일 빠진 클래스 없음');
}

if (process.env.SHOW_UNUSED && unused.length) {
  console.log(`\n--- CSS 에만 있고 안 쓰이는 것 ${unused.length}개 ---`);
  console.log('  ' + unused.join(' '));
}

process.exit(missing.length ? 1 : 0);
