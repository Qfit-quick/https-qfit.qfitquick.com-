import {
  reply,
  requireUser,
  supabase,
  getCustomer,
  markPastDue,
} from "../utils/billingUtils.js";

const PLAN = Object.freeze({
  id: "premium_monthly",
  name: "Q-fit Premium (monthly)",
  amount: 2400,
});

// 네이버페이 Partner API 개발환경 기본 호스트
// 운영환경에서는 NAVERPAY_API_HOST 환경변수로 운영 호스트를 지정
const DEFAULT_API_HOST = "https://dev-api.naverpay.com";

/**
 * 네이버페이 API 호출 공통 Wrapper
 */
async function naverPay(path, env, body, method = "POST") {
  const host = env.NAVERPAY_API_HOST || DEFAULT_API_HOST;

  const baseUrl = host.startsWith("http") ? host : `https://${host}`;

  const url = `${baseUrl}${path}`;

  // 네이버페이 인증정보
  const clientId = env.NAVERPAY_CLIENT_ID || env.NAVER_CLIENT_ID || "";

  const clientSecret =
    env.NAVERPAY_CLIENT_SECRET || env.NAVER_CLIENT_SECRET || "";

  // 중요:
  // Chain ID를 Client ID로 fallback하지 않는다.
  const chainId = env.NAVERPAY_CHAIN_ID || env.NAVER_CHAIN_ID || "";

  // 인증정보가 없으면 네이버페이에 요청하지 않음
  console.log("NaverPay env check", {
  hasClientId: Boolean(
    env.NAVERPAY_CLIENT_ID
  ),
  hasClientSecret: Boolean(
    env.NAVERPAY_CLIENT_SECRET
  ),
  hasChainId: Boolean(
    env.NAVERPAY_CHAIN_ID
  ),
  apiHost:
    env.NAVERPAY_API_HOST ||
    DEFAULT_API_HOST,
});
  if (!clientId || !clientSecret || !chainId) {
    console.error("NaverPay credentials are missing", {
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      hasChainId: Boolean(chainId),
      host: baseUrl,
    });

    throw new Error("NaverPay credentials are not configured.");
  }

  const headers = {
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
    "X-NaverPay-Chain-Id": chainId,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const json = await response.json().catch(() => ({}));

    // Secret은 절대 로그에 출력하지 않음
    console.log("NaverPay API response", {
      url,
      status: response.status,
      ok: response.ok,
      code: json?.code,
      message: json?.message,
    });

    return {
      response,
      json,
      error: null,
    };
  } catch (error) {
    console.error("NaverPay fetch error:", error);

    return {
      response: null,
      json: null,
      error,
    };
  }
}

/**
 * 0. 프론트엔드 네이버페이 SDK 설정
 *
 * GET /api/billing/naver/config
 * GET /api/billing/naver/prepare
 */
async function configNaver(env, user) {
  const clientId = env.NAVERPAY_CLIENT_ID || env.NAVER_CLIENT_ID || "";

  const chainId = env.NAVERPAY_CHAIN_ID || env.NAVER_CHAIN_ID || "";

  if (!clientId || !chainId) {
    console.error("NaverPay config credentials are missing", {
      hasClientId: Boolean(clientId),
      hasChainId: Boolean(chainId),
    });

    return reply(
      {
        error: "NaverPay credentials are not configured.",
      },
      500,
    );
  }

  return reply({
    clientId,
    chainId,
    mode: env.NAVERPAY_MODE || "development",

    productCode: PLAN.id,
    productName: PLAN.name,
    totalPayAmount: PLAN.amount,

    merchantUserId: user?.id || "guest_user",
  });
}

/**
 * 1. 네이버페이 결제 승인
 *
 * POST /api/billing/naver/approve
 */
