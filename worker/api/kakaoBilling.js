// Server-only KakaoPay Billing API. Do not import from src/.
// Required Worker secret: KAKAO_SECRET_KEY (Supabase env vars are shared with
// worker/api/billing.js — see that file's header comment).
//
// 2026-09-29: dev 브랜치에 있던 첫 판을 그대로 가져오지 않고 다시 썼다 —
// 원본은 requireUser() 가 요청의 실제 로그인 토큰을 아예 안 읽고 항상
// 테스트 계정(test@gmail.com)으로 로그인해 버렸다(worker/utils/
// getTestToken.js 를 그대로 불러 씀). 그 상태로 나가면 진짜 사용자가
// 결제해도 전부 그 테스트 계정 앞으로 처리된다 — 그래서 인증·DB 배관은
// 새로 만들지 않고 이미 실제 사용자로 검증된 worker/api/billing.js 의
// 것을 그대로 가져다 쓴다.
import { reply, requireUser, supabase, getCustomer, markPastDue, ensureSubscription, ensureBillingCustomer, PLANS } from "./billing.js";

const DEFAULT_PLAN_ID = "premium_monthly";
const planFor = (planId) => PLANS[planId] || PLANS[DEFAULT_PLAN_ID];

// 테스트용 CID. 카카오 가맹점 심사가 끝나면 실제 CID 로 바꾼다(대시보드
// 발급값 — 시크릿은 아니지만 환경마다 다르므로 env.KAKAO_CID 로 옮겨도 된다).
const KAKAO_CID = "TCSUBSCRIP";
const KAKAO_API_HOST = "https://open-api.kakaopay.com";

async function kakaoPay(path, secretKey, body) {
  const response = await fetch(`${KAKAO_API_HOST}${path}`, {
    method: "POST",
    headers: {
      Authorization: `SECRET_KEY ${secretKey}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

// 1. 결제 준비 (KakaoPay Ready)
async function prepareKakao(request, env, user) {
  const { planId } = await request.json().catch(() => ({}));
  const plan = planFor(planId);
  const origin = new URL(request.url).origin;
  const partnerOrderId = `sub_init_${crypto.randomUUID().replaceAll("-", "")}`;

  const { response, json } = await kakaoPay(
    "/online/v1/payment/ready",
    env.KAKAO_SECRET_KEY,
    {
      cid: KAKAO_CID,
      partner_order_id: partnerOrderId,
      partner_user_id: user.id,
      item_name: plan.name,
      quantity: 1,
      total_amount: plan.amount,
      tax_free_amount: 0,
      // 이 앱은 경로 라우팅이 없는 SPA 라 실제 경로로 돌아오면 404 가 난다
      // (src/ui/billing.js 의 같은 설명 참고) — 해시(#billing-return)로
      // 돌아오게 한다. partner_order_id·plan_id 를 여기 실어 두면, 카카오가
      // 그 주소 뒤에 pg_token 만 붙여 돌려줘도 승인 호출에 필요한 나머지
      // 정보(tid 제외)를 클라이언트가 다시 안 물어도 된다 — tid 만
      // sessionStorage 로 따로 넘긴다(client.js 의 KAKAO_TID_KEY).
      approval_url: `${origin}/#billing-return?partner_order_id=${partnerOrderId}&plan_id=${plan.id}`,
      cancel_url: `${origin}/#billing-return`,
      fail_url: `${origin}/#billing-return`,
    },
  );
  if (!response.ok) {
    console.error("KakaoPay prepare failed", json.code, json.msg);
    return reply({ error: "KakaoPay prepare failed", code: json.code }, 422);
  }

  return reply({
    tid: json.tid,
    nextRedirectPcUrl: json.next_redirect_pc_url,
    nextRedirectMobileUrl:
      json.next_redirect_app_url || json.next_redirect_mobile_url,
    partnerOrderId,
  });
}

// 2. 최초 승인 및 SID 발급 (KakaoPay Approve)
async function approveKakao(request, env, user) {
  const { pgToken, tid, partnerOrderId, planId } = await request
    .json()
    .catch(() => ({}));
  if (!pgToken || !tid || !partnerOrderId) {
    return reply(
      { error: "Missing required KakaoPay authorization parameters." },
      400,
    );
  }
  const plan = planFor(planId);

  const { response, json } = await kakaoPay(
    "/online/v1/payment/approve",
    env.KAKAO_SECRET_KEY,
    {
      cid: KAKAO_CID,
      tid,
      partner_order_id: partnerOrderId,
      partner_user_id: user.id,
      pg_token: pgToken,
    },
  );

  if (!response.ok) {
    console.error("KakaoPay approve failed", json.code, json.msg);
    return reply({ error: "KakaoPay approval failed", code: json.code }, 422);
  }

  const sid = json.sid;
  if (!sid) return reply({ error: "SID was not issued" }, 500);

  // 두 테이블 다 Toss 를 한 번도 안 거친 사람에게는 행이 없을 수 있다 —
  // 없으면 만들고 나서 PATCH 한다(2026-09-30 발견 — 원래는 존재를 확인
  // 안 하고 바로 PATCH 해서, 카카오로 처음 가입하는 사람은 조용히
  // 0건 업데이트로 실패했다).
  await ensureBillingCustomer(env, user.id);
  await ensureSubscription(env, user.id, plan.id);

  await supabase(env, `billing_customers?user_id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      provider: "kakao",
      kakao_sid: sid,
      updated_at: new Date().toISOString(),
    }),
  });

  const start = new Date();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + plan.months);

  await supabase(env, `subscriptions?user_id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "active",
      plan_id: plan.id,
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      payment_retry_count: 0,
      next_retry_at: null,
      cancel_at_period_end: false,
    }),
  });

  return reply({ status: "active", currentPeriodEnd: end.toISOString() });
}

