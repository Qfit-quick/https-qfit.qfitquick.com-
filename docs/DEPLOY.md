# 배포

마지막 확인: **2026-09-25**

## 지금 상태 한 줄

배포 자동화는 돌고 있고, `qfit.qfitquick.com` 이 실제로 최신 판을
서빙한다. 이 문서를 처음 쓴 2026-09-08 시점엔 커스텀 도메인이 워커에
안 붙어 있었는데, 그 뒤 어느 시점에 해결되어 있었다(정확한 시점은
기록에 없다 — 이 문서를 다시 다듬으며 실제로 qfit.qfitquick.com 에
배포가 반영되는 것을 여러 차례 확인했다).

**2026-09-25 부터 달라진 것**: 빌드 산출물 위치가 저장소 루트에서
`app/dist/` 로 옮겨졌다(Toss 결제 API 를 붙이면서 같이 정리). 아래
내용은 새 구조 기준이다 — 예전 판을 찾는다면 git 이력의 2026-09-25
이전 커밋을 본다.

## 어디가 무엇을 서빙하나

| 주소 | 실체 | 갱신 방법 |
| --- | --- | --- |
| `qfit.qfitquick.com` | 클라우드플레어 워커 `qfit-quickfitness` | `main` push 또는 `wrangler deploy` |
| `qfit-quickfitness.monster-rpg.workers.dev` | 같은 워커의 기본 주소 | 위와 같음 |
| `qfit.github.io/https-qfit.qfitquick.com-` | GitHub Pages | **2026-09-25 부터 더는 갱신되지 않는다** — 아래 참고 |

**GitHub Pages 는 이제 옛 판(또는 404)을 보여준다.** Pages 는 '저장소
루트를 그대로' 서빙하도록 잡혀 있는데, 산출물이 `app/dist/` 로 옮겨가면서
루트에 더는 `index.html` 이 없다. 실제 서비스 주소는 Pages 가 아니라
클라우드플레어 워커라 사용자에게 영향은 없다 — 다만 이 Pages 주소를
따로 쓰고 있었다면(북마크 등) 옮겨야 한다. Pages 설정 자체(무엇을
서빙할지)는 저장소 관리자만 바꿀 수 있다.

## 왜 push 만으로는 안 되나

클라우드플레어 워커는 저장소를 보지 않는다. **자기가 올려받은 자산 묶음**을
서빙한다(`wrangler.jsonc` 의 `assets.directory: "./app/dist"`). GitHub 에
push 하는 것과 워커에 올리는 것은 완전히 다른 두 동작이다.

그래서 push 만 하면 저장소는 새 판인데 워커는 옛 판인 상태가 된다.
저장소를 봐도 멀쩡해 보인다 — 그래서 `.github/workflows/deploy.yml` 이
push 마다 다시 빌드해서 산출물이 다르면 되커밋하고, 그 다음 클라우드플레어에
올린다.

## 무엇이 실제로 올라가나

`assets.directory` 가 `app/dist/` 를 가리키므로, **그 폴더 안의 전부**가
그대로 공개 URL 이 된다. 그 폴더에는 애초에 빌드 산출물만 있어서(소스·
설정 파일은 다른 폴더에 있다) 걸러낼 것이 없다 — `.assetsignore` 는
2026-09-25 에 지웠다.

    npx wrangler deploy --dry-run

지금은 127개 파일, 17.69 KiB(워커 스크립트 자체 크기 — 정적 자산은
별도 집계)가 잡힌다. 이 숫자가 갑자기 만 단위로 뛰면 `assets.directory`
가 잘못된 폴더(예: 저장소 루트)를 가리키고 있는지 `wrangler.jsonc` 를
본다.

### 예전(2026-09-25 이전)에 여기서 죽었다

그때는 `assets.directory` 가 저장소 루트(`"."`)였다. `.assetsignore` 가
`node_modules` 한 줄뿐이던 시절엔 자산이 14,704개로 잡히고 배포가
**실패했다** — `.git/objects/pack` 의 팩 파일(53MB)이 워커의 파일당
25MiB 한도를 넘겼기 때문이다. 그 뒤로도 `.assetsignore` 목록을 계속
손봐야 했고, 윈도우에서 `npx wrangler deploy` 를 직접 돌리면 그 목록이
제대로 안 먹히는 별도 버그도 있었다(경로 구분자 문제, 되풀이 확인됨).
산출물 폴더를 분리한 지금은 이 문제들이 **구조적으로 다시 날 수 없다**
— 걸러낼 대상 자체가 없어졌다.

