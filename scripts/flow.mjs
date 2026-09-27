// 핵심 루프가 끝까지 도는지 본다: 홈 → 모드 → 설정 → 미리보기 → 카운트다운 → 운동.
//
// 스모크는 "홈이 뜬다"까지고, 모듈로 쪼갠 뒤 실제로 깨지는 건 화면을 넘어가는 자리다.
// 참조가 하나 끊겨도 홈은 멀쩡히 뜨기 때문에 여기까지 와야 알 수 있다.
import { launch, context, DEFAULT_URL } from './_browser.mjs';
import fs from 'node:fs';

const URL = process.env.FLOW_URL || DEFAULT_URL;
const SHOT_DIR = 'screenshots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await launch();
const ctx = await context(browser); // 기준 기기: 아이폰 12
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

const active = () => page.evaluate(() => document.querySelector('.screen.active')?.id);
const step = async (label, fn) => {
  await fn();
  // 시트가 올라오고 내려가는 데 시간이 걸린다. 안 기다리면 다음 버튼을
  // 움직이는 중에 누르고, 스크린샷도 어중간한 순간을 찍는다.
  await page.waitForTimeout(450);
  const id = await active();
  console.log(`  ${label.padEnd(22)} → ${id}`);
  return id;
};

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);

console.log('--- 화면 이동 ---');
await step('시작', async () => {});
await step('▶ 1분 시작', () => page.click('#one-min-start-btn'));
await step('바로 고르기', () => page.click('#mode-pick-btn'));
await step('🎲 랜덤 선택', () => page.click('#mode-random'));

// 준비운동은 끄고 간다 — 8.6MB 영상을 받을 이유가 없다
await page.evaluate(() => {
  const t = document.getElementById('warmup-toggle');
  if (t && t.checked) t.click();
});

await page.screenshot({ path: `${SHOT_DIR}/setup.png` });
await step('미리보기', () => page.click('#play-btn'));

// 미리보기는 더 이상 저절로 넘어가지 않는다(설계 06) — 사람이 시작을 누른다
await step('▶ 시작', () => page.click('#preview-start-btn'));

// 카운트다운 3-2-1(650ms×3)
await page.waitForTimeout(2600);
const finalScreen = await step('카운트다운 대기', async () => {});

const game = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const vis = (s) => {
    const e = q(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  return {
    exName: q('.ex-name')?.textContent?.trim() ?? null,
    setCounter: q('#set-counter')?.textContent?.trim() ?? null,
    holdRingNum: q('.hold-ring .num')?.textContent?.trim() ?? null,
    photoSrc: q('#photo-demo-a')?.getAttribute('src') ?? null,
    figureClass: q('.figure-wrap')?.className ?? null,
    photoVisible: vis('.photo-demo-wrap'),
    photoBox: (() => {
      const e = q('.photo-demo-wrap');
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    })(),
    // 가로 넘침 — 폰에서 페이지가 밀리는지
    overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  };
});

console.log('\n--- 운동 화면 ---');
for (const [k, v] of Object.entries(game)) console.log(`  ${k.padEnd(14)} ${JSON.stringify(v)}`);

await page.screenshot({ path: `${SHOT_DIR}/game.png` });

// 사진이 실제로 로드됐는지 (src 만 박히고 404 인 경우를 잡는다)
const photoOk = await page.evaluate(() => {
  const img = document.getElementById('photo-demo-a');
  return img ? img.naturalWidth > 0 : false;
});
console.log(`  사진 실제 로드     ${photoOk}`);

await browser.close();

// 가로 넘침은 여기서 판정하지 않는다 — `npm run phone` 이 네 폭 × 화면별로 맡는다.
// 한 검사가 두 가지를 판정하면 빨간불이 떴을 때 어느 쪽이 깨진 건지 모른다.
if (game.overflowPx > 0) {
  console.log(`  ⚠ 가로 넘침 ${game.overflowPx}px — 판정은 'npm run phone' 이 한다`);
}

// 사진 칸이 눌리지 않았는지. 예전에 flex 가 세로로 눌러 340×102 가 된 적이
// 있는데, 그때도 '사진 로드'는 통과했다 — 크기는 따로 재야 잡힌다.
const photoOkShape = !!game.photoBox && game.photoBox.h >= 150 && game.photoBox.w >= 150;
if (!photoOkShape) console.log(`  ⚠ 사진 칸이 눌렸다: ${JSON.stringify(game.photoBox)}`);

const ok =
  finalScreen === 'game-screen' &&
  photoOkShape &&
  !!game.exName &&
  photoOk &&
  errors.length === 0;

if (errors.length) {
  console.log(`\n=== 오류 ${errors.length}건 ===`);
  errors.slice(0, 20).forEach((e) => console.log('  ' + e.slice(0, 200)));
}
console.log(ok ? '\n통과' : '\n실패');
process.exit(ok ? 0 : 1);
