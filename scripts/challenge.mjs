// 도전(챌린지 트래커) 검사 — 타이머가 앱이 닫혔다 열려도 이어지는지, 실천
// 달력(하루·주 단위 체크)이 제대로 도는지.
//
//     npm run build && npm run challenge
//
// 2026-10-03 "오래 홈 화면으로 나가면 운동한 게 초기화된다"·"기록 완료
// 0/24주만으로는 알기 번거롭다"를 고치면서 만들었다.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('app/dist');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2':'font/woff2' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(4802);
const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const res = []; const check = (n, ok, info) => { res.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  ' + JSON.stringify(info))); };
const enter = async () => {
  await pg.waitForTimeout(1200);
  await pg.click('#gate-mood-opts .gate-opt', { timeout: 1500 }).catch(()=>{}); await pg.click('#gate-drive-opts .gate-opt', { timeout: 1500 }).catch(()=>{}); await pg.waitForTimeout(300);
  await pg.click('#gate-quote-card', { timeout: 1500 }).catch(()=>{}); await pg.waitForTimeout(600);
  await pg.click('.tabbar .tab[data-screen="challenge-screen"]'); await pg.waitForTimeout(600);
};
const disp = () => pg.evaluate(() => document.getElementById('challenge-timer-display').textContent);
const sec = (s) => s.split(':').map(Number).reduce((a, x) => a * 60 + x, 0);
await pg.goto('http://localhost:4802/'); await enter();

// ── 타이머 ──
await pg.click('#challenge-timer-toggle-btn'); await pg.waitForTimeout(3200);
const before = sec(await disp());
// 앱이 완전히 닫혔다 열림(새로 고침 = 메모리에서 지워진 것과 같다)
await pg.reload(); await enter(); await pg.waitForTimeout(1500);
const after = sec(await disp());
const awake1 = await pg.evaluate(() => window.qfitAwakeStatus());
check('앱이 닫혔다 열려도 타이머 이어짐', before >= 3 && after >= before + 1, { before, after });
check('다시 열었을 때 타이머가 돌고 있으면 화면 꺼짐 방지도 다시 걸림', awake1.reasons.includes('challenge-timer'), awake1);
// 2시간 나가 있었던 것 흉내: 시작 시각을 2시간 전으로
await pg.evaluate(() => { const v = JSON.parse(localStorage.getItem('qfit_challenge_timer_v1')); v.startedAt -= 2 * 3600 * 1000; localStorage.setItem('qfit_challenge_timer_v1', JSON.stringify(v)); });
await pg.reload(); await enter(); await pg.waitForTimeout(800);
const long = await disp();
check(`2시간 나가 있다 와도 이어짐 (${long})`, sec(long) >= 2 * 3600, { long });
await pg.click('#challenge-timer-toggle-btn'); await pg.waitForTimeout(1500);
const p1 = await disp(); await pg.waitForTimeout(1500); const p2 = await disp();
check('일시정지하면 멈춤', p1 === p2, { p1, p2 });
await pg.reload(); await enter();
check('일시정지 상태도 저장됨', (await disp()) === p2, { now: await disp(), p2 });
await pg.click('#challenge-timer-reset-btn'); await pg.waitForTimeout(300);
check('초기화', (await disp()) === '00:00', await disp());

// ── 실천 달력 ──
const dk = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const txt = () => pg.evaluate(() => document.getElementById('challenge-days')?.innerText.replace(/\s+/g, ' ').slice(0, 120));
check('시작일 없으면 안내 + 오늘부터 시작 버튼', await pg.evaluate(() => !!document.querySelector('[data-days-start]')), await txt());
// 시작일 10일 전으로
await pg.evaluate((d) => { const i = document.getElementById('challenge-start-date'); i.value = d; i.dispatchEvent(new Event('change')); }, dk(-10));
await pg.waitForTimeout(400);
const grid = await pg.evaluate(() => ({ cells: document.querySelectorAll('.challenge-day').length, disabled: document.querySelectorAll('.challenge-day:disabled').length, rows: document.querySelectorAll('.challenge-days-wk').length }));
check('시작 10일 전 → 2주(14칸), 앞날은 막힘', grid.cells === 14 && grid.rows === 2 && grid.disabled === 3, grid);
// 지난 날(3일 전)과 오늘 체크
await pg.click(`.challenge-day[data-day="${dk(-3)}"]`); await pg.waitForTimeout(300);
await pg.click(`.challenge-day[data-day="${dk(0)}"]`); await pg.waitForTimeout(300);
const st = await pg.evaluate(() => document.querySelector('.challenge-days-stats').textContent);
check(`지난 날·오늘 체크 → 통계 (${st})`, /총 2일/.test(st), st);
const wk = await pg.evaluate((d) => JSON.parse(localStorage.getItem('qfit_daylog_v1') || '{}')[d]?.workout, dk(-3));
check('지난 날 체크하면 그날 기록지 운동 칸도 켜짐', wk === true, wk);
const todayBtn = await pg.evaluate(() => document.getElementById('challenge-daily-check-btn').classList.contains('done'));
check('달력에서 오늘 체크 = 오늘 버튼도 체크됨', todayBtn, todayBtn);
// 다시 누르면 꺼짐
await pg.click(`.challenge-day[data-day="${dk(-3)}"]`); await pg.waitForTimeout(300);
check('다시 누르면 해제', /총 1일/.test(await pg.evaluate(() => document.querySelector('.challenge-days-stats').textContent)), await txt());
// 주차 기록 적으면 그 주 줄에 기록✓
const logged = await pg.evaluate(() => { const row = document.querySelector('.challenge-week-log-row'); const inp = row?.querySelector('input'); if (inp) { inp.value = '30'; inp.dispatchEvent(new Event('change')); return 'input'; } const b2 = row?.querySelector('.challenge-bool-btn'); b2?.click(); return 'bool'; });
await pg.waitForTimeout(400);
check(`주차 기록(${logged}) 적으면 1주 줄에 기록✓`, await pg.evaluate(() => !!document.querySelector('.challenge-days-logged')), await txt());
await pg.evaluate(() => document.getElementById('challenge-days').scrollIntoView({ block: 'center' })); await pg.waitForTimeout(300);
await (await pg.$('#challenge-days')).screenshot({ path: process.env.TEMP + '/days.png' });
// 시작 40일 전 → 최근 4주만 + 모두 보기
await pg.evaluate((d) => { const i = document.getElementById('challenge-start-date'); i.value = d; i.dispatchEvent(new Event('change')); }, dk(-40));
await pg.waitForTimeout(300);
const r4 = await pg.evaluate(() => document.querySelectorAll('.challenge-days-wk').length);
await pg.click('[data-days-more]'); await pg.waitForTimeout(300);
const rAll = await pg.evaluate(() => document.querySelectorAll('.challenge-days-wk').length);
check(`긴 기간: 최근 4주만(${r4}) → 모두 보기(${rAll})`, r4 === 4 && rAll === 6, { r4, rAll });
const over = await pg.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('#challenge-days *')].filter(e => e.getBoundingClientRect().right > vw + 1).length; });
check('달력이 화면 밖으로 안 나감', over === 0, over);
// ── 들어올 때 고르는 트랙(2026-10-03: 늘 턱걸이였다) ──
async function activeTabFor(seed) {
  const c2 = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  const p2 = await c2.newPage();
  await p2.addInitScript((sd) => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1); for (const [k, v] of Object.entries(sd)) localStorage.setItem(k, v); }, seed);
  await p2.goto('http://localhost:4802/'); await p2.waitForTimeout(1200);
  await p2.click('#gate-mood-opts .gate-opt', { timeout: 1500 }).catch(()=>{}); await p2.click('#gate-drive-opts .gate-opt', { timeout: 1500 }).catch(()=>{}); await p2.waitForTimeout(300);
  await p2.click('#gate-quote-card', { timeout: 1500 }).catch(()=>{}); await p2.waitForTimeout(500);
  await p2.click('.tabbar .tab[data-screen="challenge-screen"]'); await p2.waitForTimeout(500);
  const act2 = () => p2.evaluate(() => document.querySelector('.challenge-tab-btn.active')?.textContent || '');
  return { p2, c2, act2 };
}
{
  const { c2, act2 } = await activeTabFor({});
  check('기록 없으면 턱걸이', /턱걸이/.test(await act2()), await act2()); await c2.close();
}
{
  const { c2, act2 } = await activeTabFor({ 'qfit_challenge_planche_logs:days': JSON.stringify({ [dk(-1)]: true }), 'qfit_challenge_planche_start': dk(-5) });
  check('플란체만 하고 있으면 처음 열 때 플란체', /플란체/.test(await act2()), await act2()); await c2.close();
}
{
  const { c2, act2 } = await activeTabFor({ 'qfit_challenge_pullup_start': dk(-60), 'qfit_challenge_planche_logs:days': JSON.stringify({ [dk(0)]: true }) });
  check('턱걸이는 예전에, 플란체를 최근에 → 플란체', /플란체/.test(await act2()), await act2()); await c2.close();
}
{
  const { p2, c2, act2 } = await activeTabFor({ 'qfit_challenge_planche_logs:days': JSON.stringify({ [dk(0)]: true }) });
  await p2.evaluate(() => [...document.querySelectorAll('.challenge-tab-btn')].find((x) => /물구나무/.test(x.textContent))?.click()); await p2.waitForTimeout(300);
  await p2.reload(); await p2.waitForTimeout(1200);
  await p2.click('#gate-quote-card', { timeout: 1500 }).catch(()=>{}); await p2.waitForTimeout(400);
  await p2.click('.tabbar .tab[data-screen="challenge-screen"]'); await p2.waitForTimeout(500);
  check('직접 고른 트랙은 앱을 다시 열어도 그대로', /물구나무/.test(await act2()), await act2()); await c2.close();
}
// ── 홈의 '진행 중인 도전' 카드(2026-10-04) ──
{
  const { p2, c2 } = await activeTabFor({});
  await p2.click('.tabbar .tab[data-screen="start-screen"]'); await p2.waitForTimeout(400);
  check('진행 중인 도전이 없으면 홈 카드 숨김', await p2.evaluate(() => document.getElementById('home-challenge').hidden), null); await c2.close();
}
{
  const { p2, c2 } = await activeTabFor({ 'qfit_challenge_planche_start': dk(-15), 'qfit_challenge_planche_logs:days': JSON.stringify({ [dk(-1)]: true }) });
  await p2.click('.tabbar .tab[data-screen="start-screen"]'); await p2.waitForTimeout(400);
  const title = await p2.evaluate(() => document.querySelector('#home-challenge .home-chal-t')?.textContent);
  check(`홈 카드: ${title}`, /플란체 · 3주차/.test(title || ''), title);
  await p2.click('#home-challenge [data-chal-check]'); await p2.waitForTimeout(300);
  const st2 = await p2.evaluate((d) => ({ btn: document.querySelector('#home-challenge [data-chal-check]').classList.contains('done'), saved: JSON.parse(localStorage.getItem('qfit_challenge_planche_logs:days'))[d], workout: JSON.parse(localStorage.getItem('qfit_daylog_v1') || '{}')[d]?.workout }), dk(0));
  check('홈에서 오늘 체크 → 저장 + 기록지 운동 칸', st2.btn && st2.saved && st2.workout, st2);
  await p2.evaluate(() => document.getElementById('home-challenge').scrollIntoView({ block: 'center' })); await p2.waitForTimeout(200);
  await (await p2.$('#home-challenge')).screenshot({ path: process.env.TEMP + '/home-chal.png' });
  await p2.click('#home-challenge [data-chal-open]'); await p2.waitForTimeout(600);
  const there = await p2.evaluate((d) => ({ screen: document.querySelector('.screen.active')?.id, tab: document.querySelector('.challenge-tab-btn.active')?.textContent, todayOn: document.querySelector(`.challenge-day[data-day="${d}"]`)?.classList.contains('on') }), dk(0));
  check('카드 누르면 플란체 화면으로 + 오늘 체크 반영', there.screen === 'challenge-screen' && /플란체/.test(there.tab) && there.todayOn, there);
  await c2.close();
}
console.log('page errors:', errs); console.log(`${res.filter(Boolean).length}/${res.length} passed`); process.exitCode = res.every(Boolean) && !errs.length ? 0 : 1;
await b.close(); srv.close();
