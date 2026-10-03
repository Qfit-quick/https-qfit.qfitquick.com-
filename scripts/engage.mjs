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
// 3b. 주 1회 쉬는 날: 토요일(10-03) 하루 빠지고 오늘(일) 아직 → 연속 유지, 토요일 칸은 '쉼'
{
  const { ctx, pg } = await open({ now: SUN, workouts: ['2026-10-01', '2026-10-02'] });
  const h = await home(pg);
  const cells = h.todayCell || [];
  check(`하루 쉬어도 유지: "${h.line}" · 토요일=${cells[5]}`, h.state === 'risk' && /3일 연속/.test(h.line) && cells[5] === 'rest', { h, cells });
  await ctx.close();
}
// 3c. 같은 주에 이틀 빠지면 끊긴다
{
  const { ctx, pg } = await open({ now: SUN, workouts: ['2026-09-30', '2026-10-01'] });
  const h = await home(pg);
  check(`같은 주 이틀 쉬면 끊김: "${h.line}"`, h.state === 'restart', h);
  await ctx.close();
}
// 3d. 주중 하루(수) 쉬고 다시 매일 → 쉰 날은 세지 않는다(월·화·목·금·토·일 = 6일)
{
  const { ctx, pg } = await open({ now: SUN, workouts: ['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-02', '2026-10-03', TODAY] });
  const h = await home(pg);
  check(`쉰 날 빼고 셈: "${h.line}"`, h.state === 'done' && /연속 6일/.test(h.line), h);
  await ctx.close();
}
// 3e. 기록 화면: 현재 연속이 최고 기록보다 크면 최고 기록도 그만큼
{
  const { ctx, pg } = await open({ now: SUN, workouts: ['2026-10-01', '2026-10-02', '2026-10-03'] });
  await pg.click('.tabbar .tab[data-screen="more-screen"]'); await pg.clock.runFor(300);
  await pg.click('#open-records-btn'); await pg.clock.runFor(500);
  const r = await pg.evaluate(() => ({ best: document.getElementById('rec-best-streak').textContent, cur: document.getElementById('rec-current-streak').textContent }));
  check(`기록 화면: 현재 ${r.cur} · 최고 ${r.best}`, /^3일/.test(r.cur) && r.best === '3일', r);
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

// 8. 서버로 보내는 '마지막 운동 날짜'에 도전 체크도 든다(예전엔 앱 완주만 → 도전만 하는 사람이 "4일 쉬었습니다")
{
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul' });
  await ctx.clock.install({ time: new Date(SUN) });
  const beats = [];
  // Playwright 는 나중에 등록한 route 를 먼저 쓴다 — 모두 받기를 먼저, 골라 받기를 나중에.
  await ctx.route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '0' }));
  await ctx.route('**/rest/v1/rpc/heartbeat', async (r) => { beats.push(JSON.parse(r.request().postData() || '{}').p_last_play_date); await r.fulfill({ status: 204, body: '' }); });
  const pg = await ctx.newPage();
  await pg.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1); localStorage.setItem('qfit_daylog_v1', JSON.stringify({ '2026-10-03': { workout: true } })); });
  await pg.goto('http://localhost:4804/'); await pg.clock.runFor(1500);
  check(`하트비트의 마지막 운동 날짜 = 도전/체크 포함(${beats[0]})`, beats[0] === '2026-10-03', beats);
  await ctx.close();
}
// 9. 매일 알림: 서버 준비 전(함수 없음 404)엔 '곧 켜져요' + 기기에 보관 → 준비되면 하트비트 때 저절로 맞춰진다
{
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul' });
  await ctx.grantPermissions(['notifications'], { origin: 'http://localhost:4804' });
  let ready = false; const setCalls = [];
  await ctx.route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '0' }));
  await ctx.route('**/rest/v1/rpc/set_daily_reminder', async (r) => { setCalls.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill(ready ? { status: 204, body: '' } : { status: 404, contentType: 'application/json', body: '{"code":"PGRST202"}' }); });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:4804/'); await pg.waitForTimeout(1200);
  await pg.click('#gate-mood-opts .gate-opt', { timeout: 1500 }).catch(() => {}); await pg.click('#gate-drive-opts .gate-opt', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(300);
  await pg.click('#gate-quote-card', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(500);
  await pg.click('#open-settings-btn'); await pg.waitForTimeout(400);
  await pg.selectOption('#daily-reminder-select', '21'); await pg.waitForTimeout(1500);
  const a = await pg.evaluate(() => ({ note: document.getElementById('reminder-note').textContent, hour: localStorage.getItem('qfit_daily_hour_v1'), synced: localStorage.getItem('qfit_daily_synced_v1'), sel: document.getElementById('daily-reminder-select').value }));
  check(`서버 준비 전: 기기에 21시 보관 + 안내("${a.note.slice(0, 16)}…")`, a.hour === '21' && a.synced === null && /곧 켜져요/.test(a.note) && setCalls.at(-1)?.p_hour === 21, { a, setCalls });
  ready = true;
  await pg.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await pg.waitForTimeout(1200);
  const b2 = await pg.evaluate(() => localStorage.getItem('qfit_daily_synced_v1'));
  check('서버가 준비되면 다음 하트비트 때 저절로 맞춰짐', b2 === '21', { b2, setCalls });
  await pg.selectOption('#daily-reminder-select', 'off'); await pg.waitForTimeout(800);
  const c = await pg.evaluate(() => ({ synced: localStorage.getItem('qfit_daily_synced_v1'), hour: localStorage.getItem('qfit_daily_hour_v1') }));
  check('끄면 서버에도 끔으로', c.synced === 'off' && c.hour === null && setCalls.at(-1)?.p_hour === null, { c, last: setCalls.at(-1) });
  await ctx.close();
}
// 10. 설치 안내: 처음 온 사람엔 없음 / 이틀 이상 + 운동 한 번 + 설치 가능하면 뜸 / 누르면 설치 창 / 닫으면 안 뜸 / 아이폰은 안내 문구
async function installCase({ visits, workouts, ua, fireBip }) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul', userAgent: ua });
  await ctx.route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '0' }));
  const pg = await ctx.newPage();
  await pg.addInitScript((sd) => {
    if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1);
    localStorage.setItem('qfit_visit_days_v1', JSON.stringify(sd.visits));
    localStorage.setItem('qfit_daylog_v1', JSON.stringify(Object.fromEntries(sd.workouts.map((d) => [d, { workout: true }]))));
  }, { visits, workouts });
  await pg.goto('http://localhost:4804/'); await pg.waitForTimeout(1200);
  await pg.click('#gate-mood-opts .gate-opt', { timeout: 1500 }).catch(() => {}); await pg.click('#gate-drive-opts .gate-opt', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(300);
  await pg.click('#gate-quote-card', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(400);
  if (fireBip) await pg.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  await pg.waitForTimeout(300);
  const st = () => pg.evaluate(() => { const b = document.getElementById('home-install'); return { shown: !!b && !b.hidden, text: (b ? b.innerText : '').replace(/\s+/g, ' '), btn: !!(b && b.querySelector('[data-install-go]')) }; });
  return { ctx, pg, st };
}
{
  const { ctx, st } = await installCase({ visits: [], workouts: [], fireBip: true });
  check('처음 온 사람에겐 설치 안내 없음', !(await st()).shown, await st()); await ctx.close();
}
{
  const { ctx, pg, st } = await installCase({ visits: ['2026-09-30'], workouts: ['2026-09-30'], fireBip: true });
  const s1 = await st();
  check(`조건이 되면 설치 안내: "${s1.text.slice(0, 22)}…"`, s1.shown && s1.btn, s1);
  await pg.click('#home-install [data-install-go]'); await pg.waitForTimeout(300);
  check('추가하기 → 브라우저 설치 창', await pg.evaluate(() => window.__prompted === true), null);
  await ctx.close();
}
{
  const { ctx, pg, st } = await installCase({ visits: ['2026-09-30'], workouts: ['2026-09-30'], fireBip: true });
  await pg.click('#home-install [data-install-close]'); await pg.waitForTimeout(200);
  await pg.reload(); await pg.waitForTimeout(1200); await pg.click('#gate-quote-card', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => {}; e.userChoice = Promise.resolve({}); window.dispatchEvent(e); }); await pg.waitForTimeout(300);
  check('닫으면 다시 안 뜸', !(await st()).shown, await st()); await ctx.close();
}
{
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const { ctx, st } = await installCase({ visits: ['2026-09-30'], workouts: ['2026-09-30'], ua: IOS, fireBip: false });
  const s1 = await st();
  check('아이폰: 공유 → 홈 화면에 추가 안내', s1.shown && /홈 화면에 추가/.test(s1.text) && !s1.btn, s1); await ctx.close();
}

await browser.close(); srv.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
