// utils/billingUtils.js

import { getTestToken } from "./getTestToken";

// 1. 공통 HTTP Response 생성기
export const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

// 2. KST(한국 표준시) YYYY-MM-DD 변환 Helper
export function periodDateKST(date) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().slice(0, 10);
}

// 3. Supabase 유저 인증 (토크 확인)
export async function requireUser(request, env) {
  //const authHeader = request.headers.get("authorization");
  let authHeader = await getTestToken(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    "test@gmail.com",
    "test1234",
  );
  if (!authHeader?.startsWith("Bearer ")) return null;

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      authorization: authHeader,
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
    },
  });
  return res.ok ? res.json() : null;
}

// 4. Supabase REST API 호출 Wrapper (DB CRUD 공통)
export async function supabase(env, path, init = {}) {
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

// 5. 고객 빌링 정보 조회 (토스/카카오 공통)
export async function getCustomer(env, userId) {
  const rows = await supabase(
    env,
    `billing_customers?user_id=eq.${userId}&select=customer_key,toss_billing_key,kakao_sid,provider`,
  );
  return rows[0] || null;
}

// 6. 결제 실패 시 연체(past_due) 및 재시도 스케줄 처리 (토스/카카오 공통)
export async function markPastDue(env, userId, currentCount = 0) {
  const retryCount = currentCount + 1;
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

// 7. 구독 기간 계산 Helper (다음 달 같은 일자로 계산)
export function calculateNextPeriod(startDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
