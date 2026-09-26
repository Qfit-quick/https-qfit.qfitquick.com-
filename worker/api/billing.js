// Server-only Toss Payments Billing API. Do not import from src/.
// Required Worker secrets: TOSS_SECRET_KEY, TOSS_CLIENT_KEY, SUPABASE_URL,
// SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY.
const PLAN = Object.freeze({
  id: "premium_monthly",
  name: "Q-fit Premium (monthly)",
  amount: 2400,
});
const TOSS = "https://api.tosspayments.com";
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
const tossAuthorization = (secret) => `Basic ${btoa(`${secret}:`)}`;
const orderId = () => `sub_${crypto.randomUUID().replaceAll("-", "")}`;

async function requireUser(request, env) {
  let authorization = request.headers.get("authorization");
  authorization = String(authorization);
  if (!authorization?.startsWith("Bearer ")) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization, apikey: env.SUPABASE_PUBLISHABLE_KEY },
  });
  return res.ok ? res.json() : null;
}

async function supabase(env, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", env.SUPABASE_SECRET_KEY);
  headers.set("authorization", `Bearer ${env.SUPABASE_SECRET_KEY}`);
  headers.set("content-type", "application/json");
  headers.set("prefer", headers.get("prefer") || "return=representation");
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers,
  });
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = raw;
  }
  if (!response.ok) {
    const error = new Error(
      `Supabase ${response.status}: ${JSON.stringify(body)}`,
    );
    error.status = response.status;
    error.code = body && typeof body === "object" ? body.code : undefined;
    throw error;
  }
  return body;
}

async function toss(path, secret, body, method = "POST") {
  const response = await fetch(`${TOSS}${path}`, {
    method,
    headers: {
      authorization: tossAuthorization(secret),
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Toss documents that billing approval can take up to 60 seconds.
    signal: AbortSignal.timeout(65_000),
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function getCustomer(env, userId) {
  const rows = await supabase(
    env,
    `billing_customers?user_id=eq.${userId}&select=customer_key,billing_key`,
  );
  return rows[0] || null;
}

async function prepare(env, user) {
  let customer = await getCustomer(env, user.id);
  if (!customer) {
    const customerKey = `qfit_${crypto.randomUUID()}`;
    await supabase(env, "billing_customers", {
      method: "POST",
      headers: { prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ user_id: user.id, customer_key: customerKey }),
    });
    customer = await getCustomer(env, user.id);
  }
  if (!customer) throw new Error("Billing customer creation failed");
  // The client key is public by design; the secret key is never returned.
  return reply({
    customerKey: customer.customer_key,
    clientKey: env.TOSS_CLIENT_KEY,
    plan: PLAN,
  });
}

async function ensureSubscription(env, userId) {
  const rows = await supabase(
    env,
    `subscriptions?user_id=eq.${userId}&select=id,status,current_period_start,current_period_end,billing_anchor_day,payment_retry_count,next_retry_at`,
  );
  if (rows[0]) return rows[0];
  try {
    const created = await supabase(env, "subscriptions", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        plan_id: PLAN.id,
        status: "pending",
      }),
    });
    return created[0];
  } catch (error) {
    // A concurrent request may have created the user's unique subscription.
    if (error.status !== 409 && error.code !== "23505") throw error;
    const rows = await supabase(
      env,
      `subscriptions?user_id=eq.${userId}&select=id,status,current_period_start,current_period_end,billing_anchor_day,payment_retry_count,next_retry_at`,
    );
    if (rows[0]) return rows[0];
    throw error;
  }
}

function addCalendarMonth(date, anchorDay) {
  const next = new Date(date);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(anchorDay, lastDay));
  return next;
}

const periodDate = (date) => date.toISOString().slice(0, 10);
const pendingResponse = () =>
  reply(
    { status: "pending", message: "Payment result is being reconciled." },
    202,
  );

async function findPeriodOrder(env, subscriptionId, periodStart) {
  const rows = await supabase(
    env,
    `payment_orders?subscription_id=eq.${subscriptionId}&billing_period_start=eq.${periodStart}&status=in.(pending,paid)&select=id,order_id,status,amount,created_at,updated_at`,
  );
  return rows[0] || null;
}

async function reconcileTossOrder(env, order) {
  try {
    const { response, json } = await toss(
      `/v1/payments/orders/${encodeURIComponent(order.order_id)}`,
      env.TOSS_SECRET_KEY,
      undefined,
      "GET",
    );
    if (response.ok) return { found: true, payment: json };
    if (response.status === 404) return { found: false };
    return { uncertain: true };
  } catch {
    return { uncertain: true };
  }
}

