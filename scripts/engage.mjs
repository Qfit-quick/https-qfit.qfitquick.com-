// 다시 열게 만드는 장치 검사 — src/ui/engage.js (2026-10-04).
//
//     npm run build && npm run engage
//
// 브라우저 시계를 고정해(한국 시간대) 날짜를 마음대로 정하고, 기록지를 미리
// 채워 둔 채 홈의 연속 한 줄·이번 주 칸·펫·이정표 축하·지난주 리포트·아이콘
// 배지를 확인한다.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const root = path.resolve('app/dist');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(4804);

const results = [];
const check = (name, ok, info) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + JSON.stringify(info)}`); };
const browser = await chromium.launch();

// key(base, off): base 날짜(YYYY-MM-DD)에서 off 일 옮긴 날짜
const key = (base, off = 0) => { const [y, m, d] = base.split('-').map(Number); const x = new Date(y, m - 1, d + off); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

async function open({ now, workouts = [], extra = {} }) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul' });
  await ctx.clock.install({ time: new Date(now) });
  const pg = await ctx.newPage();
  const seed = { log: Object.fromEntries(workouts.map((d) => [d, { workout: true }])), extra };
  await pg.addInitScript((sd) => {
    window.__badge = [];
    navigator.setAppBadge = async (n) => { window.__badge.push('set' + (n ?? '')); };
    navigator.clearAppBadge = async () => { window.__badge.push('clear'); };
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('qfit_daylog_v1', JSON.stringify(sd.log));
    for (const [k, v] of Object.entries(sd.extra)) localStorage.setItem(k, v);
  }, seed);
  await pg.goto('http://localhost:4804/');
  await pg.clock.runFor(1500);
  await pg.click('#gate-mood-opts .gate-opt', { timeout: 1500 }).catch(() => {});
  await pg.click('#gate-drive-opts .gate-opt', { timeout: 1500 }).catch(() => {});
  await pg.clock.runFor(400);
  await pg.click('#gate-quote-card', { timeout: 1500 }).catch(() => {});
  await pg.clock.runFor(800);
  return { ctx, pg };
}
const home = (pg) => pg.evaluate(() => ({
  line: document.getElementById('streak-line')?.textContent,
  state: document.getElementById('streak-line')?.dataset.state,
  todayCell: document.querySelector('.week-day.today, .week-day.done:last-of-type') && [...document.querySelectorAll('.week-day')].map((c) => c.className.replace('week-day ', '')),
  pet: document.getElementById('pet-card')?.className,
  cele: document.querySelector('#streak-cele .streak-cele-t')?.textContent || null,
  weekly: document.getElementById('home-weekly')?.hidden === false ? document.getElementById('home-weekly').innerText.replace(/\s+/g, ' ') : null,
  badge: window.__badge.slice(-1)[0],
}));

const SUN = '2026-10-04T12:00:00+09:00'; // 일요일 정오(한국)
const TODAY = '2026-10-04';

// 1. 처음 쓰는 사람
{
  const { ctx, pg } = await open({ now: SUN });
  const h = await home(pg);
  check('처음: 연속 문구 = 첫 기록 안내, 펫은 졸고, 배지 ①', h.state === 'none' && /sleepy/.test(h.pet) && h.badge === 'set1', h);
  await ctx.close();
}
// 2. 어제·그제 운동, 오늘 아직 → "오늘 하면 3일 연속"
{
  const { ctx, pg } = await open({ now: SUN, workouts: [key(TODAY, -1), key(TODAY, -2)] });
  const h = await home(pg);
  check(`연속이 걸려 있음: "${h.line}"`, h.state === 'risk' && /3일 연속/.test(h.line), h);
  await ctx.close();
}
// 3. 사흘 전에만 운동(끊김) → "오늘 하면 다시 1일째" (예전엔 옛 숫자가 그대로 떴다)
{
  const { ctx, pg } = await open({ now: SUN, workouts: [key(TODAY, -3), key(TODAY, -4)] });
  const h = await home(pg);
  check(`끊긴 연속: "${h.line}"`, h.state === 'restart', h);
  await ctx.close();
}
// 4. 도전 실천 체크 → 이번 주 칸·연속·펫·배지에 반영 + 3일째면 축하(한 번만)
{
  const { ctx, pg } = await open({ now: SUN, workouts: [key(TODAY, -1), key(TODAY, -2)], extra: { qfit_challenge_planche_start: key(TODAY, -10) } });
  await pg.click('#home-challenge [data-chal-check]'); await pg.clock.runFor(300);
  // 다른 탭에 갔다 홈으로 — 홈이 다시 그려진다
  await pg.click('.tabbar .tab[data-screen="log-screen"]'); await pg.clock.runFor(300);
  await pg.click('.tabbar .tab[data-screen="start-screen"]'); await pg.clock.runFor(500);
  const h = await home(pg);
  const cells = h.todayCell || [];
  check(`도전 체크 후: "${h.line}" · 펫 깨어남 · 배지 지움`, h.state === 'done' && /3일/.test(h.line) && /awake/.test(h.pet) && h.badge === 'clear', h);
  check('이번 주 칸에 오늘이 체크됨(도전도 운동)', cells[6] === 'done' && cells[5] === 'done', cells);
  check(`3일 연속 축하: "${h.cele}"`, /3일 연속 달성/.test(h.cele || ''), h);
  await pg.click('#streak-cele [data-cele-close]'); await pg.clock.runFor(200);
  await pg.click('.tabbar .tab[data-screen="log-screen"]'); await pg.clock.runFor(300);
  await pg.click('.tabbar .tab[data-screen="start-screen"]'); await pg.clock.runFor(500);
  check('축하는 한 번만', (await home(pg)).cele === null, await home(pg));
  await ctx.close();
}
// 5. 월요일: 지난주 리포트(지난주 3일, 그 전 주 1일) → +2일, 닫으면 그 주엔 다시 안 뜸
{
  const MON = '2026-10-05T09:00:00+09:00'; const mon = '2026-10-05';
  const { ctx, pg } = await open({ now: MON, workouts: [key(mon, -7), key(mon, -5), key(mon, -2), key(mon, -10)] });
  let h = await home(pg);
  check(`월요일 리포트: "${h.weekly}"`, /운동 3일/.test(h.weekly || '') && /\+2일/.test(h.weekly || ''), h);
  await pg.click('#home-weekly [data-weekly-close]'); await pg.clock.runFor(200);
  await pg.reload(); await pg.clock.runFor(1500);
  await pg.click('#gate-quote-card', { timeout: 1500 }).catch(() => {}); await pg.clock.runFor(500);
  h = await home(pg);
  check('닫은 리포트는 그 주엔 다시 안 뜸', h.weekly === null, h);
  await ctx.close();
}
// 6. 목요일엔 리포트 안 띄움, 지난주·그 전 주 모두 0일이면 안 띄움
{
  const { ctx, pg } = await open({ now: '2026-10-08T09:00:00+09:00', workouts: ['2026-09-30'] });
  check('목요일엔 리포트 없음', (await home(pg)).weekly === null, await home(pg)); await ctx.close();
}
{
  const { ctx, pg } = await open({ now: '2026-10-05T09:00:00+09:00' });
  check('쉬던 사람에겐 "0일" 리포트를 안 띄움', (await home(pg)).weekly === null, await home(pg)); await ctx.close();
}
// 7. 한국 아침 7시(UTC 로는 전날)에 체크해도 오늘로 잡힌다
{
  const { ctx, pg } = await open({ now: '2026-10-04T07:00:00+09:00', workouts: [key(TODAY, -1)] });
  await pg.click('.tabbar .tab[data-screen="log-screen"]'); await pg.clock.runFor(300);
  await pg.click('[data-check="workout"]'); await pg.clock.runFor(300);
  const stored = await pg.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('qfit_daylog_v1'))).sort());
  await pg.click('.tabbar .tab[data-screen="start-screen"]'); await pg.clock.runFor(500);
  const h = await home(pg);
  check(`아침 7시 체크 → 오늘(10-04)로 저장, "${h.line}"`, stored.includes(TODAY) && h.state === 'done' && /2일/.test(h.line), { stored, h });
  await ctx.close();
}

await browser.close(); srv.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
