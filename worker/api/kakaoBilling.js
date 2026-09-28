// Server-only Kakao Pay Billing API (Cloudflare Worker / Edge Runtime)
// Required Worker secrets: KAKAO_SECRET_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY
import {
  reply,
  requireUser,
  supabase,
  getCustomer,
  markPastDue,
  calculateNextPeriod,
} from "../utils/billingUtils.js";

const PLAN = Object.freeze({
  id: "premium_monthly",
  name: "Q-fit Premium (monthly)",
  amount: 2400,
});

// 테스트용 CID (운영 전환 시 env.KAKAO_CID 등으로 교체 가능)
const KAKAO_CID = "TCSUBSCRIP";
const KAKAO_API_HOST = "https://open-api.kakaopay.com";

// KST(한국 표준시) YYYY-MM-DD 포맷 변환 Helper
function periodDateKST(date) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// Auth & Supabase Helpers
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// KakaoPay API Wrapper
// -----------------------------------------------------------------------------
async function kakaoPay(path, secretKey, body) {
  const response = await fetch(`${KAKAO_API_HOST}${path}`, {
    method: "POST",
    headers: {
      Authorization: `SECRET_KEY ${secretKey}`,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    //signal: AbortSignal.timeout(60_000),
  });
  const json = await response.json().catch(() => ({}));
  console.log(json);
  return { response, json };
}

// -----------------------------------------------------------------------------
// KakaoPay Flow Implementations
// -----------------------------------------------------------------------------

// 1. 결제 준비 (KakaoPay Ready)
async function prepareKakao(request, env, user) {
  const origin = new URL(request.url).origin;
  const partnerOrderId = `sub_init_${crypto.randomUUID().replaceAll("-", "")}`;

  const { response, json } = await kakaoPay(
    "/online/v1/payment/ready",
    env.KAKAO_SECRET_KEY,
    {
      cid: KAKAO_CID,
      partner_order_id: partnerOrderId,
      partner_user_id: user.id,
      item_name: PLAN.name,
      quantity: 1,
      total_amount: PLAN.amount,
      tax_free_amount: 0,
      approval_url: `${origin}/billing/kakao/approve?partner_order_id=${partnerOrderId}`,
      cancel_url: `${origin}/billing/cancel`,
      fail_url: `${origin}/billing/fail`,
    },
  );
  console.log(response);
  if (!response.ok) {
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
  const { pgToken, tid, partnerOrderId } = await request
    .json()
    .catch(() => ({}));
  if (!pgToken || !tid || !partnerOrderId) {
    return reply(
      { error: "Missing required KakaoPay authorization parameters." },
      400,
    );
  }

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
    return reply({ error: "KakaoPay approval failed", code: json.code }, 422);
  }

  const sid = json.sid;
  if (!sid) return reply({ error: "SID was not issued" }, 500);

  // DB 고객 테이블에 SID 저장
  await supabase(env, `billing_customers?user_id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      provider: "kakao",
      sid,
      updated_at: new Date().toISOString(),
    }),
  });

  // 구독 활성화 처리 (첫 달 설정)
  const start = new Date();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  await supabase(env, `subscriptions?user_id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "active",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      payment_retry_count: 0,
      next_retry_at: null,
      cancel_at_period_end: false,
    }),
  });

  return reply({ status: "active", currentPeriodEnd: end.toISOString() });
}

// 3. 정기 결제 재결제 (KakaoPay Subscription Charge)
async function chargeKakao(env, userId, sid) {
  const partnerOrderId = `sub_renew_${crypto.randomUUID().replaceAll("-", "")}`;

  const { response, json } = await kakaoPay(
    "/online/v1/payment/subscription",
    env.KAKAO_SECRET_KEY,
    {
      cid: KAKAO_CID,
      sid,
      partner_order_id: partnerOrderId,
      partner_user_id: userId,
      item_name: PLAN.name,
      quantity: 1,
      total_amount: PLAN.amount,
      tax_free_amount: 0,
    },
  );

  if (!response.ok) {
    await markPastDue(env, userId);
    return { success: false, error: json };
  }

  const start = new Date();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

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

  return { success: true, payment: json };
}

// -----------------------------------------------------------------------------
// Exports (기존 호출 방식과 100% 동일)
// -----------------------------------------------------------------------------

export async function handleBillingRequestKakao(request, env) {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: { allow: "GET, POST, OPTIONS" } });

  const user = await requireUser(request, env);
  if (!user) return reply({ error: "Authentication required." }, 401);

  try {
    const path = new URL(request.url).pathname;

    // 카카오페이 정기결제 엔드포인트 라우팅
    if (request.method === "POST" && path === "/api/billing/kakao/prepare")
      return prepareKakao(request, env, user);

    if (request.method === "POST" && path === "/api/billing/kakao/approve")
      return approveKakao(request, env, user);

    if (request.method === "GET" && path === "/api/billing/status") {
      const rows = await supabase(
        env,
        `subscriptions?user_id=eq.${user.id}&select=status,current_period_end,cancel_at_period_end`,
      );
      return reply(rows[0] || { status: "none" });
    }

    return reply({ error: "Not found." }, 404);
  } catch (error) {
    console.error("Billing API error", error);
    return reply({ error: "Payment service temporarily unavailable." }, 500);
  }
}

export async function renewDueSubscriptionsKakao(env) {
  const now = encodeURIComponent(new Date().toISOString());
  const select = "select=user_id,current_period_end,payment_retry_count";

  const activeDue = await supabase(
    env,
    `subscriptions?status=eq.active&cancel_at_period_end=eq.false&current_period_end=lte.${now}&${select}`,
  );
  const pendingDue = await supabase(
    env,
    `subscriptions?status=eq.pending&cancel_at_period_end=eq.false&current_period_end=lte.${now}&${select}`,
  );
  const retryDue = await supabase(
    env,
    `subscriptions?status=eq.past_due&cancel_at_period_end=eq.false&next_retry_at=not.is.null&next_retry_at=lte.${now}&${select}`,
  );

  const due = [...activeDue, ...pendingDue, ...retryDue];

  for (const subscription of due) {
    try {
      const customer = await getCustomer(env, subscription.user_id);
      if (!customer?.sid) {
        await markPastDue(
          env,
          subscription.user_id,
          subscription.payment_retry_count || 0,
        );
        continue;
      }

      await chargeKakao(env, subscription.user_id, customer.sid);
    } catch (error) {
      console.error(
        "Kakao Subscription renewal failed",
        subscription.user_id,
        error,
      );
    }
  }
}
