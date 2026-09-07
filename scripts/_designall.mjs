import { launch, context } from './_browser.mjs';
const b = await launch(); const p = await (await context(b)).newPage();
await p.setViewportSize({ width: 1600, height: 1100 });
await p.goto('http://localhost:5190/Q-fit.dc.html', { waitUntil: 'load' });
await p.waitForTimeout(2500);
const items = await p.evaluate(() => [...document.querySelectorAll('.railbtn')].map((e, i) => e.textContent.trim().replace(/\s+/g, ' ')));
console.log('목록', items.length);
for (let i = 0; i < items.length; i++) {
  const name = items[i].replace(/[^0-9a-zA-Z가-힣 ·()]/g, '').replace(/[ ·()]+/g, '-').slice(0, 28);
  await p.evaluate((i) => document.querySelectorAll('.railbtn')[i].click(), i);
  await p.waitForTimeout(700);
  const ph = await p.$('.bez');
  if (!ph) { console.log('건너뜀', name); continue; }
  await ph.screenshot({ path: `screenshots/design/${String(i+1).padStart(2,'0')}-${name}.png` });
}
console.log('완료');
await b.close();
