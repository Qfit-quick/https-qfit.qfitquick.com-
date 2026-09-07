import { launch, context } from './_browser.mjs';
const b = await launch(); const p = await (await context(b)).newPage();
await p.setViewportSize({ width: 390, height: 844 });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
const r = await p.evaluate(() => {
  const g = (sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return '없음';
    const c = getComputedStyle(el), box = el.getBoundingClientRect();
    const o = { w: Math.round(box.width), h: Math.round(box.height) };
    props.forEach(k => o[k] = c[k]);
    return o;
  };
  return {
    '로고': g('.hero-logo, .brand, .logo, h1', ['fontSize','fontWeight','lineHeight','letterSpacing','fontFamily']),
    'primary': g('#one-min-start-btn', ['minHeight','borderRadius','fontSize','fontWeight','backgroundColor']),
    '탭바': g('.tabbar', ['height','paddingBottom','borderTopWidth','backgroundColor']),
    '탭': g('.tab', ['gap','minHeight','fontSize','fontWeight','color']),
    '탭아이콘': g('.tab svg', ['strokeWidth']),
    '화면패딩': g('.screen.active', ['paddingLeft','paddingRight','paddingTop','rowGap']),
    '카드': g('.card, .menu-box, .week-card', ['borderRadius','borderWidth','backgroundColor','padding']),
    '큰제목': g('.lb-title', ['fontSize','fontWeight','lineHeight','letterSpacing']),
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
