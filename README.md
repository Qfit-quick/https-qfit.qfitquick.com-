# Q-fit

게임을 켰더니 운동이 끝나있다.

체중·목표를 입력하면 그에 맞는 운동·식단 계획을 짜고, 하루치 기록을 남기는
웹 앱이다. 설치 없이 브라우저에서 돌아가고(PWA), 한 번 본 운동 사진·영상은
캐시에 남아 오프라인에서도 나온다.

## 주소

| 어디 | 무엇 |
| --- | --- |
| https://qfit.qfitquick.com | 사람이 보는 주소. **지금은 옛 판을 서빙 중이다** — `docs/DEPLOY.md` 참고 |
| https://qfit-quickfitness.monster-rpg.workers.dev | 클라우드플레어 워커. 배포하면 여기가 먼저 바뀐다 |
| https://dupz-web.github.io/https-qfit.qfitquick.com- | GitHub Pages. push 마다 자동 갱신 |

## 띄우기

    npm install
    npm run dev        # http://localhost:5173

`npm install` 을 건너뛰면 안 된다. `npm run build` 는 지난 산출물을 먼저
지우므로, 의존성이 없으면 **지우기만 하고 실패한다.** `CLAUDE.md` 참고.

## 만들기

    npm run build      # 산출물이 저장소 루트에 놓인다
    npm run preview    # 빌드된 것을 5180 포트로 확인

이 저장소는 **빌드 산출물을 커밋한다.** 루트의 `index.html`·`sw.js`·
`assets/` 등이 그것이고, 그 파일들이 곧 사이트다. 이유와 주의점은
`CLAUDE.md` 에 적혀 있다.

## 구조

    app/         소스 index.html — 루트에 두면 빌드가 덮어쓴다
    src/         앱 코드
      data/      운동·식단·번역 등 데이터. 화면이 아니라 여기를 고친다
      ui/        화면 조각
      styles/    CSS
      health/    체중·기록 저장소
      cloud/     supabase (선택 기능, 지연 로딩)
    public/      그대로 복사되는 것 — 아이콘·미디어·manifest
    scripts/     검사·생성 스크립트
    legacy/      예전 판. 참고용
    docs/        문서

## 검사

    npm run i18n       # 번역 누락
    npm run coverage   # 스타일 없는 클래스
    npm run contrast   # 명도 대비
    npm run phases     # 동작 국면 시각이 클립과 맞는지
    npm run smoke      # playwright 로 실제 브라우저

앞의 셋은 브라우저 없이 돌고 CI 에서도 돈다. `phases` 도 브라우저 없이 돌지만
`ffmpeg-static` 이 있어야 클립 길이까지 본다(없으면 나머지만 검사한다).

## 배포

`main` 에 push 하면 `.github/workflows/deploy.yml` 이 다시 빌드하고,
산출물이 달라졌으면 되커밋한 뒤 클라우드플레어에 올린다.

**시크릿 두 개가 있어야 실제로 올라간다.** 없으면 워크플로가 빨간불로 선다.
설정 방법과 현재 막혀 있는 지점은 `docs/DEPLOY.md` 에 있다.
