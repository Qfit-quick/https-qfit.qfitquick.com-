// 뒤로가기 검사 — 홈·더보기·설정에서 눌러 들어간 모든 화면이, 머리의 ← 와
// 브라우저(안드로이드) 뒤로가기 둘 다로 **들어온 화면**으로 돌아오는지 본다.
//
//     npm run build && npm run backnav
//
// 2026-10-02 에 "더보기 → 내 루틴 → 뒤로 하면 홈으로 간다"를 고치면서
// 만들었다. 그 전엔 뒤로 버튼마다 갈 곳이 박혀 있어서, 다른 문으로 들어오면
// 엉뚱한 곳으로 나갔다(ui/nav.js 의 goBack 참고). 진입 버튼을 손으로 적지
// 않고 화면을 훑어 찾으므로, 새 줄을 추가해도 이 검사가 따라간다.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const root = path.resolve('app/dist');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(4793);
const ORIGIN = 'http://localhost:4793/';

// 이 화면들로 넘어가는 버튼은 '뒤로' 검사 대상이 아니다 — 운동 흐름이거나
// 탭(탭바로 오가는 화면)이라 '들어온 곳으로 돌아간다'는 규칙이 없다.
const SKIP_TARGETS = new Set([
  'start-screen', 'log-screen', 'programs-screen', 'plan-screen', 'challenge-screen', 'more-screen',
  'wod-preview-screen', 'warmup-screen', 'countdown-screen', 'game-screen', 'result-screen',
  'heartgame-screen', 'amrap-screen', 'circuit-screen', 'quick-screen', 'tabata-run-screen', 'senior-run-screen',
]);