// 3. 정기 재결제 (worker/api/billing.js 의 renewDueSubscriptions 가 부른다.
//    planId 는 subscription.plan_id — 최초 가입 때 고른 요금제를 그대로
//    이어 쓴다.)
export async function chargeKakao(env, userId, sid, planId) {
  const plan = planFor(planId);
  const partnerOrderId = `sub_renew_${crypto.randomUUID().replaceAll("-", "")}`;

  const { response, json } = await kakaoPay(
    "/online/v1/payment/subscription",
    env.KAKAO_SECRET_KEY,
    {
      cid: KAKAO_CID,
      sid,
      partner_order_id: partnerOrderId,
      partner_user_id: userId,
      item_name: plan.name,
      quantity: 1,
      total_amount: plan.amount,
      tax_free_amount: 0,
    },
  );

  if (!response.ok) {
    console.error("KakaoPay renewal charge failed", userId, json.code, json.msg);
    await markPastDue(env, userId);
    return;
  }

  const start = new Date();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + plan.months);
  await supabase(env, `subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "active",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      payment_retry_count: 0,
      next_retry_at: null,
    }),
  });
}

export async function handleBillingRequestKakao(request, env) {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: { allow: "GET, POST, OPTIONS" } });

  const user = await requireUser(request, env);
  if (!user) return reply({ error: "Authentication required." }, 401);

  try {
    const path = new URL(request.url).pathname;
    if (request.method === "POST" && path === "/api/billing/kakao/prepare")
      return prepareKakao(request, env, user);
    if (request.method === "POST" && path === "/api/billing/kakao/approve")
      return approveKakao(request, env, user);
    // /api/billing/status 는 worker/api/billing.js 쪽에 이미 있다 —
    // subscriptions 테이블은 어느 결제수단이든 공통이라 굳이 여기 또
    // 만들지 않는다.
    return reply({ error: "Not found." }, 404);
  } catch (error) {
    console.error("Kakao billing API error", error);
    return reply({ error: "Payment service temporarily unavailable." }, 500);
  }
}
