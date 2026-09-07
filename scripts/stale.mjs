// 배포본이 소스보다 낡았는지 본다.
//
// 이 저장소는 **빌드 산출물을 커밋한다** — 클라우드플레어가 저장소 루트를
// 그대로 서빙하기 때문이다(wrangler.jsonc 의 assets.directory: "."). 그래서
// 소스만 커밋하고 push 하면, 코드는 올라갔는데 사이트는 안 바뀐다.
// 그게 제일 알아채기 어려운 실패다 — 저장소를 보면 다 되어 있어 보인다.
//
// 그래서 세어서 막는다. 지금 커밋된 index.html 이 어느 자산을 가리키는지
// 보고, 그 파일이 실제로 있는지 · 소스를 다시 빌드하면 같은 것이 나오는지를
// 확인한다.
//
//   npm run stale        낡았으면 종료코드 1
//   npm run stale --fix  낡았으면 빌드까지 해 준다
//
// CI(.github/workflows/deploy.yml)가 push 마다 --fix 로 돌려서, 소스만
// 올라온 경우에도 배포본이 따라오게 한다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIX = process.argv.includes('--fix');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const problems = [];

// ── 1. index.html 이 가리키는 자산이 실제로 있는가 ────────────
if (!exists('index.html')) {
  problems.push('index.html 이 없다 — 아직 한 번도 빌드하지 않았다');
} else {
  const html = read('index.html');
  const refs = [...new Set([...html.matchAll(/(?:src|href)="\.?\/?(assets\/[\w.-]+)"/g)].map((m) => m[1]))];
  if (!refs.length) {
    problems.push('index.html 이 assets/ 를 하나도 안 가리킨다 — 소스 index.html 이 루트에 있는 것 아닌가');
  }
  for (const r of refs) {
    if (!exists(r)) problems.push(`index.html 이 가리키는 ${r} 가 없다 — 사이트가 흰 화면이 된다`);
  }

  // 서비스워커가 적어 둔 md5 가 실제 파일과 맞는가.
  // 어긋나면 cache-first 때문에 사용자에게 영원히 옛 판이 나갈 수 있다.
  if (exists('sw.js')) {
    const sw = read('sw.js');
    for (const [, url, rev] of sw.matchAll(/url:"([^"]+)",revision:"([0-9a-f]{32})"/g)) {
      if (!exists(url)) { problems.push(`sw.js 가 프리캐시하는 ${url} 가 없다`); continue; }
      const crypto = await import('node:crypto');
      const md5 = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, url))).digest('hex');
      if (md5 !== rev) problems.push(`sw.js 의 ${url} revision 이 실제 파일과 다르다 — 옛 판이 캐시에 박힌다`);
    }
  }
}

// ── 2. 다시 빌드하면 같은 것이 나오는가 ───────────────────────
//
// 소스를 고치고 빌드를 잊었으면 여기서 걸린다. 빌드는 부작용이 있으므로
// (루트를 덮어쓴다) 먼저 지금 상태의 지문을 떠 두고, 빌드한 뒤 비교한다.
const FINGERPRINT = ['index.html', 'sw.js'];
const before = new Map();
for (const f of FINGERPRINT) if (exists(f)) before.set(f, read(f));
const assetsBefore = exists('assets') ? fs.readdirSync(path.join(ROOT, 'assets')).sort().join(',') : '';

console.log('소스를 다시 빌드해서 지금 배포본과 비교한다…\n');
try {
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe', shell: true });
} catch (e) {
  console.error('빌드가 실패했다. 이건 배포본 문제가 아니라 소스 문제다.');
  console.error(String(e.stdout || '') + String(e.stderr || ''));
  process.exit(2);
}

const assetsAfter = exists('assets') ? fs.readdirSync(path.join(ROOT, 'assets')).sort().join(',') : '';
const changed = [];
for (const f of FINGERPRINT) {
  if (!exists(f)) { changed.push(f + ' (사라졌다)'); continue; }
  if (before.get(f) !== read(f)) changed.push(f);
}
if (assetsBefore !== assetsAfter) changed.push('assets/ 목록');

// ── 보고 ──────────────────────────────────────────────────────
if (problems.length) {
  console.log(`=== 배포본이 깨져 있다 (${problems.length}건) ===`);
  problems.forEach((p) => console.log('  ' + p));
}

if (changed.length) {
  console.log(`\n=== 배포본이 소스보다 낡았다 ===`);
  changed.forEach((c) => console.log('  다시 빌드하니 달라진 것: ' + c));
  if (FIX) {
    console.log('\n방금 빌드해서 맞췄다. 이 변경을 커밋해야 사이트가 바뀐다.');
  } else {
    console.log('\n방금 빌드가 이미 루트를 갱신했다 — 이 변경을 커밋하면 된다.');
  }
}

if (!problems.length && !changed.length) {
  console.log('배포본이 소스와 같다 — push 하면 사이트가 그대로 뜬다.');
  process.exit(0);
}
// --fix 는 맞추는 것이 목적이므로 성공으로 끝난다. 그냥 돌렸을 때는 실패다 —
// 그래야 커밋을 잊은 것이 눈에 띈다.
process.exit(FIX ? 0 : 1);