const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
await ctx.route('**/*supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await ctx.route('**/api/**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message));
await pg.goto(ORIGIN); await pg.waitForTimeout(1200);
// 관문(설문·명언)을 지난다.
await pg.click('#gate-mood-opts .gate-opt').catch(() => {});
await pg.click('#gate-drive-opts .gate-opt').catch(() => {});
await pg.waitForTimeout(300);
await pg.click('#gate-quote-card').catch(() => {});
await pg.waitForTimeout(600);

const active = () => pg.evaluate(() => document.querySelector('.screen.active')?.id);
async function goTo(id) {
  await pg.evaluate((sid) => {
    const tab = document.querySelector(`.tabbar .tab[data-screen="${sid}"]`);
    if (tab) tab.click();
  }, id);
  await pg.waitForTimeout(300);
  if (await active() !== id) {
    // 탭이 아닌 화면(설정)은 열어 주는 버튼으로 간다.
    const opener = { 'settings-screen': '#open-settings-btn', 'records-screen': '#open-records-btn', 'recovery-screen': '#open-recovery-btn' }[id];
    if (opener) {
      if (id !== 'settings-screen') await pg.evaluate(() => document.querySelector('.tabbar .tab[data-screen="more-screen"]')?.click());
      await pg.waitForTimeout(200);
      await pg.evaluate((sel) => document.querySelector(sel)?.click(), opener);
    }
    await pg.waitForTimeout(300);
  }
  return (await active()) === id;
}
// 화면 안의 '보이는' 버튼들에 표시를 붙여 하나씩 누를 수 있게 한다.
async function listButtons(id) {
  return pg.evaluate((sid) => {
    const sc = document.getElementById(sid);
    const out = [];
    sc.querySelectorAll('button, a.settings-row, [role=button]').forEach((b, i) => {
      if (b.closest('.hd')) return;
      const r = b.getBoundingClientRect(); const cs = getComputedStyle(b);
      if (!r.width || !r.height || cs.visibility === 'hidden' || b.disabled) return;
      if (b.closest('[hidden]')) return;
      // 언어·테마·글자 크기처럼 그 자리에서 값만 바꾸는 줄은 화면을 안 바꾼다 — 누르면
      // 이후 검사가 다른 언어로 돈다.
      if (/lang|theme|fontsize|mute/i.test(b.id)) return;
      b.dataset.bn = `${sid}-${i}`;
      out.push({ key: b.dataset.bn, label: (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) });
    });
    return out;
  }, id);
}

const results = [];
for (const origin of ['more-screen', 'start-screen', 'settings-screen', 'plan-screen', 'programs-screen', 'challenge-screen', 'log-screen', 'records-screen', 'recovery-screen']) {
  if (!await goTo(origin)) { results.push({ origin, ok: false, why: 'could not open origin' }); continue; }
  const buttons = await listButtons(origin);
  for (const b of buttons) {
    for (const how of ['header', 'history']) {
      if (!await goTo(origin)) break;
      await listButtons(origin);
      await pg.evaluate((k) => document.querySelector(`[data-bn="${k}"]`)?.click(), b.key);
      await pg.waitForTimeout(450);
      // 시트(아래에서 올라오는 판)가 열렸으면 이 버튼은 화면을 안 바꾼다 — 닫고 넘어간다.
      const sheet = await pg.evaluate(() => !!document.querySelector('.sheet.open, .sheet[open], .sheet.on'));
      const target = await active();
      if (!target || target === origin || SKIP_TARGETS.has(target) || sheet) {
        if (sheet) await pg.evaluate(() => history.back());
        await pg.waitForTimeout(200);
        break;
      }
      if (how === 'header') {
        // 화면 위쪽의 ← (header.js 가 만든 것이든 마크업에 원래 있던 것이든).
        const clicked = await pg.evaluate((t) => {
          const b = [...document.querySelectorAll(`#${t} .hd-back`)].find((x) => x.getBoundingClientRect().width > 0);
          if (b) b.click();
          return !!b;
        }, target);
        if (!clicked) { results.push({ origin, button: b.label, target, how, ok: false, why: 'no visible top back button' }); continue; }
      } else {
        await pg.goBack().catch(() => {});
      }
      await pg.waitForTimeout(500);
      const back = await active();
      results.push({ origin, button: b.label, target, how, ok: back === origin, back });
    }
  }
}

// 두 단계: 더보기 → 설정 → 계정 → ← → 설정 → ← → 더보기.
{
  await goTo('more-screen');
  await pg.evaluate(() => document.querySelector('.tabbar .tab[data-screen="more-screen"]')?.click());
  await pg.evaluate(() => document.querySelector('#more-screen #open-settings-row, #more-screen [id*="settings"]')?.click());
  await pg.waitForTimeout(400);
  const s1 = await active();
  await pg.evaluate(() => document.getElementById('settings-login-btn')?.click());
  await pg.waitForTimeout(400);
  const s2 = await active();
  const clickTop = async () => { await pg.evaluate(() => [...document.querySelectorAll('.screen.active .hd-back')].find((x) => x.getBoundingClientRect().width > 0)?.click()); await pg.waitForTimeout(450); return active(); };
  const b1 = await clickTop();
  const b2 = await clickTop();
  results.push({ origin: 'more-screen', button: `chain ${s1} → ${s2}`, target: s2, how: 'header×2', ok: s1 === 'settings-screen' && s2 === 'account-screen' && b1 === 'settings-screen' && b2 === 'more-screen', back: `${b1} → ${b2}` });
}

// 로그인한 채 계정 화면의 ← 가 로그아웃시키지 않는가 — 로그인 상태는 버튼
// 글자로만 흉내 낸다(실제 세션 없이 updateAccountUI 의 분기만 본다).
await goTo('start-screen');
const acct = await pg.evaluate(() => {
  const btn = document.getElementById('account-back-btn');
  let loggedOut = false;
  if (btn) btn.onclick = () => { loggedOut = true; };
  document.getElementById('open-account-btn')?.click();
  return new Promise((res) => setTimeout(() => {
    document.querySelector('#account-screen .hd .hd-back')?.click();
    setTimeout(() => res({ loggedOut, screen: document.querySelector('.screen.active')?.id }), 400);
  }, 400));
});
results.push({ origin: 'start-screen', button: 'account ← (logged in)', target: 'account-screen', how: 'header', ok: !acct.loggedOut && acct.screen === 'start-screen', back: acct.screen, why: acct.loggedOut ? 'clicked logout' : undefined });

await browser.close(); srv.close();
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.origin} → [${r.button}] → ${r.target} --${r.how}--> ${r.back ?? ''}${r.why ? '  (' + r.why + ')' : ''}`);
if (errors.length) console.log('\npage errors:\n' + [...new Set(errors)].join('\n'));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed || errors.length ? 1 : 0);
