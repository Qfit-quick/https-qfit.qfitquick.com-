// 앱이 실제로 뜨는지 본다. 빌드가 통과하는 것과 앱이 도는 것은 다르다.
//
// 모듈로 쪼갠 뒤 제일 흔한 사고는 "빌드는 되는데 참조가 하나 끊긴 것"이다.
// 그건 콘솔에만 나오고 빌드는 조용히 성공한다. 그래서 여기서 콘솔을 읽는다.
import { launch, context, DEFAULT_URL } from './_browser.mjs';

const URL = process.env.SMOKE_URL || DEFAULT_URL;

const browser = await launch();
const page = await (await context(browser)).newPage();

const errors = [];
const warnings = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning') warnings.push(m.text());
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => {
  // warmup.mp4 는 preload="auto" 라 8.6MB 를 무조건 받기 시작하고, 헤드리스가
  // 페이지를 닫으면서 중단시킨다. 여기서는 오탐이지만 실제로도 문제라서 경고로 남긴다.
  // (5단계에서 preload="none" 으로 고친다)
  const line = `${r.url()} — ${r.failure()?.errorText}`;
  if (r.url().includes('warmup.mp4')) warnings.push(`[중단됨] ${line}`);
  else errors.push(`[404/실패] ${line}`);
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

const probe = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const screens = [...document.querySelectorAll('.screen')].map((e) => e.id);
  return {
    screens: screens.length,
    activeScreen: q('.screen.active')?.id ?? null,
    // 앱이 실제로 초기화됐는지: JS 가 채우는 것들
    playBtnText: q('#play-btn')?.textContent?.trim() ?? null,
    exGridChildren: q('#ex-grid')?.children.length ?? -1,
    weekStripChildren: q('.week-strip')?.children.length ?? -1,
    // 스타일이 붙었는지
    bodyBg: getComputedStyle(document.body).backgroundImage.slice(0, 40),
    appMaxWidth: getComputedStyle(q('#app')).maxWidth,
    // 토큰이 실제로 값으로 풀리는지. 특정 hex 를 기대하지 않는다 —
    // 테마마다 다르고 디자인이 바뀔 때마다 검사가 거짓 실패한다.
    tokens: Object.fromEntries(
      ['--accent', '--text', '--surface', '--text-dim', '--tap', '--t-md'].map((k) => [
        k, getComputedStyle(document.documentElement).getPropertyValue(k).trim(),
      ])
    ),
    // 오디오 잠금 해제용 소리. 일부 폰은 진짜 <audio> 재생이 있어야 소리가 열린다.
    // 없으면 앱은 멀쩡히 돌고 소리만 안 나는데, 콘솔에는 아무것도 안 뜬다.
    unlockAudio: (() => {
      const a = document.getElementById('test-audio');
      return a ? { present: true, src: a.getAttribute('src'), ready: a.readyState } : { present: false };
    })(),
    // 옛 이름이 새 토큰으로 이어져 있는지. 끊기면 CSS 절반이 색을 잃는다.
    aliasOk: (() => {
      const cs = getComputedStyle(document.documentElement);
      const g = (k) => cs.getPropertyValue(k).trim();
      return g('--card') === g('--surface') && g('--ink') === g('--text')
        && g('--muted') === g('--text-dim');
    })(),
  };
});

console.log('--- 화면 ---');
console.log(`  .screen 개수      ${probe.screens}  (기대 19)`);
console.log(`  현재 활성 화면    ${probe.activeScreen}`);
console.log('--- JS 초기화 ---');
console.log(`  #play-btn 문구    ${JSON.stringify(probe.playBtnText)}`);
console.log(`  주간 스트립 칸    ${probe.weekStripChildren}  (기대 7)`);
console.log('--- CSS ---');
for (const [k, v] of Object.entries(probe.tokens)) {
  console.log(`  ${k.padEnd(16)} ${JSON.stringify(v)}`);
}
console.log(`  옛 이름 연결      ${probe.aliasOk}`);
console.log(`  잠금해제 오디오   ${JSON.stringify(probe.unlockAudio)}`);
console.log(`  #app max-width    ${probe.appMaxWidth}  (380~640px 사이면 통과)`);
console.log(`  body 배경         ${probe.bodyBg}...`);

if (warnings.length) {
  console.log(`\n--- 경고 ${warnings.length}건 ---`);
  warnings.slice(0, 10).forEach((w) => console.log('  ' + w.slice(0, 160)));
}

await browser.close();

if (errors.length) {
  console.log(`\n=== 오류 ${errors.length}건 ===`);
  errors.slice(0, 25).forEach((e) => console.log('  ' + e.slice(0, 200)));
  process.exit(1);
}

const ok =
  probe.screens === 19 &&
  probe.activeScreen === 'start-screen' &&
  probe.weekStripChildren === 7 &&
  probe.aliasOk &&
  probe.unlockAudio.present &&
  probe.unlockAudio.ready > 0 &&
  Object.values(probe.tokens).every((v) => v !== '') &&
  // 정확한 px 을 기대하지 않는다 — 디자인을 만질 때마다 검사가 거짓 실패한다.
  // 앱 상자가 폰 폭 안에서 제한되고 있다는 것만 본다.
  parseInt(probe.appMaxWidth, 10) >= 380 &&
  parseInt(probe.appMaxWidth, 10) <= 640;

console.log(ok ? '\n통과' : '\n실패 — 위 값 중 기대와 다른 것이 있다');
process.exit(ok ? 0 : 1);
