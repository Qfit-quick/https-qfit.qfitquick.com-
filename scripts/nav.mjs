// 탭바와 뒤로가기가 실제로 도는지 본다.
//
// 화면이 바뀌었는지만 보면 부족하다. 탭이 화면을 '켜기만' 하고 채우는 렌더를
// 건너뛰면, 껍데기만 있는 화면이 뜨는데 그건 스크린샷으로도 잘 안 보인다.
// (실제로 캡처 도구가 그 상태를 찍어서 멀쩡한 것을 고칠 뻔했다.)
// 그래서 화면마다 "채워졌으면 있어야 하는 것"을 같이 확인한다.
import { launch, context, DEFAULT_URL, dismissGate } from './_browser.mjs';

const URL = process.env.NAV_URL || DEFAULT_URL;

// [탭 라벨, 화면 id, 채워졌는지 보는 방법]
//
// src/ui/nav.js 의 TABS 순서와 맞춘다(2026-09-27 재확인 — 예전엔 탭에
// '기록'이 직접 있었는데, 지금은 더보기 메뉴 밑으로 들어가 탭이 아니다.
// 그걸 모르고 예전 순서 그대로 두면 '기록' 단계에서 탭 자체를 못 찾아
// 조용히 타임아웃만 난다).
const TABS = [
  ['홈', 'start-screen', () => document.querySelectorAll('.week-strip .week-day').length === 7],
  ['체크', 'log-screen', () => document.querySelectorAll('#log-check .log-row').length === 5],
  ['프로그램', 'programs-screen', () => document.getElementById('programs-body')?.children.length > 0],
  // 목표(구 계획)는 신체정보가 없으면 빈 안내만 나온다. 검사는 정보를 안 넣은
  // 상태로 도는 것이 맞다 — 처음 켠 사람이 보는 것이 그 화면이기 때문이다.
  ['목표', 'plan-screen', () => !document.getElementById('plan-empty')?.hidden],
  ['도전', 'challenge-screen', () => document.getElementById('challenge-tabs')?.children.length > 0],
  // 더보기는 메뉴가 채워지는 화면이라 그걸 본다.
  ['더보기', 'more-screen', () => document.querySelectorAll('#more-screen .menu-btn').length >= 2],
];

const browser = await launch();
const page = await (await context(browser)).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
await dismissGate(page);

let fail = 0;
const active = () => page.evaluate(() => document.querySelector('.screen.active')?.id);

console.log('--- 탭 이동 ---');
for (const [label, id, filled] of TABS) {
  await page.click(`.tab[data-screen="${id}"]`);
  await page.waitForTimeout(400);
  const now = await active();
  const isFilled = await page.evaluate(filled);
  const onTab = await page.evaluate(
    (i) => document.querySelector('.tab.on')?.dataset.screen === i, id);
  const ok = now === id && isFilled && onTab;
  if (!ok) fail++;
  console.log(`  ${ok ? '통과' : '실패'}  ${label.padEnd(4)} → ${String(now).padEnd(20)} 내용 ${isFilled ? 'O' : 'X'}  탭표시 ${onTab ? 'O' : 'X'}`);
}

console.log('\n--- 뒤로가기 ---');
// 지금 '더보기'. 탭을 누른 순서대로 되짚어 나와야 한다(위 TABS 순서의
// 마지막 두 칸 — 도전 → 목표).
await page.goBack();
await page.waitForTimeout(400);
let now = await active();
console.log(`  ${now === 'challenge-screen' ? '통과' : '실패'}  한 번 뒤로 → ${now}  (기대 challenge-screen)`);
if (now !== 'challenge-screen') fail++;

await page.goBack();
await page.waitForTimeout(400);
now = await active();
console.log(`  ${now === 'plan-screen' ? '통과' : '실패'}  두 번 뒤로 → ${now}  (기대 plan-screen)`);
if (now !== 'plan-screen') fail++;

console.log('\n--- 운동 중 ---');
await page.click('.tab[data-screen="start-screen"]');
await page.waitForTimeout(300);
await page.click('#one-min-start-btn');
await page.waitForTimeout(300);
await page.click('#mode-pick-btn');
await page.waitForTimeout(300);
await page.click('#mode-random');
await page.waitForTimeout(300);
await page.evaluate(() => {
  const t = document.getElementById('warmup-toggle');
  if (t && t.checked) t.click();
});
await page.click('#play-btn');
// 미리보기는 저절로 넘어가지 않는다(설계 06) — 시작을 누른다
await page.waitForTimeout(700);
await page.click('#preview-start-btn');
await page.waitForTimeout(2600); // 카운트다운 3-2-1

now = await active();
const barHidden = await page.evaluate(() => {
  const b = document.querySelector('.tabbar');
  return b ? getComputedStyle(b).opacity === '0' || b.getBoundingClientRect().top >= window.innerHeight - 1 : false;
});
console.log(`  ${now === 'game-screen' ? '통과' : '실패'}  운동 화면 도달 → ${now}`);
console.log(`  ${barHidden ? '통과' : '실패'}  운동 중 탭바 감춤 → ${barHidden}`);
if (now !== 'game-screen') fail++;
if (!barHidden) fail++;

// 운동 중 뒤로가기 = 나가지 말고 일시정지
await page.goBack();
await page.waitForTimeout(500);
const afterBack = await active();
const paused = await page.evaluate(() =>
  document.getElementById('pause-overlay')?.classList.contains('on'));
console.log(`  ${afterBack === 'game-screen' ? '통과' : '실패'}  뒤로가기로 안 빠져나감 → ${afterBack}`);
console.log(`  ${paused ? '통과' : '실패'}  대신 일시정지됨 → ${paused}`);
if (afterBack !== 'game-screen') fail++;
if (!paused) fail++;

await browser.close();
if (errs.length) {
  console.log(`\n=== 오류 ${errs.length}건 ===`);
  errs.slice(0, 10).forEach((e) => console.log('  ' + e.slice(0, 160)));
  fail += errs.length;
}
console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
