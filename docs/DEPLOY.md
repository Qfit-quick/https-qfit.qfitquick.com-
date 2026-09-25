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

정기결제(프리미엄 월 구독, 월 2,400원)가 `worker/api/billing.js` +
`src/ui/billing.js` + Supabase 세 테이블로 붙어 있다. API 동작·DB 스키마
자세한 내용은 `docs/sql/2026-09-toss-billing.sql` 과 그 옆 명세서를 본다.

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
등록된다.

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