async function approveNaver(request, env, user) {
  const { paymentId, resultCode, recurrentPayNo } = await request
    .json()
    .catch(() => ({}));

  /*
   * 네이버페이 결제 취소/실패
   */
  if (resultCode && resultCode !== "Success") {
    return reply(
      {
        error: "NaverPay payment was canceled or failed on client side.",
        code: resultCode,
      },
      400,
    );
  }

  /*
   * paymentId와 recurrentPayNo 둘 다 없으면 오류
   */
  if (!paymentId && !recurrentPayNo) {
    return reply(
      {
        error:
          "Missing required NaverPay authorization parameter (paymentId or recurrentPayNo).",
      },
      400,
    );
  }

  let detail = null;

  /*
   * paymentId가 있는 경우
   * 네이버페이에 실제 결제 승인 요청
   */
  if (paymentId) {
    const { response, json } = await naverPay(
      "/naverpay-partner/naverpay/open/v2.2/apply/payment",
      env,
      {
        paymentId,
      },
    );

    if (!response || !response.ok || json?.code !== "Success") {
      console.error("NaverPay approval failed", {
        status: response?.status,
        code: json?.code,
        message: json?.message,
      });

      return reply(
        {
          error: "NaverPay approval failed",
          code: json?.code || "APPROVAL_FAILED",
          message: json?.message || "Naver Pay payment approval rejected.",
        },
        422,
      );
    }

    detail = json.body?.detail || json.body || null;
  }

  /*
   * 자동결제용 번호 확보
   *
   * 최초 결제 승인 결과에서 받은
   * recurrentRepayNo를 저장
   */
  const recurrentNo = recurrentPayNo || detail?.recurrentRepayNo || null;

  /*
   * 결제 승인 결과에서 자동결제 번호를
   * 얻지 못했다면 경고
   */
  if (!recurrentNo) {
    console.warn("NaverPay recurrentRepayNo was not returned.");
  }

  /*
   * DB 고객 빌링 정보 저장/갱신
   */
  await supabase(env, `billing_customers?user_id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      provider: "naver",

      recurrent_repay_no: recurrentNo,

      updated_at: new Date().toISOString(),
    }),
  });

  /*
   * 구독 기간 계산
   *
   * 1개월
   */
  const start = new Date();

  const end = new Date(start);

  end.setUTCMonth(end.getUTCMonth() + 1);

  /*
   * 구독 활성화
   */
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

  return reply({
    status: "active",

    paymentId: detail?.paymentId || paymentId || null,

    recurrentRepayNo: recurrentNo,

    currentPeriodEnd: end.toISOString(),
  });
}

/**
 * 2. 네이버페이 정기결제 재결제
 *
 * NaverPay Recurrent Repay
 */
async function chargeNaver(env, userId, recurrentRepayNo) {
  const merchantPayId = `sub_renew_np_${crypto
    .randomUUID()
    .replaceAll("-", "")}`;

  const { response, json } = await naverPay(
    "/naverpay-partner/naverpay/open/v2.2/recurrent/repay",
    env,
    {
      recurrentRepayNo,

      merchantPayId,

      productName: PLAN.name,

      productCount: 1,

      totalPayAmount: PLAN.amount,

      taxScopeAmount: PLAN.amount,

      taxExemptSupplyAmount: 0,

      merchantUserKey: userId,
    },
  );

  /*
   * 재결제 실패
   */
  if (!response || !response.ok || json?.code !== "Success") {
    console.error("NaverPay recurrent payment failed", {
      status: response?.status,
      code: json?.code,
      message: json?.message,
    });

    await markPastDue(env, userId);

    return {
      success: false,
      error: json,
    };
  }

  /*
   * 재결제 성공
   */
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

  return {
    success: true,
    payment: json.body,
  };
}

/**
 * 3. 핸들러 서브 라우팅
 */
export async function handleBillingRequestNaver(request, env) {
  /*
   * CORS preflight
   */
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        allow: "GET, POST, OPTIONS",
      },
    });
  }

  /*
   * 사용자 인증
   */
  const user = await requireUser(request, env);

  if (!user) {
    return reply(
      {
        error: "Authentication required.",
      },
      401,
    );
  }

  try {
    const path = new URL(request.url).pathname;

    /*
     * 네이버페이 SDK 설정
     */
    if (
      path === "/api/billing/naver/config" ||
      path === "/api/billing/naver/prepare"
    ) {
      return configNaver(env, user);
    }

    /*
     * 네이버페이 결제 승인
     */
    if (request.method === "POST" && path === "/api/billing/naver/approve") {
      return approveNaver(request, env, user);
    }

    /*
     * 구독 상태 조회
     */
    if (request.method === "GET" && path === "/api/billing/naver/status") {
      const rows = await supabase(
        env,
        `subscriptions?user_id=eq.${user.id}&select=status,current_period_end,cancel_at_period_end`,
      );

      return reply(
        rows[0] || {
          status: "none",
        },
      );
    }

    return reply(
      {
        error: "Not found.",
      },
      404,
    );
  } catch (error) {
    console.error("NaverPay Billing API error", error);

    return reply(
      {
        error: "Payment service temporarily unavailable.",
      },
      500,
    );
  }
}

/**
 * 4. 네이버페이 정기결제 갱신 스케줄러
 */
export async function renewDueSubscriptionsNaver(env) {
  const now = encodeURIComponent(new Date().toISOString());

  const select = "select=user_id,current_period_end,payment_retry_count";

  /*
   * 정상 구독 중 결제일 도래
   */
  const activeDue = await supabase(
    env,
    `subscriptions?status=eq.active&cancel_at_period_end=eq.false&current_period_end=lte.${now}&${select}`,
  );

  /*
   * pending 상태에서 결제일 도래
   */
  const pendingDue = await supabase(
    env,
    `subscriptions?status=eq.pending&cancel_at_period_end=eq.false&current_period_end=lte.${now}&${select}`,
  );

  /*
   * 결제 실패 후 재시도 시점 도래
   */
  const retryDue = await supabase(
    env,
    `subscriptions?status=eq.past_due&cancel_at_period_end=eq.false&next_retry_at=not.is.null&next_retry_at=lte.${now}&${select}`,
  );

  const due = [...activeDue, ...pendingDue, ...retryDue];

  /*
   * 결제 대상 구독 순회
   */
  for (const subscription of due) {
    try {
      const customer = await getCustomer(env, subscription.user_id);

      /*
       * 자동결제 번호가 없으면
       * 결제 실패 상태로 변경
       */
      if (!customer?.recurrent_repay_no) {
        await markPastDue(
          env,
          subscription.user_id,
          subscription.payment_retry_count || 0,
        );

        continue;
      }

      /*
       * 네이버페이 자동결제
       */
      await chargeNaver(env, subscription.user_id, customer.recurrent_repay_no);
    } catch (error) {
      console.error(
        "Naver Subscription renewal failed",
        subscription.user_id,
        error,
      );
    }
  }
}
