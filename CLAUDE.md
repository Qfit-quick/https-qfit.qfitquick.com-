# CLAUDE.md

이 저장소에서 작업할 때 먼저 읽는다. **다른 저장소의 상식이 여기서는 틀리는
지점들**만 적는다. 코드를 읽으면 알 수 있는 것은 적지 않는다.

## 이 저장소의 제일 이상한 점

**빌드 산출물이 저장소 루트에 커밋되어 있다.** `index.html`, `sw.js`,
`registerSW.js`, `manifest.webmanifest`, `workbox-*.js`, `assets/` 는 전부
빌드가 만든 것이고 git 이 추적한다.

이유는 서빙 방식이다. GitHub Pages 는 'main 브랜치의 루트를 그대로' 로 잡혀
있고(저장소 관리자만 바꿀 수 있다), 클라우드플레어 워커도
`wrangler.jsonc` 의 `assets.directory: "."` 로 **저장소 루트 전체**를
서빙한다. 즉 루트에 놓인 파일이 곧 사이트다.

여기서 따라오는 규칙들:

- **소스 `index.html` 은 `app/` 에 있다.** 루트에 두면 빌드가 자기 입력을
  덮어쓴다. `vite.config.js` 의 `root: 'app'`.
- **`build.emptyOutDir` 을 켜면 안 된다.** `outDir` 이 저장소 루트라
  켜는 순간 `src/`·`scripts/`·`legacy/` 가 통째로 날아간다. 지난 산출물은
  `scripts/clean.mjs` 가 **이름을 아는 것만** 골라 지운다.
- **`base: './'` 를 유지한다.** Pages 가 저장소 이름이 붙은 하위 경로로
  서빙해서, 절대 경로(`/assets/...`)로 뽑으면 배포본이 전부 404 다.
  화면 이동이 해시(`#records-screen`)라 지금은 안전하다. 경로 라우팅으로
  바꾸는 날 이게 제일 먼저 깨진다.
- **소스만 커밋하고 push 하면 사이트는 안 바뀐다.** 저장소를 보면 다 되어
  있어 보이므로 알아채기가 제일 어렵다. `.github/workflows/deploy.yml` 이
  push 마다 다시 빌드해서 산출물이 다르면 되커밋한다.

## `npm run build` 를 그냥 돌리지 않는다

`build` 는 `node scripts/clean.mjs && vite build` 다. **clean 이 먼저 돈다.**

`node_modules` 가 없는 상태로 돌리면 clean 은 성공해서 루트 산출물을 지우고,
`vite build` 는 실패한다. 결과는 **사이트가 통째로 사라진 작업 트리**다.
2026-09-08 에 실제로 이 일이 있었다.

    npm install     # 먼저. 이게 없으면 build 는 지우기만 하고 끝난다
    npm run build

지워졌으면 당황할 것 없다. 전부 커밋되어 있으므로 되돌리면 된다:

    git checkout -- index.html sw.js registerSW.js manifest.webmanifest assets 'workbox-*.js'

**배포만 하려면 빌드가 필요 없다.** 저장소에 있는 산출물이 곧 배포본이다:

    npx wrangler deploy

## 루트에 파일을 새로 만들면 `.assetsignore` 를 본다

`assets.directory` 가 `"."` 이므로 **`.assetsignore` 에서 빼지 않은 것은
전부 공개 URL 이 된다.** 루트에 새 파일·폴더를 만들면 그것이 사이트에
올라가도 되는 것인지 먼저 판단한다.

예전에 이 목록이 `node_modules` 한 줄뿐이었을 때, `wrangler deploy` 는
자산을 14,704개로 잡고 **실패했다** — `.git/objects/pack` 의 팩 파일이
워커의 파일당 25MiB 한도를 넘겼기 때문이다.

올릴 것을 바꿨으면 배포 전에 확인한다:

    npx wrangler deploy --dry-run

## 산출물의 줄바꿈은 LF 여야 한다

`sw.js` 는 `index.html`·`manifest.webmanifest` 의 md5 를 적어 둔다. 윈도우에서
`core.autocrlf=true` 로 clone 해 CRLF 로 풀리면 그 md5 가 실제 파일과
어긋나고, **사용자에게 영원히 옛 판이 나간다.** `.gitattributes` 가 산출물을
`-text` 로 못 박아 두었다. 산출물을 새로 늘리면 거기에도 추가한다.

## 커밋 메시지

한국어로, **무엇을 왜 고쳤는지**를 쓴다. 기존 로그의 톤을 따른다:

    루트 전체가 올라가 배포가 죽던 것을 고쳐 필요한 99개만 올린다
    배포가 push 만으로는 안 되던 것을 문서화하고 워커 배포를 워크플로에 붙임

**Claude·AI 공동저자 트레일러(`Co-Authored-By: Claude`, `Claude-Session:`)를
넣지 않는다.** 사용자가 명시적으로 요구한 사항이다.

## 문서를 최신으로 둔다

동작을 바꿨으면 같은 커밋에서 문서도 고친다. 사실이 아닌 문서는 없느니만
못하다.

| 파일 | 담는 것 |
| --- | --- |
| `README.md` | 이 프로젝트가 무엇이고 어떻게 띄우는지 |
| `CLAUDE.md` | 이 파일. 남들과 다른 규칙, 밟으면 아픈 지뢰 |
| `docs/DEPLOY.md` | 배포 구조, 실패 유형, 시크릿, 도메인 현황 |

특히 `docs/DEPLOY.md` 는 계정·도메인·시크릿의 **지금 상태**를 적어 둔 문서다.
그쪽이 바뀌면 반드시 같이 고친다.

## 검사 스크립트

브라우저 없이 도는 것들. 워크플로가 빌드 전에 이 셋을 돌린다.

    npm run i18n       # 번역 누락
    npm run coverage   # 스타일 없는 클래스
    npm run contrast   # 명도 대비

`smoke`·`flow`·`shot` 등은 playwright 로 실제 브라우저를 띄운다. CI 에서는
안 돌린다.
