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

// 네이버 OIDC 설정 문서 중계(2026-10-02).
//
// Supabase 대시보드의 Naver 제공자는 처음에 OIDC 유형으로 만들어져서,
// 저장할 때마다 Issuer(https://nid.naver.com)로 자동 탐색이 다시 돌아
// 사용자 정보 주소를 네이버 원래 주소로 되돌린다 — Manual 로 바꿔 위
// naverUserinfo 를 넣어도 저장 직후 덮어써졌다(실제로 그랬다). 유형은
// 바꿀 수 없고, OAuth2 유형으로 새로 만들려면 네이버 Client Secret 을
// 다시 넣어야 한다.
//
// 그래서 탐색이 읽는 문서 자체를 바꾼다: 대시보드의 Discovery URL 을 이
// 주소로 두면, 네이버의 진짜 설정을 그대로 돌려주되 userinfo_endpoint 만
// 위 naverUserinfo 로 바꿔 준다. issuer·jwks_uri·token_endpoint 는 네이버
// 것 그대로라 ID 토큰 검증은 원래대로 된다.
export async function naverOpenidConfiguration(request) {
  try {
    const res = await fetch("https://nid.naver.com/.well-known/openid-configuration", {
      signal: AbortSignal.timeout(15_000),
    });
    const doc = await res.json();
    if (!res.ok || !doc.issuer) throw new Error("bad discovery response " + res.status);
    doc.userinfo_endpoint = new URL("/api/auth/naver-userinfo", request.url).toString();
    return new Response(JSON.stringify(doc), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("naver discovery relay failed", error);
    return new Response(JSON.stringify({ error: "naver discovery failed" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
