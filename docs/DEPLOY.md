# 배포

마지막 확인: **2026-09-08**

## 지금 상태 한 줄

배포 자동화는 고쳐 놓았지만 **아직 초록불이 아니다.** 막고 있는 것이 둘이고,
둘 다 클라우드플레어 대시보드에서 사람이 해야 한다. 아래 [남은 일](#남은-일).

## 어디가 무엇을 서빙하나

| 주소 | 실체 | 갱신 방법 |
| --- | --- | --- |
| `qfit.qfitquick.com` | **다른 클라우드플레어 계정**의 무언가 | 지금은 갱신 경로가 없다 |
| `qfit-quickfitness.monster-rpg.workers.dev` | 워커 `qfit-quickfitness` | `wrangler deploy` |
| `qfit.github.io/https-qfit.qfitquick.com-` | GitHub Pages | main 에 push |

세 곳이 **서로 다른 것을 서빙할 수 있다.** 실제로 그랬다. 여기가 이 문서의
핵심이다.

## 왜 push 만으로는 안 되나

클라우드플레어 워커는 저장소를 보지 않는다. **자기가 올려받은 자산 묶음**을
서빙한다(`wrangler.jsonc` 의 `assets.directory: "."`). GitHub 에 push 하는
것과 워커에 올리는 것은 완전히 다른 두 동작이다.

그래서 push 만 하면 Pages 는 새 판인데 워커는 옛 판인 상태가 된다.
저장소를 봐도, Pages 를 봐도 멀쩡해 보인다.

## 무엇이 실제로 올라가나

`.assetsignore` 가 정한다. `assets.directory` 가 `"."` 라 **저장소 루트
전체가 대상**이고, 거기서 빼지 않은 것은 전부 공개 URL 이 된다.

지금 올라가는 것은 99개다:

    index.html · sw.js · registerSW.js · workbox-*.js · manifest.webmanifest
    assets/ · icons/ · media/ · .nojekyll

확인하는 법:

    npx wrangler deploy --dry-run

### 예전에 여기서 죽었다

`.assetsignore` 가 `node_modules` 한 줄뿐이던 시절, 자산이 14,704개로 잡히고
배포가 **실패했다**. `.git/objects/pack` 의 팩 파일(53MB)이 워커의 파일당
25MiB 한도를 넘겼기 때문이다. 소스와 18MB 짜리 zip 도 같이 올라가고 있었다.

## 워크플로가 하는 일

`.github/workflows/deploy.yml` — main push 와 수동 실행(`workflow_dispatch`).

1. **자격증명 확인** — `CLOUDFLARE_API_TOKEN` 이 없으면 여기서 빨간불.
2. `npm ci`
3. **소스 검사** — `i18n`·`coverage`·`contrast` (브라우저 없이 도는 것)
4. **빌드**
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
| 옛 판 | 옛 판 | **배포 자체가 안 됐다.** 워크플로·`.assetsignore` 문제 |
| 새 판 | 옛 판 | **도메인이 이 워커를 안 가리킨다.** 클라우드플레어 설정 문제 |
| 새 판 | 새 판 | 정상 |

한 곳만 보면 어느 쪽인지 알 수 없다. 그래서 둘 다 본다. 워커 주소는
하드코딩하지 않고 `wrangler-action` 의 `deployment-url` 출력을 쓴다 —
workers.dev 주소의 가운데(계정 서브도메인)는 대시보드에서 바뀔 수 있다.

## 손으로 배포하기

빌드 없이 된다. 저장소에 커밋된 산출물이 곧 배포본이다.

    npx wrangler login      # 브라우저가 열린다
    npx wrangler deploy

`npm run deploy` 는 빌드부터 한다. 그건 `npm install` 을 먼저 해야 하고,
안 하면 산출물만 지우고 실패한다(`CLAUDE.md` 참고).

## 남은 일

### 1. 시크릿 두 개

저장소 **Settings → Secrets and variables → Actions → New repository secret**

| 이름 | 어디서 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 대시보드 → My Profile → API Tokens → **Edit Cloudflare Workers** 템플릿 |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages 개요 화면 오른쪽 |

이게 없으면 워크플로가 1번 단계에서 선다.

### 2. `qfit.qfitquick.com` 을 워커에 연결

2026-09-08 에 API 로 확인한 것:

- 워커 `qfit-quickfitness` 에 붙은 **커스텀 도메인 0개**
- 배포 계정(`kim3106611@gmail.com`, `d4210a15825eeb0961a1ff8cbf43765e`)에
  **존 0개** — `qfitquick.com` 이 이 계정에 없다
- `qfitquick.com` 의 네임서버는 `remy`/`desiree.ns.cloudflare.com` →
  클라우드플레어에 있긴 하나 **다른 계정**이다
- 확증: 현재 자산 `assets/index-DzOMgzMg.js` 가 워커 주소에서는 200,
  `qfit.qfitquick.com` 에서는 **404**

**커스텀 도메인은 워커와 같은 계정의 존에만 붙는다.** 그래서 지금 계정에서는
아무리 배포해도 그 주소가 안 바뀐다. 둘 중 하나를 해야 한다.

- `qfitquick.com` 존을 가진 계정에서 워커를 배포하고, Workers & Pages →
  qfit-quickfitness → Settings → Domains & Routes 에서 `qfit.qfitquick.com`
  추가. CI 시크릿도 그 계정 것으로 바꾼다.
- 또는 그 계정의 DNS 에서 `qfit` 을 `qfit.github.io` 로 CNAME.
  Pages 는 이미 최신을 서빙 중이므로 이쪽이 더 빠르다.

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
