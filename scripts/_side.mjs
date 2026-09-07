import { launch, context } from './_browser.mjs';
const b = await launch(); const p = await (await context(b)).newPage();
await p.setViewportSize({ width: 390, height: 844 });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('#eruda')?.remove());
await p.screenshot({ path: 'screenshots/mine-home.png' });
console.log('찍음');
await b.close();
