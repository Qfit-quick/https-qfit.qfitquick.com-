// 로그인 흐름 검사 — Supabase·결제 API 를 브라우저 안에서 흉내 내고,
// 실제 계정 없이 로그인 복귀의 성공·실패·재설정 경로를 전부 돌린다.
//
//     npm run build && npm run auth
//
// 빌드 산출물(app/dist)을 직접 띄우므로 dev 서버가 필요 없다. 진짜
// 카카오·네이버·구글 서버와는 한 번도 말하지 않는다 — 그쪽 설정(동의
// 항목, 콜백 주소)이 틀린 것은 이걸로 못 잡는다(docs/DEPLOY.md 참고).
//
// 2026-10-01 에 "카카오·네이버 로그인을 누르면 첫 화면으로 돌아온다"를
// 고치면서 만들었다. 그때 원인은 셋이 겹쳐 있었다: 화면 라우터가 ?code= 를
// 지웠고, 복귀 판단이 Supabase 가 안 보내는 state= 까지 요구했고, 실패해도
// 아무 말이 없었다. 셋 다 오류 없이 조용히 실패해서 눈으로는 못 찾았다.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';

const root = path.resolve('app/dist');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(4790);
const ORIGIN = 'http://localhost:4790';
const SKEY = 'sb-pdmjlleaheqyldhitkty-auth-token';
const USER = { id: '11111111-2222-3333-4444-555555555555', email: 't@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'kakao' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const JWT = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: USER.id, exp, aud: 'authenticated', role: 'authenticated', session_id: 's1' }) + '.sig';
const SESSION = { access_token: JWT, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r1', user: USER };

const browser = await chromium.launch();
const results = [];
function check(name, ok, info) { results.push({ name, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(info))); }

async function scenario({ url, storage = {}, token = 'ok', billing = { status: 'none' }, ua }) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', userAgent: ua });
  const pg = await ctx.newPage();
  const log = { token: 0, authorize: null, billing: 0, logout: 0, sdk: false, errors: [] };
  await pg.addInitScript((s) => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  pg.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text().slice(0, 160)); });
  pg.on('request', (q) => { if (/supabase-[\w-]+\.js/.test(q.url())) log.sdk = true; });
  await pg.route('**/auth/v1/token?grant_type=pkce', (r) => { log.token++; token === 'ok'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) })
    : r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 404, error_code: 'flow_state_not_found', msg: 'invalid flow state, no valid flow state found' }) }); });
  await pg.route('**/auth/v1/token?grant_type=password', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) }));
  await pg.route('**/auth/v1/token?grant_type=refresh_token', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION) }));
  await pg.route('**/auth/v1/user**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }));
  await pg.route('**/auth/v1/logout**', (r) => { log.logout++; r.fulfill({ status: 204, body: '' }); });
  await pg.route('**/auth/v1/authorize**', (r) => { log.authorize = r.request().url(); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>provider</p>' }); });
  await pg.route('**/rest/v1/**', (r) => r.fulfill({ status: r.request().method() === 'GET' ? 200 : 201, contentType: 'application/json', body: '[]' }));
  await pg.route('**/api/billing/status', (r) => { log.billing++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(billing) }); });
  await pg.route('**/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '0' }));
  await pg.goto(ORIGIN + url);
  await pg.waitForTimeout(3500);
  return { pg, ctx, log };
}
const state = (pg) => pg.evaluate(() => ({
  screen: document.querySelector('.screen.active')?.id,
  url: location.pathname + location.search + location.hash,
  accountBtn: document.getElementById('open-account-btn')?.textContent.trim(),
  loginErr: document.getElementById('account-login-error')?.textContent.trim(),
  newpw: getComputedStyle(document.getElementById('account-newpw-form')).display,
  toast: document.querySelector('.toast')?.textContent.trim(),
  stored: Object.keys(localStorage).filter((k) => k.startsWith('sb-')),
  premium: JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /profile/i.test(k) && localStorage.getItem(k).includes('totalCompletions')) || 'null') || '{}').isPremium,
}));

const VERIFIER = { [SKEY + '-code-verifier']: JSON.stringify('v'.repeat(56)) };
const RECOVERY_VERIFIER = { [SKEY + '-code-verifier']: JSON.stringify('v'.repeat(56) + '/recovery') };

// 1. 소셜 로그인 복귀 성공
{ const { pg, ctx, log } = await scenario({ url: '/?code=abc', storage: VERIFIER, billing: { status: 'active' } }); const s = await state(pg);
  check('1 social return → logged in on start screen, url clean, billing refreshed, premium on',
    log.token === 1 && s.screen === 'start-screen' && s.accountBtn === '로그아웃' && s.url === '/' && s.stored.includes(SKEY) && log.billing >= 1 && s.premium === true, { s, log }); await ctx.close(); }
// 2. 비밀번호 재설정 링크(같은 브라우저)
{ const { pg, ctx, log } = await scenario({ url: '/?code=abc', storage: RECOVERY_VERIFIER }); const s = await state(pg);
  check('2 recovery link → new password form', log.token === 1 && s.screen === 'account-screen' && s.newpw !== 'none' && !/code=/.test(s.url), { s, log }); await ctx.close(); }
// 3. 다른 브라우저에서 연 메일 링크(verifier 없음)
{ const { pg, ctx, log } = await scenario({ url: '/?code=abc' }); const s = await state(pg);
  check('3 link opened in other browser → account screen with explanation', log.token === 0 && s.screen === 'account-screen' && /요청했던 브라우저/.test(s.loginErr) && !/code=/.test(s.url), { s, log }); await ctx.close(); }