async function markPastDue(env, userId, currentCount = 0) {
  const retryCount = currentCount + 1;
  // Retry after 1, 2, 4, and 8 hours; stop automatic attempts after 5 failures.
  const delayHours =
    retryCount >= 5 ? null : Math.min(24, 2 ** (retryCount - 1));
  await supabase(env, `subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "past_due",
      payment_retry_count: retryCount,
      next_retry_at:
        delayHours == null
          ? null
          : new Date(Date.now() + delayHours * 3600_000).toISOString(),
    }),
  });
}

async function settlePayment(
  env,
  userId,
  subscription,
  order,
  payment,
  periodStartAt,
  anchorDay,
) {
  if (
    payment.status !== "DONE" ||
    payment.orderId !== order.order_id ||
    Number(payment.totalAmount) !== PLAN.amount
  ) {
    console.error(
      "Toss billing response did not match the pending order",
      order.order_id,
    );
    return pendingResponse();
  }
  const start = new Date(periodStartAt);
  const end = addCalendarMonth(start, anchorDay);
  const settledAt = payment.approvedAt || new Date().toISOString();
  await supabase(
    env,
    `payment_orders?order_id=eq.${order.order_id}&status=eq.pending`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "paid",
        toss_payment_key: payment.paymentKey,
        approved_at: settledAt,
        // Store only fields needed for support/audit, not the full provider payload.
        toss_response: {
          status: payment.status,
          orderId: payment.orderId,
          totalAmount: payment.totalAmount,
          approvedAt: payment.approvedAt || null,
          method: payment.method || null,
        },
      }),
    },
  );
  await supabase(env, `subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "active",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      billing_anchor_day: anchorDay,
      payment_retry_count: 0,
      next_retry_at: null,
      cancel_at_period_end: false,
    }),
  });
  return reply({ status: "active", currentPeriodEnd: end.toISOString() });
}

async function charge(env, userId, customer, periodStart, isInitial = false) {
  const subscription = await ensureSubscription(env, userId);
  if (isInitial && subscription.status === "active")
    return reply({ status: "active", duplicate: true });

  const periodStartAt = isInitial
    ? new Date()
    : new Date(subscription.current_period_end);
  const billingPeriodStart = isInitial
    ? periodDate(periodStartAt)
    : periodStart;
  const anchorDay =
    subscription.billing_anchor_day || periodStartAt.getUTCDate();
  if (isInitial && !subscription.current_period_end) {
    // Keep the original billing boundary even if the first charge fails; retry
    // must use the same period instead of deriving a date from null.
    await supabase(env, `subscriptions?user_id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        current_period_start: periodStartAt.toISOString(),
        current_period_end: periodStartAt.toISOString(),
        billing_anchor_day: anchorDay,
      }),
    });
  }
  let order = await findPeriodOrder(env, subscription.id, billingPeriodStart);
  if (order?.status === "paid") {
    // Repair subscription state if the provider charge was saved but the later
    // subscription update failed in a previous invocation.
    const reconciled = await reconcileTossOrder(env, order);
    if (reconciled.found)
      return settlePayment(
        env,
        userId,
        subscription,
        order,
        reconciled.payment,
        periodStartAt,
        anchorDay,
      );
    return pendingResponse();
  }

  if (order?.status === "pending") {
    const ageMs =
      Date.now() - new Date(order.updated_at || order.created_at).getTime();
    if (ageMs < 120_000) return pendingResponse();
    // Claim stale pending rows so overlapping cron runs do not reconcile/charge together.
    const claimed = await supabase(
      env,
      `payment_orders?order_id=eq.${order.order_id}&status=eq.pending&updated_at=lt.${encodeURIComponent(new Date(Date.now() - 120_000).toISOString())}&select=id,order_id,status,amount,created_at,updated_at`,
      {
        method: "PATCH",
        body: JSON.stringify({ updated_at: new Date().toISOString() }),
      },
    );
    if (!claimed?.length) return pendingResponse();
    order = claimed[0];
    const reconciled = await reconcileTossOrder(env, order);
    if (reconciled.found)
      return settlePayment(
        env,
        userId,
        subscription,
        order,
        reconciled.payment,
        periodStartAt,
        anchorDay,
      );
    if (reconciled.uncertain) return pendingResponse();
  } else {
    try {
      const rows = await supabase(env, "payment_orders", {
        method: "POST",
        body: JSON.stringify({
          subscription_id: subscription.id,
          user_id: userId,
          order_id: orderId(),
          billing_period_start: billingPeriodStart,
          amount: PLAN.amount,
          status: "pending",
        }),
      });
      order = rows[0];
    } catch (error) {
      if (error.status !== 409 && error.code !== "23505") throw error;
      const existing = await findPeriodOrder(
        env,
        subscription.id,
        billingPeriodStart,
      );
      if (existing?.status === "paid")
        return reply({ status: "active", duplicate: true });
      return pendingResponse();
    }
  }

  let result;
  try {
    result = await toss(
      `/v1/billing/${encodeURIComponent(customer.billing_key)}`,
      env.TOSS_SECRET_KEY,
      {
        customerKey: customer.customer_key,
        amount: PLAN.amount,
        orderId: order.order_id,
        orderName: PLAN.name,
      },
    );
  } catch (error) {
    // A timeout/network failure is ambiguous: leave pending and reconcile by orderId later.
    console.error("Toss billing result unknown", order.order_id, error);
    return pendingResponse();
  }

  const { response, json } = result;
  if (!response.ok) {
    // 5xx can be returned after an approval was processed; do not mark it retryable yet.
    if (response.status >= 500) return pendingResponse();
    await supabase(
      env,
      `payment_orders?order_id=eq.${order.order_id}&status=eq.pending`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "failed",
          failure_code: json.code || "TOSS_ERROR",
          failure_message: json.message || "Payment failed",
        }),
      },
    );
    await markPastDue(env, userId, subscription.payment_retry_count || 0);
    return reply(
      { status: "failed", code: json.code || "PAYMENT_FAILED" },
      422,
    );
  }
  return settlePayment(
    env,
    userId,
    subscription,
    order,
    json,
    periodStartAt,
    anchorDay,
  );
}

async function authorize(request, env, user) {
  const { authKey, customerKey } = await request.json().catch(() => ({}));
  if (
    typeof authKey !== "string" ||
    authKey.length > 300 ||
    typeof customerKey !== "string" ||
    customerKey.length > 50
  )
    return reply({ error: "Invalid billing authorization data." }, 400);
  const customer = await getCustomer(env, user.id);
  if (!customer || customer.customer_key !== customerKey)
    return reply({ error: "Billing customer mismatch." }, 403);
  const issued = await toss(
    "/v1/billing/authorizations/issue",
    env.TOSS_SECRET_KEY,
    { authKey, customerKey },
  );
  if (!issued.response.ok)
    return reply(
      { error: "Card registration failed.", code: issued.json.code },
      422,
    );
  const securedCustomer = { ...customer, billing_key: issued.json.billingKey };
  await supabase(env, `billing_customers?user_id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      billing_key: issued.json.billingKey,
      card_number: issued.json.card?.number || null,
      card_issuer_code: issued.json.card?.issuerCode || null,
      billing_key_issued_at: new Date().toISOString(),
    }),
  });
  return charge(
    env,
    user.id,
    securedCustomer,
    new Date().toISOString().slice(0, 10),
    true,
  );
}

