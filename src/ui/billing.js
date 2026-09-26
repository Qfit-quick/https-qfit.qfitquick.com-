// Toss Payments 정기결제(빌링) 카드 등록(2026-09-25, worker/api/billing.js
// 와 한 쌍). 설정 화면의 '카드 등록' 줄이 이 흐름을 연다.
//
// 개발자가 처음 올린 판(dev 브랜치)은 세 가지가 실제 배포에서 동작하지
// 않았다 — 여기서 고쳤다:
//  1. prepare 호출 주소가 `http://localhost:5173/...` 로 못박혀 있었다.
//     운영 주소(qfit.qfitquick.com)에서는 그 주소로 못 나간다 — 상대
//     경로로 바꿔서 지금 열려 있는 origin 그대로 나가게 했다.
//  2. 요청에 로그인 토큰(Authorization 헤더)이 없었다 — worker 의
//     requireUser() 가 이게 없으면 항상 401 을 준다. Supabase 세션에서
//     access_token 을 꺼내 붙인다.
//  3. 카드 등록창이 끝난 뒤 Toss 가 돌아오는 successUrl/failUrl 을
//     받기만 하고 그 다음(POST /api/billing/authorize 호출)이 없었다 —
//     "결제창이 뜨는 것까지만" 확인됐다던 것이 바로 이 부분이다.
//     여기서는 앱을 새로 열 때(initBilling 호출 시점) 그 복귀 주소를
//     읽어 authorize 를 마저 부른다.
//
// 2026-09-26: 여기까지 고쳐도 실제 잠금(myProfile.isPremium, src/app.js)과는
// 아예 안 이어져 있었다 — 카드 등록해서 돈을 내도 프리미엄 동작이 안
// 풀리고, 반대로 설정의 예전 "프리미엄 시작하기" 버튼은 결제 없이
// 즉시 풀어 줬다. applyBillingStatus() 로 이 둘을 하나로 합친다:
// 부팅 시·카드 등록 직후·해지 토글 직후마다 여기서 서버 구독 상태를
// app.js 에 전달하고, app.js 가 그 상태 하나만 보고 잠금을 정한다.
//
// successUrl/failUrl 은 해시(#billing-return)를 쓴다 — 이 앱은 경로
// 라우팅이 없는 SPA 라 실제 경로(/billing/success 같은)로 돌아오면
// 정적 자산이 없어 404 가 난다(vite.config.js 의 base:'./' 주석 참고).
// 루트(#만 있는 주소)는 항상 index.html 이라 안전하다.
import { getSupabase } from '../cloud/supabase.js';
import { toast } from './toast.js';

let t = (o) => (o && o.ko) || '';
let S = {};

const RETURN_HASH = '#billing-return';

async function authHeader() {
  const supabase = await getSupabase();
  const session = supabase && (await supabase.auth.getSession()).data.session;
  if (!session) return null;
  return 'Bearer ' + session.access_token;
}

async function billingFetch(path, init = {}) {
  const auth = await authHeader();
  if (!auth) throw new Error('NOT_LOGGED_IN');
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), authorization: auth, 'content-type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || 'billing request failed'), { status: res.status, body });
  return body;
}

// Toss 가 successUrl/failUrl 뒤에 authKey·customerKey(성공) 또는
// code·message(실패)를 붙여서 돌려보낸다. 정확히 어디에 붙이는지(진짜
// 쿼리스트링 vs 해시 뒤에 이어 붙이는 문자열)를 코드로 보장할 수 없어서,
// location.search 와 location.hash 양쪽에서 다 찾는다 — 뭐가 오든 놓치지
// 않는다.
function readReturnParams() {
  const buckets = [location.search.replace(/^\?/, '')];
  const hash = location.hash || '';
  const qIdx = hash.indexOf('?');
  if (qIdx >= 0) buckets.push(hash.slice(qIdx + 1));
  const params = new URLSearchParams(buckets.filter(Boolean).join('&'));
  return params;
}

// 쿼리·해시를 한 번에 지운다 — 안 지우면 새로고침할 때마다 authorize 가
// 다시 불린다(주소에 authKey 흔적이 그대로 남아 있으므로).
function clearReturnUrl() {
  history.replaceState(null, '', location.pathname);
}