// 4. 만료·재사용된 code
{ const { pg, ctx, log } = await scenario({ url: '/?code=abc', storage: VERIFIER, token: 'fail' }); const s = await state(pg);
  check('4 expired code → account screen, expired message', log.token === 1 && s.screen === 'account-screen' && /만료/.test(s.loginErr) && !/code=/.test(s.url), { s, log }); await ctx.close(); }
// 5. 제공자 화면에서 취소
{ const { pg, ctx } = await scenario({ url: '/?error=access_denied&error_description=user+cancelled' }); const s = await state(pg);
  check('5 cancelled at provider → cancel toast, url clean', /취소/.test(s.toast) && s.url === '/', { s }); await ctx.close(); }
// 6. 이메일 미제공(카카오 동의 항목)
{ const { pg, ctx } = await scenario({ url: '/?error=server_error&error_code=unexpected_failure&error_description=Error+getting+user+email+from+external+provider' }); const s = await state(pg);
  check('6 provider gave no email → account screen, email consent message', s.screen === 'account-screen' && /이메일 제공/.test(s.loginErr) && s.url === '/', { s }); await ctx.close(); }
// 6b. 해시로 온 오류
{ const { pg, ctx } = await scenario({ url: '/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired' }); const s = await state(pg);
  check('6b error in hash → expired message, hash cleaned', /만료/.test(s.loginErr) && s.url === '/', { s }); await ctx.close(); }
// 7. 카카오 버튼 → Supabase authorize 로 나간다
{ const { pg, ctx, log } = await scenario({ url: '/' });
  await pg.evaluate(() => document.querySelector('#account-social-row [data-provider="kakao"]').click()); await pg.waitForTimeout(2500);
  const ver = ((await ctx.storageState()).origins.find((o) => o.origin === ORIGIN)?.localStorage || []).map((x) => x.name).filter((k) => k.endsWith('code-verifier'));
  const rt = log.authorize && new URL(log.authorize).searchParams.get('redirect_to');
  check('7 kakao button → authorize with redirect_to=origin, verifier stored', /provider=kakao/.test(log.authorize || '') && rt && rt.startsWith(ORIGIN + '/') && ver.length > 0, { authorize: log.authorize, ver }); await ctx.close(); }
// 7b. 네이버 버튼 → scope 에 email 이 없어야 한다(있으면 네이버가 invalid_scope 로 즉시 돌려보낸다)
{ const { pg, ctx, log } = await scenario({ url: '/' });
  await pg.evaluate(() => document.querySelector('#account-social-row [data-provider="custom:naver"]').click()); await pg.waitForTimeout(2500);
  const sc = log.authorize && new URL(log.authorize).searchParams.get('scopes');
  check('7b naver button → scopes=openid profile (no email)', /provider=custom%3Anaver/.test(log.authorize || '') && sc === 'openid profile', { authorize: log.authorize }); await ctx.close(); }
// 8. 로그인 상태에서 로그아웃 → 프리미엄 잠김
{ const { pg, ctx, log } = await scenario({ url: '/', storage: { [SKEY]: JSON.stringify(SESSION) }, billing: { status: 'active' } });
  const before = await state(pg);
  await pg.evaluate(() => document.getElementById('account-back-btn').click()); await pg.waitForTimeout(1500); const s = await state(pg);
  check('8 stored session boots logged in + premium; logout locks premium and clears session',
    before.accountBtn === '로그아웃' && before.premium === true && s.accountBtn === '로그인' && s.premium === false && !s.stored.includes(SKEY) && /로그아웃/.test(s.toast), { before, s, log }); await ctx.close(); }
// 9. 로그인 안 하는 방문자는 SDK 를 안 받는다, 남은 프리미엄은 잠긴다
{ const { pg, ctx, log } = await scenario({ url: '/', storage: { qfit_profile_v1: JSON.stringify({ totalCompletions: 1, isPremium: true }) } }); const s = await state(pg);
  check('9 anonymous visitor → no SDK download, billing not called', !log.sdk && log.billing === 0, { log, s }); await ctx.close(); }
// 10. 카카오톡 인앱에서 구글
{ const { pg, ctx, log } = await scenario({ url: '/', ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile KAKAOTALK 10.8.0' });
  await pg.evaluate(() => document.querySelector('#account-social-row [data-provider="google"]').click()); await pg.waitForTimeout(1200); const s = await state(pg);
  check('10 google in KakaoTalk webview → notice, no redirect', !log.authorize && /구글/.test(s.loginErr), { s, log }); await ctx.close(); }
// 11. 이메일·비밀번호 로그인 → 결제 상태 갱신
{ const { pg, ctx, log } = await scenario({ url: '/', billing: { status: 'active' } });
  await pg.evaluate(() => { document.getElementById('account-login-email').value = 't@example.com'; document.getElementById('account-login-pw').value = 'secret1'; document.getElementById('account-login-btn').click(); });
  await pg.waitForTimeout(2500); const s = await state(pg);
  check('11 email login → logged in, billing refreshed, premium on', s.accountBtn === '로그아웃' && s.screen === 'start-screen' && log.billing >= 1 && s.premium === true, { s, log }); await ctx.close(); }

await browser.close(); srv.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
