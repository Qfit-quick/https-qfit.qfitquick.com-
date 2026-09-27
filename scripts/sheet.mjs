// 바텀시트가 열리고, 네 가지 길로 닫히고, 원래 자리로 돌아오는지 본다.
//
// 닫는 길이 여럿인 게 중요하다. 예전 모드 패널은 닫는 길이 **하나도 없어서**
// 한 번 열면 시작 버튼이 사라진 채 홈으로 되돌릴 수가 없었다.
import { launch, context, DEFAULT_URL, dismissGate } from './_browser.mjs';

const URL = process.env.SHEET_URL || DEFAULT_URL;
const browser = await launch();
const ctx = await context(browser);
const page = await ctx.newPage();

const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
await dismissGate(page);

let fail = 0;
const check = (label, ok, extra = '') => {
  if (!ok) fail++;
  console.log(`  ${ok ? '통과' : '실패'}  ${label}${extra ? '  ' + extra : ''}`);
};

const state = () =>
  page.evaluate(() => {
    const sheet = document.querySelector('.sheet');
    const panel = document.getElementById('one-min-panel');
    const start = document.getElementById('one-min-start-btn');
    return {
      sheetOn: !!sheet?.classList.contains('on'),
      backdropOn: !!document.querySelector('.sheet-backdrop')?.classList.contains('on'),
      panelInSheet: !!panel?.closest('.sheet-body'),
      startVisible: !!start && getComputedStyle(start).display !== 'none',
      title: document.querySelector('.sheet-title')?.textContent ?? '',
      modeBtnClickable: !!document.getElementById('mode-pick-btn')?.offsetParent,
    };
  });

const open = async () => {
  await page.click('#one-min-start-btn');
  await page.waitForTimeout(420);
};

console.log('--- 열기 ---');
await open();
let s = await state();
check('시트가 올라온다', s.sheetOn);
check('배경이 덮인다', s.backdropOn);
check('패널이 시트 안으로 옮겨졌다', s.panelInSheet);
check('제목이 붙었다', s.title.length > 0, `"${s.title}"`);
check('시작 버튼은 그대로 있다', s.startVisible, '(예전엔 사라져서 되돌릴 수 없었다)');
check('안의 버튼을 누를 수 있다', s.modeBtnClickable);

console.log('\n--- 닫는 길 넷 ---');
await page.click('.sheet-backdrop', { position: { x: 10, y: 10 } });
await page.waitForTimeout(420);
s = await state();
check('배경을 눌러 닫힌다', !s.sheetOn);

await open();
await page.keyboard.press('Escape');
await page.waitForTimeout(420);
s = await state();
check('Esc 로 닫힌다', !s.sheetOn);

// 아래로 끌어내리기
await open();
await page.evaluate(() => {
  const el = document.querySelector('.sheet');
  // TouchEvent 는 진짜 Touch 객체를 요구한다. 평범한 {clientY} 는 거부한다.
  const touch = (y) => new Touch({ identifier: 1, target: el, clientX: 100, clientY: y });
  const fire = (type, y) =>
    el.dispatchEvent(new TouchEvent(type, {
      touches: y === null ? [] : [touch(y)], bubbles: true, cancelable: true,
    }));
  fire('touchstart', 100);
  fire('touchmove', 260);   // 160px 내림 — 문턱 100px 을 넘는다
  fire('touchend', null);
});
await page.waitForTimeout(420);
s = await state();
check('아래로 끌어내려 닫힌다', !s.sheetOn);

await open();
await page.goBack();
await page.waitForTimeout(420);
s = await state();
const screen = await page.evaluate(() => document.querySelector('.screen.active')?.id);
check('뒤로가기로 닫힌다', !s.sheetOn);
check('그때 화면은 안 넘어간다', screen === 'start-screen', `→ ${screen}`);

console.log('\n--- 닫은 뒤 ---');
s = await state();
check('패널이 원래 자리로 돌아갔다', !s.panelInSheet);
check('시작 버튼이 그대로다', s.startVisible);

console.log('\n--- 골라서 넘어가기 ---');
await open();
await page.click('#mode-pick-btn');
await page.waitForTimeout(420);
await page.click('#mode-random');
await page.waitForTimeout(500);
s = await state();
const after = await page.evaluate(() => document.querySelector('.screen.active')?.id);
check('설정 화면으로 넘어간다', after === 'setup-screen', `→ ${after}`);
check('시트는 같이 닫힌다', !s.sheetOn);

await browser.close();
if (errs.length) {
  console.log(`\n=== 오류 ${errs.length}건 ===`);
  errs.slice(0, 8).forEach((e) => console.log('  ' + e.slice(0, 160)));
  fail += errs.length;
}
console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