async function setCancelFlag(env, user, cancel) {
  const rows = await supabase(
    env,
    `subscriptions?user_id=eq.${user.id}&select=id,status`,
  );
  const sub = rows[0];
  // 해지 예약은 갱신을 막을 뿐이니 active/past_due 에만 의미가 있다 —
  // 구독 자체가 없거나 이미 끝난 사람에게는 되돌릴 것도 막을 것도 없다.
  if (!sub || !["active", "past_due"].includes(sub.status))
    return reply({ error: "No active subscription." }, 404);
  const updated = await supabase(env, `subscriptions?user_id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({ cancel_at_period_end: !!cancel }),
  });
  const row = updated[0] || {};
  return reply({
    status: row.status,
    current_period_end: row.current_period_end,
    cancel_at_period_end: row.cancel_at_period_end,
  });
}

export async function handleBillingRequest(request, env) {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: { allow: "GET, POST, OPTIONS" } });
  const user = await requireUser(request, env);
  if (!user) return reply({ error: "Authentication required." }, 401);
  try {
    const path = new URL(request.url).pathname;
    if (request.method === "POST" && path === "/api/billing/prepare")
      return prepare(env, user);
    if (request.method === "POST" && path === "/api/billing/authorize")
      return authorize(request, env, user);
    if (request.method === "GET" && path === "/api/billing/status") {
      const rows = await supabase(
        env,
        `subscriptions?user_id=eq.${user.id}&select=status,current_period_end,cancel_at_period_end`,
      );
      return reply(rows[0] || { status: "none" });
    }
    if (request.method === "POST" && path === "/api/billing/cancel") {
      const { cancel } = await request.json().catch(() => ({}));
      return setCancelFlag(env, user, cancel !== false);
    }
    return reply({ error: "Not found." }, 404);
  } catch (error) {
    console.error("billing API error", error);
    return reply({ error: "Payment service temporarily unavailable." }, 500);
  }
}

export async function renewDueSubscriptions(env) {
  const now = encodeURIComponent(new Date().toISOString());
  const select =
    "select=user_id,current_period_end,billing_anchor_day,payment_retry_count";
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
      if (!customer?.billing_key) {
        await markPastDue(
          env,
          subscription.user_id,
          subscription.payment_retry_count || 0,
        );
        continue;
      }
      await charge(
        env,
        subscription.user_id,
        customer,
        subscription.current_period_end.slice(0, 10),
      );
    } catch (error) {
      // Keep processing other subscribers if one row or provider call fails.
      console.error("Subscription renewal failed", subscription.user_id, error);
    }
  }
}