async function finishAuthorizeFromReturn() {
  if (!location.hash.startsWith(RETURN_HASH) && !location.search.includes('authKey')) return;
  const params = readReturnParams();
  const authKey = params.get('authKey');
  const customerKey = params.get('customerKey');
  clearReturnUrl();

  if (!authKey || !customerKey) {
    toast(t(S.billingRegisterFailed));
    return;
  }
  try {
    const result = await billingFetch('/api/billing/authorize', {
      method: 'POST',
      body: JSON.stringify({ authKey, customerKey }),
    });
    window.applyBillingStatus?.(result);
    if (result.status === 'active') toast(t(S.billingRegisterDone));
    else toast(t(S.billingPending));
  } catch (e) {
    console.error('billing authorize failed:', e);
    toast(t(S.billingRegisterFailed));
  }
}

// 부팅 때마다(그리고 결제/해지 직후) 서버가 아는 구독 상태를 물어 app.js
// 에 전달한다 — 다른 기기에서 구독하거나 크론이 갱신·해지한 결과도 이걸로
// 반영된다. 로그인 전이거나 오프라인이면 조용히 넘어간다(지금 잠금 상태를
// 섣불리 건드리지 않는다 — NOT_LOGGED_IN 인지, 그냥 네트워크 문제인지
// 구별할 수 없어서 둘 다 "그대로 둔다"로 처리한다).
async function checkBillingStatus() {
  try {
    const status = await billingFetch('/api/billing/status');
    window.applyBillingStatus?.(status);
  } catch (e) {
    // no-op — 위 주석 참고.
  }
}

async function startCardRegistration(button) {
  button.disabled = true;
  try {
    const auth = await authHeader();
    if (!auth) {
      toast(t(S.billingLoginRequired));
      return;
    }
    const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
    const prepared = await billingFetch('/api/billing/prepare', { method: 'POST' });
    const { customerKey, clientKey } = prepared;
    if (!customerKey || !clientKey) throw new Error('prepare response missing keys');

    const tossPayments = await loadTossPayments(clientKey);
    const payment = tossPayments.payment({ customerKey });
    await payment.requestBillingAuth({
      method: 'CARD',
      successUrl: `${location.origin}${location.pathname}${RETURN_HASH}`,
      failUrl: `${location.origin}${location.pathname}${RETURN_HASH}`,
    });
    // 성공하면 브라우저가 successUrl 로 이동하므로 여기 이후 코드는 실행되지
    // 않는다 — 아래 catch 는 사용자가 인증창 자체를 닫거나 실패했을 때만 탄다.
  } catch (e) {
    console.error('billing register failed:', e);
    toast(e?.message === 'NOT_LOGGED_IN' ? t(S.billingLoginRequired) : t(S.billingRegisterFailed));
  } finally {
    button.disabled = false;
  }
}

// cancelBtn.dataset.cancelAtPeriodEnd 가 지금 상태의 유일한 출처다 —
// app.js 의 refreshPremiumUI() 가 매번 그 값을 채워 두므로, 여기서는
// myProfile 을 직접 몰라도 반대로 뒤집기만 하면 된다.
async function toggleCancelSubscription(button) {
  const willCancel = button.dataset.cancelAtPeriodEnd !== 'true';
  if (willCancel && !confirm(t(S.billingCancelConfirm))) return;
  button.disabled = true;
  try {
    const result = await billingFetch('/api/billing/cancel', {
      method: 'POST',
      body: JSON.stringify({ cancel: willCancel }),
    });
    window.applyBillingStatus?.(result);
    toast(t(willCancel ? S.billingCancelScheduled : S.billingCancelResumed));
  } catch (e) {
    console.error('billing cancel toggle failed:', e);
    toast(t(S.billingRegisterFailed));
    button.disabled = false;
  }
}

export function initBilling({ translate, STATIC_UI } = {}) {
  if (translate) t = translate;
  if (STATIC_UI) S = STATIC_UI;

  // 카드 인증창에서 돌아온 직후라면(주소에 흔적이 남아 있다) 먼저 마저
  // 처리한다 — 설정 화면을 아직 안 열어도 된다.
  finishAuthorizeFromReturn();
  checkBillingStatus();

  const button = document.getElementById('billing-button');
  if (button) button.addEventListener('click', () => startCardRegistration(button));

  // 설정의 "카드 등록" 줄과 별개로, 프리미엄 덮개 안의 버튼도 같은 실제
  // 결제 흐름을 탄다(2026-09-26 전에는 여기가 결제 없이 즉시 풀어 주는
  // 가짜 버튼이었다 — src/app.js 의 refreshPremiumUI 주석 참고).
  const premiumBtn = document.getElementById('premium-activate-btn');
  if (premiumBtn) premiumBtn.addEventListener('click', () => startCardRegistration(premiumBtn));

  const cancelBtn = document.getElementById('premium-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', () => toggleCancelSubscription(cancelBtn));
}