## 워커에 `main` 스크립트가 붙은 이유 (2026-09-20)

`assets.directory` 만 있던 순수 정적 자산 서빙은 **Range 요청을 지원하지
않는다** — `curl -H "Range: bytes=0-100"` 을 보내도 항상 206 이 아니라 200(전체
파일)이 온다(클라우드플레어 쪽 한계, cloudflare/workers-sdk#3861). 운동 클립
`<video>` 가 이걸 받으면 `readyState` 가 0에서 못 올라가 **영상이 영원히 안
뜬다** — 콘솔엔 에러도 안 찍혀서 조용히 실패한다.

그래서 `wrangler.jsonc` 에 `main: worker/media-range.js` 를 추가했다. 이제
`.mp4`/`.webm` 요청만 이 스크립트가 가로채 직접 206 을 만들어 주고, 나머지는
전부 그대로 `env.ASSETS.fetch()` 로 넘긴다 — assets 서빙 경로 자체는 안 바뀐다.

`main` 이 생기면 `assets.binding: "ASSETS"` 도 같이 있어야 스크립트가
`env.ASSETS` 로 정적 자산에 접근할 수 있다. 워커 소스(`worker/`)는 원래
`app/dist/` 밖에 있어서 자산으로 같이 올라갈 일이 없다.

**기본은 자산 우선이라 이것만으로는 안 된다.** `main`과 `assets`를 같이
쓰면 클라우드플레어는 요청과 일치하는 정적 파일이 있으면 워커 스크립트를
아예 안 거치고 바로 서빙한다 — `media/clips/*.mp4`도 파일이라 그대로
걸린다. 그래서 `assets.run_worker_first: ["/media/clips/*", "/api/*"]`로
이 경로들만 워커를 먼저 태우게 했다(`/api/*` 는 아래 결제 API). 다른
자산(이미지 등)은 여전히 워커를 안 거친다.

## Toss Payments 연동 (2026-09-25)

정기결제(프리미엄 구독)가 `worker/api/billing.js` + `src/ui/billing.js` +
Supabase 세 테이블로 붙어 있다. API 동작·DB 스키마 자세한 내용은
`docs/sql/2026-09-toss-billing.sql` 과 그 옆 명세서를 본다.

카카오페이(`worker/api/kakaoBilling.js`)도 같은 요금제를 공유한다 —
`worker/api/billing.js` 의 `PLANS` 맵(월간 `premium_monthly`, 연간
`premium_annual`) 하나를 두 파일이 같이 `import` 해서 쓴다. 요금제를
추가·변경할 땐 이 맵만 고치면 된다 — `plan_id` 컬럼엔 CHECK 제약이
없어서 새 SQL 마이그레이션도 필요 없다.

### 월간·연간 두 상품 (2026-09-30)

네이버페이가 가맹점 등록에 "상품 3개 이상"을 요구해서, 프리미엄 결제
하나뿐이던 것을 월간(₩1,900/월)·연간(₩19,000/년, 월 결제 대비 2개월치
절약) 두 상품으로 늘렸다. 프리미엄 덮개(`#premium-overlay`)의
`#premium-plan-tabs` 로 고르고, `src/ui/billing.js` 의
`window.getSelectedPlanId()` 가 그 상태의 유일한 출처다 — 결제 준비
요청(Toss `/api/billing/prepare`, 카카오 `/api/billing/kakao/prepare`)
모두 이 값을 `planId` 로 실어 보낸다. Toss 는 카드 인증창에서 돌아오며
페이지가 새로 뜨므로 고른 요금제를 sessionStorage 에 잠깐 맡겼다가
`/api/billing/authorize` 호출 때 같이 보내고, 카카오는 `prepareKakao` 가
`approval_url` 자체에 `plan_id` 를 실어 둬서 돌아온 주소에서 바로 읽는다.

**세 번째 상품은 아직 없다** — 결정하지 않은 채 억지로 채우면 사용자
눈에 뻔한 끼워맞추기로 보인다는 판단으로 미뤘다. 나중에 실제로 쓸모
있는 것이 정해지면 그때 추가한다.

## 무료 체험 (2026-09-30)

결제수단 등록 없이 계정당 한 번, 1개월을 그냥 active 로 준다
(`worker/api/billing.js` 의 `startTrial`, `docs/sql/2026-09-premium-trial.sql`
의 `subscriptions.trial_used`). 결제수단이 없으니 체험이 끝나면 기존
갱신 크론이 스스로 "카드 없음" 으로 판단해 `past_due` 로 떨어뜨린다 —
체험판을 끝내는 별도 로직이 없다. Supabase SQL Editor 에서
`docs/sql/2026-09-premium-trial.sql` 을 한 번 실행해야 한다(안 돌리면
체험 버튼을 눌러도 500).

**지금 상태: Toss 시크릿이 아직 안 들어가 있어서 실제 결제는 안 된다.**
카드 등록 버튼(설정 화면)을 누르면 서버가 `TOSS_SECRET_KEY` 를 못 찾아
500 을 준다. 아래 절차로 발급·설정한다.

### 1. Toss 키 발급

1. [Toss Payments 개발자센터](https://developers.tosspayments.com) 가입.
   사업자 등록 없이도 **테스트 키**는 바로 나온다.
2. "내 개발정보"에서 **시크릿 키**·**클라이언트 키** 확인.
3. 정기결제(빌링) 기능은 별도 활성화가 필요할 수 있다 — 메뉴에서
   "빌링"/"자동결제" 항목을 찾아 켠다.
4. 실 결제(라이브 키)로 가려면 사업자 등록 심사가 필요하다 — 테스트
   단계에서는 테스트 키로 충분하다.

### 2. 워커 시크릿 등록

GitHub Secrets 가 아니라 **클라우드플레어 워커 시크릿**이다 — CI 가 아니라
실행 중인 워커가 직접 읽는 값이라 그렇다.

    npx wrangler secret put TOSS_SECRET_KEY
    npx wrangler secret put TOSS_CLIENT_KEY
    npx wrangler secret put SUPABASE_URL              # cloud/supabase.js 의 URL 과 같은 값
    npx wrangler secret put SUPABASE_PUBLISHABLE_KEY  # cloud/supabase.js 의 anon key 와 같은 값
    npx wrangler secret put SUPABASE_SECRET_KEY       # Supabase 대시보드의 service_role 키 — 절대 프론트에 노출 금지

`TOSS_CLIENT_KEY` 는 사실 비밀이 아니다(카드 등록창을 여는 데 브라우저로
그대로 내려준다, `worker/api/billing.js` 의 `prepare` 참고) — 그래도
워커 시크릿으로 관리하면 나중에 값을 바꿀 때 코드를 안 건드려도 된다.

### 3. 데이터베이스 준비

Supabase 대시보드 → SQL Editor 에서 `docs/sql/2026-09-toss-billing.sql`
내용을 한 번 실행한다. `billing_customers`·`subscriptions`·
`payment_orders` 세 테이블과 RLS 정책을 만든다 — 서비스 롤 키로만 쓰고
읽기는 있는데 걸리는 정책이라, 잘못 실행해도 기존 데이터에 영향은 없다.

### 4. 크론 확인

`wrangler.jsonc` 의 `triggers.crons: ["0 * * * *"]` 가 매시 정각에
`renewDueSubscriptions()` 를 돌린다 — 별도 설정 없이 배포하면 자동으로
등록된다. 이 함수는 2026-09-29 부터 토스·카카오 둘 다 처리한다(아래).

## 카카오페이 연동 (2026-09-29)

같은 구독(`subscriptions` 테이블)에 결제 수단 하나를 더 얹은 것이다 —
새 결제 시스템이 아니라 Toss 옆에 나란히 놓인 선택지다.
`worker/api/kakaoBilling.js` + `src/ui/billing.js`(같은 파일, Toss 함수
옆에 추가) + `docs/sql/2026-09-kakao-billing.sql`(`billing_customers` 에
`provider`·`kakao_sid` 두 컬럼만 더한다, 기존 Toss 행은 안 건드린다).

동료 개발자(soooonho)가 `dev` 브랜치에 먼저 올린 판을 그대로 가져오지
않고 다시 짰다 — 원본은 서버의 `requireUser()` 가 요청의 실제 로그인
토큰을 안 읽고 테스트 계정(`test@gmail.com`)으로 항상 로그인해 버리는
채로 남아 있었다(로컬 테스트용 지름길이 실수로 커밋된 것으로 보인다).
그 상태로 나가면 누가 결제하든 전부 그 테스트 계정 앞으로 처리된다.
지금 판은 `worker/api/billing.js` 의 이미 검증된 `requireUser`·
`supabase`·`getCustomer`·`markPastDue` 를 그대로 가져다 쓴다(두 파일이
따로 복사해 두면 한쪽만 고치고 한쪽은 안 고치는 사고가 또 난다).

**지금 상태: 카카오 시크릿이 아직 안 들어가 있어서 실제 결제는 안 된다**
(Toss 와 같은 이유, 같은 증상 — 500).

### 1. 카카오 키 발급

1. [카카오페이 파트너 어드민](https://admin-pay.kakao.com) 가입 후
   "정기결제(구독)" 서비스 신청. 사업자 등록 없이 **테스트 CID**로 먼저
   붙일 수 있다(`worker/api/kakaoBilling.js` 의 `KAKAO_CID` 가 지금
   테스트 값 `"TCSUBSCRIP"`로 박혀 있다 — 실 서비스로 가면 발급받은
   진짜 CID 로 바꾼다).
2. "결제 연동" 메뉴에서 **어드민 키**(시크릿 키) 확인.

### 2. 워커 시크릿 등록

    npx wrangler secret put KAKAO_SECRET_KEY

Toss 절의 `SUPABASE_*` 세 개는 이미 등록돼 있으면 다시 안 넣어도 된다 —
`kakaoBilling.js` 는 `billing.js` 의 같은 Supabase 접속 코드를 그대로
가져다 쓴다.

### 3. 데이터베이스 준비

Supabase 대시보드 → SQL Editor 에서 `docs/sql/2026-09-kakao-billing.sql`
을 한 번 실행한다. `billing_customers` 에 컬럼 두 개(`provider` 기본값
`'toss'`, `kakao_sid`)만 더하는 것이라, 실행해도 기존 Toss 구독자에게는
아무 영향이 없다.

## 간편 로그인 — 구글·카카오·네이버 (2026-10-01)

로그인·회원가입 화면(`#account-screen`)에 세 버튼을 추가했다. 결제
(Toss·카카오페이)와는 완전히 별개 기능이다 — 이쪽은 Supabase Auth 가
직접 처리하고, 이 저장소 코드는 "어느 제공자로 로그인할지" 버튼을 누르는
것과 돌아온 뒤 세션을 읽는 것만 한다. 시크릿(클라이언트 ID·시크릿)은
전부 **Supabase 대시보드**에 들어가지 — 이 저장소에는 안 둔다.

구글·카카오는 Supabase 가 기본 제공하는 소셜 로그인이고, **네이버는
아니다**(Supabase 공식 제공자 목록에 없다). 그래서 네이버만
"커스텀 OAuth2 제공자" 기능으로 등록한다 — Free 플랜도 3개까지는
무료로 쓸 수 있어 추가 비용은 없다.

### 구글

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   에서 프로젝트를 만들고 "OAuth 2.0 클라이언트 ID"(유형: 웹 애플리케이션)
   를 발급한다.
2. **승인된 리디렉션 URI** 에 Supabase 대시보드가 알려 주는 콜백 주소
   (`https://pdmjlleaheqyldhitkty.supabase.co/auth/v1/callback`)를 그대로
   등록한다.
3. Supabase 대시보드 → Authentication → Sign In / Providers → Google 을
   열고, 발급받은 클라이언트 ID·시크릿을 넣고 켠다.

### 카카오

**결제용 카카오페이 앱과는 다른 설정이다** — 카카오 개발자센터의 같은
앱 안에 "카카오 로그인" 제품을 별도로 켜야 한다(이미 결제 때문에 앱을
만들어 뒀다면 그 앱을 재사용해도 된다. 제품만 추가로 켜면 된다).

1. [Kakao Developers](https://developers.kakao.com) 에서 앱을 열고
   "카카오 로그인" 을 활성화한다.
2. **Redirect URI** 에 Supabase 콜백 주소(위와 동일한 모양,
   `https://pdmjlleaheqyldhitkty.supabase.co/auth/v1/callback`)를 등록한다.
3. "카카오 로그인" > "보안" 에서 **Client Secret** 을 발급한다(필수는
   아니지만 Supabase 가 요구한다).
4. 동의 항목에서 최소한 "닉네임"·"카카오계정(이메일)" 을 켠다 — 이메일을
   안 켜면 Supabase 가 받는 사용자 정보에 이메일이 비어, 이메일 기준으로
   다른 로그인 수단과 계정을 합칠 방법이 없어진다.
5. Supabase 대시보드 → Providers → Kakao 에 REST API 키(Client ID)와
   위 Client Secret 을 넣고 켠다.

### 네이버 (커스텀 OAuth2 제공자)

네이버는 Supabase 기본 목록에 없어서 "직접 등록"으로 붙인다. 네이버가
돌려주는 사용자 정보가 Supabase 가 기대하는 모양과 달라(아래 참고)
`worker/api/naverAuth.js` 가 그 사이에서 모양만 바꿔 준다 — 이 중계가
없으면 로그인마다 다른 사람으로 인식되거나 아예 실패한다.

1. [네이버 개발자센터](https://developers.naver.com/apps)에서 애플리케이션을
   등록하고 "네이버 로그인" API 사용을 신청한다. 제공 정보에서 최소
   "이메일"·"이름" 을 선택한다(선택 동의 항목이라 심사 없이 바로 켜진다).
2. **Callback URL** 에 Supabase 콜백 주소를 등록한다.
3. "API 설정"에서 **Client ID**·**Client Secret** 을 확인한다.
4. Supabase 대시보드 → Authentication → Sign In / Providers 맨 아래
   "Add provider" → **OAuth2 (Manual configuration)** 를 고르고:
   - **Provider identifier**: `naver` (클라이언트 코드가 호출하는
     `custom:naver` 의 뒷부분 — Supabase 가 앞에 `custom:` 을 자동으로
     붙인다)
   - **Client ID / Secret**: 3번에서 받은 값
   - **Authorization URL**: `https://nid.naver.com/oauth2.0/authorize`
   - **Token URL**: `https://nid.naver.com/oauth2.0/token`
   - **UserInfo URL**: 네이버의 진짜 주소가 아니라
     **`https://qfit.qfitquick.com/api/auth/naver-userinfo`** 를 넣는다
     (워커가 중계하는 주소 — 다음 문단 참고)
   - 대시보드가 보여 주는 **Callback URL** 을 복사해 2번의 네이버 앱
     설정에도 등록돼 있는지 다시 확인한다.

**지금 실제 설정(2026-10-02) — 앱이 쓰는 것은 `custom:naver-login` 이다.**

| 칸 | 값 |
| --- | --- |
| Provider Identifier | `naver-login` (앱: `custom:naver-login`) |
| Configuration Method | Manual configuration |
| Issuer URL | `https://nid.naver.com/oauth2.0` |
| Authorization URL | `https://nid.naver.com/oauth2.0/authorize` |
| Token URL | `https://nid.naver.com/oauth2.0/token` |
| Userinfo URL | `https://qfit.qfitquick.com/api/auth/naver-userinfo` |
| JWKS URI | 비움 |
| Scopes | `profile` |

실제 크롬에서 로그인해 이메일·이름까지 들어오는 것을 확인했다. 같은
이메일로 이미 가입한 계정이 있으면 Supabase 가 그 계정에 합쳐 준다.

**왜 이렇게 됐나 — 지뢰 둘:**

- **Issuer 에 `https://nid.naver.com` 을 넣으면 안 된다.** 그 주소엔 OIDC
  탐색 문서가 있어서, 저장할 때마다 자동 탐색이 돌아 직접 넣은 주소를
  네이버 원래 주소로 덮어쓴다(실제로 그랬다). Issuer 칸은 필수라 비울 수도
  없어서, 탐색 문서가 없는(404) `https://nid.naver.com/oauth2.0` 을 넣는다.
- **처음 만든 `custom:naver` 는 OIDC 유형이라 못 쓴다.** 유형은 만든 뒤
  바꿀 수 없다. OIDC 에선 Supabase 가 네이버 ID 토큰만 읽는데 거기엔
  이메일이 없어서, `Error getting user email from external provider` 로
  막히거나(이메일 필수) 이메일 없는 계정이 생겼다. 새 앱은 안 쓰지만
  **켜 둔다.** 2026-10-02 에 껐더니, 홈 화면에 설치된 앱(옛 판을 아직 들고
  있다)에서 네이버를 누르면 `custom provider custom:naver is disabled`
  원문 오류 화면에 갇혔다. 그래서 다시 켜고 **Allow users without email 만
  껐다** — 켜 두면 옛 판으로 로그인할 때 이메일 없는 별도 계정이 생겨
  기록이 갈라진다. 끈 상태에선 옛 판 사용자는 앱 안에 '이메일 제공' 안내를
  보고, 앱이 새 판으로 바뀐 뒤 다시 누르면 `custom:naver-login` 으로 된다.
  모든 기기가 새 판으로 넘어갔다고 볼 수 있을 만큼(몇 주) 지난 뒤에 끈다. 그 제공자로 2026-10-02 에
  생긴 이메일 없는 테스트 계정이 Users 에 하나 남아 있을 수 있다.
  워커의 `/api/auth/naver-openid-configuration`(탐색 문서 중계)도 그
  제공자용으로 만들었던 것이라 지금은 쓰이지 않는다.

**scope 에 `email` 을 넣으면 안 된다**(2026-10-01). 네이버는
`openid`·`profile` 만 받고, `email` 이 섞이면 로그인 화면도 안 띄우고
곧장 `invalid_scope` 로 돌려보낸다. 사용자에게는 "네이버를 누르면 첫
화면으로 돌아온다"로 보였다. 지금 대시보드 설정은 `openid profile email`
을 보내고 있어서, 앱(`src/app.js` 의 `startSocialSignIn`)이 네이버일 때만
`scopes: 'openid profile'` 로 덮어쓴다. 대시보드의 Scopes 칸도
`openid profile` 로 고쳐 두면 둘이 어긋날 일이 없다. 이메일은 scope 가
아니라 네이버 앱의 '제공 정보' 설정으로 오고, 아래 중계가 받아 넘긴다.

**왜 중계가 필요한가**: 네이버의 실제 사용자 정보 주소
(`openapi.naver.com/v1/nid/me`)는 `{resultcode, message, response: {id,
email, ...}}` 처럼 진짜 필드를 `response` 로 한 번 더 감싸서 돌려준다.
Supabase 는 이런 중첩을 모르고 최상위에서 `sub`(식별자)·`email` 을 바로
찾기 때문에, 감싸인 채로 등록하면 매번 다른 사람으로 보이거나 실패한다.
`worker/api/naverAuth.js` 가 그 응답을 받아 `{sub, email, name, picture}`
평평한 모양으로 펴서 돌려주는 자리이고, `wrangler.jsonc` 의
`run_worker_first: ["/api/*"]` 덕분에 이 주소도 자산보다 먼저 워커를
탄다 — 별도 설정 없이 바로 동작한다.

### 확인하는 법

세 버튼 모두 코드 쪽은 이미 완성돼 있다 — 위 설정 전까지는 눌러도
Supabase 가 `"provider is not enabled"`(구글·카카오) 또는
`"custom provider custom:naver not found"`(네이버) 라고 답하는 화면으로
넘어가는데, 이건 버그가 아니라 "아직 대시보드 설정 전" 이라는 뜻이다.
설정을 마치면 같은 버튼이 그대로 로그인까지 이어진다.

### 로그인이 안 될 때 화면에 뜨는 것 (2026-10-01)

예전엔 무엇이 실패하든 아무 말 없이 첫 화면에 떨어졌다. 지금은 계정
화면을 열고 이유를 적는다. 브라우저 콘솔에는 Supabase 가 준 원문이
`auth code exchange failed:` 또는 `oauth return error:` 로 남는다.

| 화면 문구 | 뜻 | 볼 곳 |
| --- | --- | --- |
| 로그인을 취소했어요 | 제공자 화면에서 취소·동의 안 함 | 정상 |
| 이메일 제공에 동의해야… | 제공자가 이메일을 안 넘겼다 | 카카오 동의 항목의 "카카오계정(이메일)", 네이버 제공 정보의 "이메일". 카카오 이메일은 **비즈 앱 전환**이 있어야 켤 수 있다 |
| 이 링크는 요청했던 브라우저에서… | 메일 링크를 다른 브라우저(메일 앱 안 등)로 열었다 | 정상. 가입 인증이었다면 인증은 이미 끝났다 |
| 링크가 만료됐거나 이미 사용됐어요 | code 를 이미 썼거나 시간이 지났다 | 정상. 처음부터 다시 |
| 구글은 … 앱 안의 브라우저에서 로그인을 막아요 | 카카오톡·인스타그램 인앱 브라우저에서 구글을 눌렀다 | 정상(구글 정책). 앱이 미리 막는다 |
| 간편 로그인에 실패했어요 | 그 밖의 모든 것 | 콘솔의 원문. Supabase 대시보드 → Authentication → Logs |

**아무 문구 없이 엉뚱한 곳으로 돌아온다면** Supabase 대시보드 →
Authentication → URL Configuration 의 **Site URL** 이
`https://qfit.qfitquick.com` 인지 본다. 앱은 `redirectTo` 로 자기 주소를
넘기지만, Supabase 는 Site URL 과 호스트가 같거나 Redirect URLs 목록에 있는
주소로만 돌려보내고 나머지는 Site URL 로 보낸다.

2026-10-01 에 바깥에서 확인한 것: 세 제공자(google·kakao·`custom:naver`)
모두 Supabase 에서 켜져 있고, 각자의 로그인 화면까지 정상으로 넘어간다.
카카오는 `account_email` 동의 항목을 요청한다 — 카카오 앱에서 이 항목이
안 켜져 있으면 로그인 직후 카카오 쪽 오류(KOE205)가 나거나 위 "이메일
제공" 문구가 뜬다.

## 워크플로가 하는 일

`.github/workflows/deploy.yml` — main push 와 수동 실행(`workflow_dispatch`).

1. **자격증명 확인** — `CLOUDFLARE_API_TOKEN` 이 없으면 여기서 빨간불.
2. `npm ci`
3. **소스 검사** — `i18n`·`media`·`coverage`·`contrast`·`test:chat` (브라우저 없이 도는 것)
4. **빌드** — `app/dist/` 로 뽑는다
5. **산출물이 달라졌으면 되커밋** — 사람이 `npm run build` 를 잊어도 사이트가
   따라오게. 커밋 메시지의 `[skip ci]` 가 무한 루프를 막는다.
6. **클라우드플레어에 배포** — `wrangler-action`, wrangler 4 고정
7. **배포 결과 확인** — 아래

### 1번이 왜 빨간불이어야 하나

예전에는 토큰이 없으면 배포만 조용히 건너뛰고 워크플로는 **success** 로
끝났다. 그래서 실행 3회가 전부 초록불인데 `qfit.qfitquick.com` 은 계속
옛 판이었다. 실패가 성공으로 보이면 아무도 못 고친다. 그래서 세운다.

### 7번이 두 주소를 나눠 보는 이유

실패가 두 종류인데 증상이 똑같다.

| 워커 주소 | 커스텀 도메인 | 뜻 |
| --- | --- | --- |
| 옛 판 | 옛 판 | **배포 자체가 안 됐다.** 워크플로·`wrangler.jsonc` 문제 |
| 새 판 | 옛 판 | **도메인이 이 워커를 안 가리킨다.** 클라우드플레어 설정 문제 |
| 새 판 | 새 판 | 정상 |

한 곳만 보면 어느 쪽인지 알 수 없다. 그래서 둘 다 본다. 워커 주소는
하드코딩하지 않고 `wrangler-action` 의 `deployment-url` 출력을 쓴다 —
workers.dev 주소의 가운데(계정 서브도메인)는 대시보드에서 바뀔 수 있다.

## 손으로 배포하기

빌드 없이 된다. 저장소에 커밋된 `app/dist/` 가 곧 배포본이다.

    npx wrangler login      # 브라우저가 열린다
    npx wrangler deploy

`npm run deploy` 는 빌드부터 한다. 그건 `npm install` 을 먼저 해야 한다
(`CLAUDE.md` 참고).

윈도우에서 `npx wrangler deploy --dry-run` 을 직접 돌려도 이제 정상
동작한다 — 예전엔(저장소 루트가 대상이던 시절) 경로 구분자 문제로
자산이 15,163개까지 잡히는 별도 버그가 있었는데, `app/dist/` 로
분리되며 재현되지 않는다(2026-09-25 확인).

## Google Fit 연동 (2026-09-24)

만보기가 화면을 열어 둔 동안만 재는 문제를 안드로이드에서 없애려고
`src/health/googleFit.js` 를 추가했다 — 폰이 이미 백그라운드로 돌리는
Google Fit 걸음 기록을 읽어 온다(iOS 는 애플이 안 열어줘서 불가능,
그 파일 머리 설명 참고).

**지금 상태: `CLIENT_ID` 가 빈 문자열이라 기능이 꺼져 있다.** 코드는
다 됐고, Google Cloud Console 에서 OAuth 클라이언트를 만들어 그
파일에 채우기만 하면 된다 — 아래는 그 절차다.

1. [Google Cloud Console](https://console.cloud.google.com/) 에서 프로젝트를
   만들거나 고른다.
2. **API 및 서비스 → 라이브러리** 에서 **Fitness API** 를 검색해 사용
   설정한다.
3. **API 및 서비스 → OAuth 동의 화면** — User type `외부`, 앱 이름·이메일
   입력, 범위(scopes)에 `https://www.googleapis.com/auth/fitness.activity.read`
   추가. 심사(verification) 전에는 테스트 사용자만 쓸 수 있다 — 일반
   공개하려면 구글의 민감한 범위 심사를 받아야 한다(수일~수주 걸릴 수
   있다).
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 →
   OAuth 클라이언트 ID** — 애플리케이션 유형 **웹 애플리케이션**,
   **승인된 자바스크립트 원본**에 `https://qfit.qfitquick.com` 추가.
   (client secret 은 필요 없다 — 이 흐름은 프론트에서 액세스 토큰만
   받는 implicit flow 라 secret 을 안 쓴다.)
5. 발급된 **클라이언트 ID**를 `src/health/googleFit.js` 의 `CLIENT_ID`
   에 붙여넣고 배포한다.

클라이언트 ID는 시크릿이 아니다(웹 앱용 OAuth 클라이언트 ID는 원래
프론트 코드에 그대로 노출되는 값이다 — `cloud/supabase.js` 의
anon key 와 같은 성격) — 그래서 GitHub Secrets 가 아니라 소스에 직접
적는다.

## workers.dev 주소의 `monster-rpg` 는 무엇인가

워커에 들어간 것이 아니다. **계정 전체의 workers.dev 서브도메인 이름**이고,
주소 형식이 `<워커이름>.<계정 서브도메인>.workers.dev` 라 가운데에 나온다.
이 계정의 워커 둘(`qfit-quickfitness`, `voyager-atelier`)이 같이 쓴다.

바꾸려면 대시보드 → **Workers & Pages** → **Your subdomain** 옆 **Change**.
API 로는 안 된다(최초 설정만 허용, `10036`).

바꾸면 **계정 전체에 걸린다** — `voyager-atelier` 주소도 같이 바뀌고 기존
`*.monster-rpg.workers.dev` 주소는 전부 죽는다. 풀려난 이름은 남이 선점할 수
있다.

워크플로는 이 이름에 의존하지 않으므로 바꿔도 코드는 손댈 필요 없다.
다만 `README.md` 의 주소 표는 고쳐야 한다.

## 매일 알림 (2026-10-04)

설정 → 알림 → **매일 알림**(끔/아침 8시/낮 12시/저녁 7시/밤 9시, 한국 시간).
고른 시각에 그날 아직 운동 전이면(앱 완주·도전 체크·직접 체크 어느 것도
안 했으면) 웹푸시를 한 번 보낸다. 기본은 꺼짐이다 — 매일 오는 알림은 사람이
직접 골라야 한다(4일 리마인더는 지금처럼 기본 켜짐).

서버 쪽 준비(한 번만):

1. Supabase 대시보드 → SQL Editor 에서 `docs/sql/2026-10-04-daily-reminder.sql`
   실행 — devices 에 `daily_hour`·`daily_sent_date` 칸과 `set_daily_reminder`
   함수를 더한다.
2. 대시보드 → Edge Functions → `send-reminders` 에
   `supabase/functions/send-reminders/index.ts` 를 그대로 붙여넣어 배포.
3. `.github/workflows/push-reminders.yml` 의 cron 을 매시 정각(`0 * * * *`)으로.
   **반드시 2 다음에** — 옛 함수는 시각을 안 가려서, 매시간 부르면 4일
   리마인더가 새벽에도 나갈 수 있다. 새 함수는 4일 리마인더를 한국 시간
   낮 12시 실행에만 보낸다.

**지금 상태(2026-10-04): 1·2·3 모두 완료.** 확인 — `set_daily_reminder` 에 범위
밖 시각을 넣으면 'hour out of range'(함수 있음, 행은 안 만든다), send-reminders
를 직접 부르면 HTTP 200 에 `daily: ok`(devices 읽기 권한 정상 — 4일 리마인더도
같은 권한이라 낮 12시 실행부터 다시 나간다. 10-03 까지는 이 권한이 없어 매번 500).

1 전에는 앱이 고른 시각을 기기에 들고 있다가(설정에 '곧 켜져요' 안내)
하트비트 때마다 서버에 다시 적어 본다 — 1을 하면 저절로 맞춰진다.
