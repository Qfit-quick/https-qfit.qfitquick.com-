// 네이버 로그인(2026-10-01) — Supabase Auth 는 네이버를 기본 제공자로
// 안 둔다(구글·카카오와 달리). 대신 Supabase 의 "커스텀 OAuth2 공급자"
// 기능으로 등록하는데, 그 UserInfo URL 호출은 Supabase 서버가 네이버
// 토큰 엔드포인트에서 받은 access_token 을 그대로 Authorization 헤더에
// 실어 부른다 — 네이버의 진짜 사용자 정보 주소(openapi.naver.com/v1/
// nid/me)를 직접 UserInfo URL 로 등록해도 호출 자체는 된다.
//
// 문제는 응답 모양이다. 네이버는
//   { resultcode: "00", message: "success", response: { id, email, ... } }
// 처럼 실제 필드를 response 로 한 번 더 감싸 돌려준다. Supabase 는 이런
// 중첩을 모르고 최상위에서 sub(식별자)·email 을 바로 찾으므로, 감싸인
// 채로 등록하면 로그인마다 매번 새 사용자가 생기거나(식별자를 못 찾아
// 안정적으로 매칭 못 함) 아예 실패한다. 그래서 이 자리(우리 워커)를
// UserInfo URL 로 등록하고, 여기서 받은 그대로를 Supabase 가 기대하는
// 평평한 모양으로 펴서 돌려준다. docs/DEPLOY.md 의 "소셜 로그인" 절 참고.
export async function naverUserinfo(request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "missing authorization" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  let json;
  try {
    const res = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { authorization: auth },
      signal: AbortSignal.timeout(15_000),
    });
    json = await res.json().catch(() => ({}));
    if (!res.ok || json.resultcode !== "00" || !json.response) {
      console.error("naver userinfo failed", res.status, json.resultcode, json.message);
      return new Response(JSON.stringify({ error: "naver userinfo failed" }), {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  } catch (error) {
    console.error("naver userinfo request error", error);
    return new Response(JSON.stringify({ error: "naver request failed" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const u = json.response;
  // sub 는 Supabase 가 이 제공자 안에서 같은 사람을 다시 알아보는 유일한
  // 열쇠다 — 네이버 계정의 고유 id(바뀌지 않는다)를 그대로 쓴다.
  return new Response(
    JSON.stringify({
      sub: u.id,
      email: u.email || undefined,
      email_verified: !!u.email,
      name: u.name || u.nickname || undefined,
      picture: u.profile_image || undefined,
    }),
    { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } },
  );
}
