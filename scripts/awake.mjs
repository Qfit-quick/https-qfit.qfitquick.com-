// 운동 중 화면 꺼짐 방지 검사 — src/core/wakeLock.js.
//
//     npm run build && npm run awake
//     AWAKE_URL=https://qfit.qfitquick.com/ npm run awake   # 배포본 그대로
//
// 2026-10-03 "도전 실행 중인데 화면이 자꾸 꺼진다"를 고치면서 만들었다.
// 그 전엔 꺼짐 방지가 운동 화면(IMMERSIVE)에만 걸려서 도전·프로그램 탭은
// 빠져 있었고, 아이폰 홈 화면 앱에선 Wake Lock API 가 먹지도 않았다.
//
// 브라우저의 navigator.wakeLock 을 가짜로 바꿔 끼워 걸고 푸는 것을 세고,
// 아이폰 흉내(UA)에선 꺼짐 방지 영상이 실제로 재생 중인지 본다.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const root = path.resolve('app/dist');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const BASE = process.env.AWAKE_URL || 'http://localhost:4800/';
if (!process.env.AWAKE_URL) srv.listen(4800);

const results = [];
const check = (name, ok, info) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + JSON.stringify(info)}`); };

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function run({ ua, label }) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, userAgent: ua });
  await ctx.route('**/*supabase.co/**', (r) => r.fulfill({ status: 200, body: '[]' }));
  const pg = await ctx.newPage();
  // 가짜 Wake Lock: 지금 걸려 있는 개수와 총 요청 수를 센다. __osRelease() 로
  // '기기가 멋대로 푼' 상황을 흉내 낸다.
  await pg.addInitScript(() => {
    const st = { active: new Set(), requests: 0 };
    window.__wl = st;
    const mk = () => {
      const listeners = [];
      const s = {
        released: false,
        addEventListener: (ev, fn) => { if (ev === 'release') listeners.push(fn); },
        release: async () => { if (s.released) return; s.released = true; st.active.delete(s); listeners.forEach((f) => f()); },
      };
      return s;
    };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { st.requests++; const s = mk(); st.active.add(s); return s; } } });
    window.__osRelease = () => { [...st.active].forEach((s) => s.release()); };
  });
  await pg.goto(BASE); await pg.waitForTimeout(1200);
  await pg.click('#gate-mood-opts .gate-opt').catch(() => {}); await pg.click('#gate-drive-opts .gate-opt').catch(() => {}); await pg.waitForTimeout(300);
  await pg.click('#gate-quote-card').catch(() => {}); await pg.waitForTimeout(600);

  const state = () => pg.evaluate(() => {
    const v = [...document.querySelectorAll('video')].find((x) => x.src.startsWith('data:video/mp4'));
    return { locks: window.__wl.active.size, requests: window.__wl.requests, video: v ? (v.paused ? 'paused' : 'playing') : 'none', screen: document.querySelector('.screen.active')?.id };
  });
  const tab = async (id) => { await pg.click(`.tabbar .tab[data-screen="${id}"]`); await pg.waitForTimeout(500); };
  const wantVideo = label === 'iPhone';
  const awake = (s) => s.locks === 1 && (!wantVideo || s.video === 'playing');
  const asleep = (s) => s.locks === 0 && s.video !== 'playing';

  let s = await state();
  check(`${label}: 홈 — 잠금 없음`, asleep(s), s);

  await tab('challenge-screen'); s = await state();
  check(`${label}: 도전 탭 — 화면 안 꺼짐`, awake(s), s);

  await tab('programs-screen'); s = await state();
  check(`${label}: 프로그램 탭 — 화면 안 꺼짐`, awake(s), s);

  await tab('start-screen'); s = await state();
  check(`${label}: 홈으로 나오면 — 잠금 풀림`, asleep(s), s);

  // 도전 타이머를 켜고 다른 탭으로 — 타이머가 도는 동안은 계속 잠근다.
  await tab('challenge-screen');
  await pg.click('#challenge-timer-toggle-btn'); await pg.waitForTimeout(300);
  await tab('start-screen'); s = await state();
  check(`${label}: 도전 타이머 도는 중 홈으로 — 계속 안 꺼짐`, awake(s), s);

  // 기기가 멋대로 잠금을 풀면 다시 건다.
  await pg.evaluate(() => window.__osRelease()); await pg.waitForTimeout(800); s = await state();
  check(`${label}: 기기가 잠금을 풀어도 — 다시 걸림`, awake(s), s);

  // 앱을 내렸다가(숨김) 다시 올리면 다시 건다.
  await pg.evaluate(() => {
    window.__osRelease();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await pg.waitForTimeout(800); s = await state();
  check(`${label}: 앱을 내렸다 올려도 — 다시 걸림`, awake(s), s);

  // 꺼짐 방지 영상이 밖의 이유(알림·전화·다른 앱 소리)로 멈추고 잠금도 풀린
  // 경우 — 2026-10-03 진짜 브라우저 3분 검사에서 이게 회복되지 않는 구멍이
  // 나왔다. 감시자(5초)·영상 pause 감지로 6초 안에 돌아와야 한다.
  await pg.evaluate(() => { window.__osRelease(); document.querySelectorAll('video').forEach((v) => v.pause()); });
  await pg.waitForTimeout(6000); s = await state();
  check(`${label}: 영상이 멈추고 잠금도 풀려도 — 6초 안에 회복`, awake(s), s);

  // 타이머를 멈추면(홈에 있으니) 풀린다.
  await tab('challenge-screen');
  await pg.click('#challenge-timer-toggle-btn'); await pg.waitForTimeout(300);
  await tab('start-screen'); s = await state();
  check(`${label}: 타이머 멈추고 홈 — 잠금 풀림`, asleep(s), s);

  // 운동 실행 화면(타바타 실행 — IMMERSIVE)도 잠근다.
  await tab('more-screen');
  await pg.click('#open-tabata-btn'); await pg.waitForTimeout(400);
  await pg.click('#tabata-start-btn'); await pg.waitForTimeout(800);
  s = await state();
  check(`${label}: 타바타 실행 중(${s.screen}) — 화면 안 꺼짐`, s.screen === 'tabata-run-screen' && awake(s), s);

  await b.close();
}

await run({ ua: undefined, label: 'Chrome' });
await run({ ua: IPHONE, label: 'iPhone' });
if (!process.env.AWAKE_URL) srv.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
