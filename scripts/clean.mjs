// 지난 빌드 산출물만 골라 지운다.
//
// 산출물이 저장소 루트에 놓이므로 Vite 의 emptyOutDir 을 켤 수 없다 — 켜면
// src/·scripts/·legacy/ 까지 통째로 날아간다. 그래서 지우는 쪽을 여기로 뺐다.
//
// 왜 필요한가: 자산 파일 이름에 해시가 붙는다(assets/index-a1b2c3.js). 안 지우면
// 빌드할 때마다 옛 이름이 그대로 남아 저장소가 계속 불어나고, 어느 것이 지금
// 쓰이는 파일인지 알 수 없게 된다.
//
// **이름을 아는 것만 지운다.** 와일드카드로 루트를 쓸면 언젠가 소스를 지운다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

// 빌드가 만드는 것들. 여기 없는 것은 건드리지 않는다.
//
// ⚠ media 와 icons 는 **일부러 빼 두었다.**
//
// 지우는 목적은 해시가 붙은 옛 자산을 걷어내는 것이다(assets/index-a1b2c3.js).
// 그런데 media·icons 의 파일 이름에는 해시가 없다 — public/ 에서 그대로
// 복사되므로 이름이 늘 같고, 새 빌드가 같은 이름 위에 덮어쓴다. 즉 이 둘을
// 지워서 얻는 것이 없다.
//
// 잃는 것은 있었다. 배포본에는 public/ 에 없는 파일 47개가 있다 —
// 클립 13~25(5.7MB), media/pet/, 잘려 나간 동작들의 사진 33장. 코드가
// 하나도 참조하지 않는 잔여물이지만, 지우는 순간 **라이브에서 사라진다.**
// media 를 목록에 두면 빌드할 때마다 그 일이 되풀이된다.
//
// 대신 감수하는 것: public/ 에서 사진 한 장을 정말로 빼도 배포본에는
// 남는다. 그건 손으로 지우면 되는 일이고, 라이브 파일이 예고 없이
// 사라지는 것보다 훨씬 작은 문제다.
const DIRS = ['assets'];
const FILES = ['index.html', 'sw.js', 'registerSW.js', 'manifest.webmanifest'];
const PATTERNS = [/^workbox-[\w-]+\.js$/];

// 절대 지우면 안 되는 것. DIRS·FILES 를 잘못 늘렸을 때를 대비한 두 번째 그물이다.
const KEEP = new Set([
  'src', 'scripts', 'app', 'public', 'legacy', 'node_modules', '.git',
  'package.json', 'package-lock.json', 'vite.config.js', '.gitignore',
  'NOTES.md', 'README.md', '.nojekyll', 'screenshots', 'dist',
]);

let gone = 0;
for (const name of [...DIRS, ...FILES]) {
  if (KEEP.has(name)) throw new Error(`지우면 안 되는 것이 목록에 있다: ${name}`);
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) continue;
  fs.rmSync(p, { recursive: true, force: true });
  gone++;
}
for (const name of fs.readdirSync(ROOT)) {
  if (KEEP.has(name)) continue;
  if (!PATTERNS.some((re) => re.test(name))) continue;
  fs.rmSync(path.join(ROOT, name), { force: true });
  gone++;
}

console.log(`지난 산출물 ${gone}개 지움`);
