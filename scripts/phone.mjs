// 폰에서 가로로 밀리는지를 숫자로 잰다.
//
// 그림으로는 "밀린 것"과 "원래 그런 것"을 구별할 수 없어서 몇 달을 지나치게 된다.
// 그래서 px 로 재고, 화면마다 따로 잰다 — 한 화면만 보고는 어디가 틀어졌는지 모른다.
import { launch, IPHONE_12, DEFAULT_URL, seedCheckin } from './_browser.mjs';

const URL = process.env.PHONE_URL || DEFAULT_URL;

// 기준 기기는 아이폰 12. 나머지는 위아래 폭을 잡아 두는 것이다.
const DEVICES = [
  { name: 'iPhone SE', w: 375, h: 667 },
  { name: 'iPhone 12', w: 390, h: 664 },
  { name: 'iPhone 12 Pro Max', w: 428, h: 746 },
  { name: '가로 (12)', w: 664, h: 390 },
];

const SCREENS = [
  'start-screen', 'more-screen', 'ai-quiz-screen', 'settings-screen',
  'routines-screen', 'manual-select-screen', 'account-screen', 'setup-screen',
  'records-screen', 'recovery-screen', 'video-gallery-screen',
  'game-screen', 'result-screen',
  // 계획·기록지·신체정보. 표가 셋(끼니·외식·요일)이나 들어 있어서
  // 가로로 밀릴 위험이 다른 화면보다 크다 — 여기가 제일 먼저 새는 자리다.
  'plan-screen', 'body-screen', 'log-screen',
];

const browser = await launch();
const rows = [];

for (const d of DEVICES) {
  const page = await browser.newPage({
    ...IPHONE_12,
    viewport: { width: d.w, height: d.h },
  });
  // 하루 첫 설문을 미리 지나 둔다. 관문이 앱을 덮고 있으면 화면 폭을 잴 수 없다.
  await page.addInitScript(seedCheckin);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const res = await page.evaluate((screens) => {
    const all = [...document.querySelectorAll('.screen')];
    const out = {};
    for (const id of screens) {
      const el = document.getElementById(id);
      if (!el) continue;
      all.forEach((s) => s.classList.remove('active'));
      el.classList.add('active');
      void document.body.offsetHeight;

      const over = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      let culprit = null;
      if (over > 0) {
        // 숨은 화면도 레이아웃은 살아 있다(.screen 은 opacity:0 일 뿐이다).
        // 그래서 활성 화면 안만 뒤지면 다른 화면의 요소가 범인일 때 못 찾는다.
        let worst = window.innerWidth;
        document.querySelectorAll('body *').forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          if (r.right > worst) {
            worst = r.right;
            const scr = n.closest('.screen');
            culprit = (n.id ? '#' + n.id : n.tagName.toLowerCase()) +
              (typeof n.className === 'string' && n.className
                ? '.' + n.className.trim().split(/\s+/)[0] : '') +
              (scr && scr.id !== id ? ` (${scr.id} 의 것)` : '');
          }
        });
        // DOM 요소로 설명이 안 되면 의사요소다. ::before/::after 는 querySelectorAll
        // 로 안 잡히므로, 여기서 말해 주지 않으면 범인 칸이 비어 있는 채로 남는다.
        // 실제로 #app::before{inset:-40px} 이 그렇게 숨어 있었다.
        if (Math.round(worst) < document.documentElement.scrollWidth - 1) {
          culprit = `${culprit ?? '?'} + ::before/::after 의심 (DOM 최대 ${Math.round(worst)} < 문서 ${document.documentElement.scrollWidth})`;
        }
      }
      out[id] = { over, culprit };
    }
    return out;
  }, SCREENS);

  for (const [id, v] of Object.entries(res)) rows.push({ dev: d.name, id, ...v });
  await page.close();
}
await browser.close();

const bad = rows.filter((r) => r.over > 0);

if (!bad.length) {
  console.log(`${DEVICES.length}개 폭 × ${SCREENS.length}개 화면 — 가로 넘침 0`);
  process.exit(0);
}

console.log('기기'.padEnd(20) + '화면'.padEnd(24) + '넘침'.padEnd(8) + '가장 튀어나온 것');
console.log('-'.repeat(84));
for (const r of bad) {
  console.log(
    r.dev.padEnd(20) + r.id.padEnd(24) + (r.over + 'px').padEnd(8) + (r.culprit ?? '')
  );
}
console.log(`\n넘치는 칸 ${bad.length} / ${rows.length}`);
process.exit(1);
