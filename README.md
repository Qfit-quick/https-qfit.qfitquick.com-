# Q-fit

게임을 켰더니 운동이 끝나있다.

체중·목표를 입력하면 그에 맞는 운동·식단 계획을 짜고, 하루치 기록을 남기는
웹 앱이다. 설치 없이 브라우저에서 돌아가고(PWA), 한 번 본 운동 사진·영상은
캐시에 남아 오프라인에서도 나온다.

## 주소

| 어디 | 무엇 |
| --- | --- |
| https://qfit.qfitquick.com | 사람이 보는 주소 |
| https://qfit-quickfitness.monster-rpg.workers.dev | 클라우드플레어 워커. 배포하면 여기가 먼저 바뀐다 |
| https://qfit.github.io/https-qfit.qfitquick.com- | GitHub Pages. push 마다 자동 갱신 |

## 띄우기

    npm install
    npm run dev        # http://localhost:5173

`npm install` 을 건너뛰지 않는다 — 빌드가 의존성을 그대로 가정한다.

## 만들기

    npm run build      # 산출물이 app/dist/ 에 놓인다
    npm run preview    # 빌드된 것을 5180 포트로 확인

이 저장소는 **빌드 산출물을 커밋한다.** `app/dist/index.html`·`sw.js`·
`assets/` 등이 그것이고, 그 폴더가 곧 사이트다(2026-09-25 이전엔 저장소
루트였다). 이유와 주의점은 `CLAUDE.md` 에 적혀 있다.

## 구조

    app/         소스 index.html, 빌드 산출물(app/dist/, 커밋됨)
    src/         앱 코드
      data/      운동·식단·번역 등 데이터. 화면이 아니라 여기를 고친다
      ui/        화면 조각
      styles/    CSS
      health/    체중·기록 저장소
      cloud/     supabase (선택 기능, 지연 로딩)
    worker/      클라우드플레어 워커 — 영상 Range 서빙 + 결제 API(아래 참고)
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

## 챗봇 서버 (2026-09-21 시작, 2026-09-22 화면 연결 — 서버 자체는 로컬 전용, 아직 배포 안 함)

앱 안의 챗봇(더보기 → 챗봇)은 기본이 `src/ui/chatbot.js` 의 규칙 기반
검색이고, 이 답은 서버 없이도 **항상 즉시** 뜬다. 그 옆에 같은 질문을
로컬 서버(`server/chat.mjs`, `npm run dev:chat`)로도 한 번 더 보내서, LLM 이
정리한 답(`mode: "rag"`)이 오면 보조 말풍선으로 하나 더 붙인다
(`src/ui/chatbot.js` 의 `tryServerAnswer`). 서버가 없으면(대부분의 경우 —
배포본 포함) 이 요청은 그냥 조용히 실패하고 로컬 답만 남는다 — 화면이
느려지거나 에러가 보이는 일은 없다.

**왜 통째로 갈아 끼우지 않았나**: `src/chat/knowledge.js`(서버 쪽 자료)는
`src/ui/chatbot.js`(화면 쪽 자료)보다 좁다 — 업적·코치는 서버 쪽에 아직
없다. 그래서 서버가 규칙 기반으로만 답했으면(`mode: "rule"`/`"fallback"`)
화면이 이미 보여준 답보다 나을 게 없어 조용히 버린다. 실제로 LLM 이
정리한 답(`mode: "rag"`)일 때만 보여준다.

    npm run dev:chat    # http://127.0.0.1:8787/api/chat
    npm run test:chat   # 키 없이 다 돈다 — 분류·검색·제외·비교·서버 검증

**키가 없어도 된다.** `.env.example` 을 `.env` 로 복사하고 값을 안 채우면
`CHAT_LLM_ENABLED=false` 라 항상 규칙 기반(mode: `rule`/`fallback`)으로만
답한다. 실제 모델을 쓰려면:

    cp .env.example .env
    # .env 에서 CHAT_LLM_ENABLED=true, OPENAI_API_KEY=…, OPENAI_MODEL=… 채움

`npm run dev` 로 뜨는 Vite 개발 서버가 `/api` 요청을 이 서버로 넘긴다
(`vite.config.js` 의 `server.proxy`). **배포본(Cloudflare Worker)엔 이 서버가
없다** — `server/`·`tests/`·`.env.example` 은 애초에 `app/dist/` 밖에 있어서
빌드에도 배포에도 안 들어간다.

구조:

    src/chat/    순수 로직(intent·knowledge·retrieve·respond) — DOM 없음
    server/      Node http 서버(chat.mjs) + 모델 호출(llm.mjs)
    tests/chat/  node --test. 모델 호출은 흉내낸 함수로 성공·실패·시간초과를 검증

**대화 맥락**: 서버는 요청마다 상태가 없다(같은 서버가 여러 사용자를 동시에
받으므로 세션을 기억하면 안 됨). 그래서 화면이 직접 이어 준다 — 매 응답의
`sources[0].id` 를 다음 요청의 `conversationContext` 맨 앞에 넣어 다시
보내면, "더 쉽게는?" 같은 대명사형 후속 질문을 그 자료로 이어서 답한다
(`src/chat/respond.js` 의 `contextReply`). `src/ui/chatbot.js` 는 서버가 실제로
답한 턴(`mode: "rag"`)만 이 맥락에 쌓는다 — 로컬 전용으로 끝난 턴은 서버가
모르는 대화라 같이 보내지 않는다.

**언어**: 요청에 `locale: "ko"|"en"|"zh"` 를 실어 보내면 그 언어로 답한다
(기본 `ko`). `src/chat/knowledge.js` 의 자료가 전부 `{ko,en,zh}` 사전이라
검색도 세 언어를 다 본다("Squat" 이라고 쳐도 스쿼트를 찾는다) — 단
challengeTracks(턱걸이·플란체 같은 챌린지 트랙 9개)는 원본 데이터 자체가
전문 용어 오역을 피하려고 한국어 전용이라, en/zh 로 물어도 한국어로 답한다.

**통증 문구**: PDF 는 전문 의료 검수 전까지 "검수 전 초안" 표시를 달아
두라고 했다. 저장소 소유자가 2026-09-21 문구를 직접 검토하고 표시 없이
공개하기로 했다 — 전문 의료 검수는 아니라는 점은 `respond.js` 의
`COPY.painDraft` 주석에 남겨 뒀다.

**실제 LLM 검증**: 2026-09-21, 저장소 소유자의 OpenAI 키로 `CHAT_LLM_ENABLED=true`
상태로 실제 호출까지 확인했다(`mode: "rag"`). 그 과정에서 코드만 보고는
못 잡았을 문제 둘이 실제로 나왔다 — Node 가 `.env` 를 저절로 안 읽어서
서버가 계속 규칙 기반으로만 돌던 것(`process.loadEnvFile()` 추가로 해결),
그리고 통증 질문 감지가 "아픈"(관형형)을 놓쳐서 안전 경로를 안 타고
모델이 이 앱에 없는 기구 운동("레그 프레스")을 추천한 것(감지 정규식
보강 + 시스템 프롬프트에 "맨몸운동 전용, 자료에 나온 운동만 언급" 명시로
해결). 값을 넣은 실제 `.env` 는 이 컴퓨터에만 있고 커밋되지 않는다.

**한계** — 자세한 명세(개선 제안 PDF) 대비 아직 안 한 것: 로그인 사용자의
실제 신체·기록 조회(개인 기록 요청은 전부 "아직 연결 안 됨" 안내로만
처리), 의미 기반(임베딩) 검색. 화면 연결은 됐지만 **보조 답 하나만** —
로컬 규칙 기반 답을 LLM 답으로 통째로 갈아 끼우지는 않는다(아래 참고).

## 결제 (2026-09-25)

정기결제(프리미엄 월 구독)는 Toss Payments 로 붙어 있다 — 카드 등록은
설정 화면의 "카드 등록"에서, 실제 청구·갱신은 `worker/api/billing.js`
(서버 전용, Toss 시크릿 키가 여기에만 있다)가 한다. 매시 정각 크론이
기간이 끝난 구독을 갱신한다. 데이터베이스 스키마는
`docs/sql/2026-09-toss-billing.sql`, API 명세는 그 옆의 문서를 본다.

**`TOSS_SECRET_KEY`·`TOSS_CLIENT_KEY` 워커 시크릿을 넣어야 동작한다** —
발급·설정 방법은 `docs/DEPLOY.md` 의 "Toss Payments 연동" 항목 참고.

## 배포

`main` 에 push 하면 `.github/workflows/deploy.yml` 이 다시 빌드하고,
산출물이 달라졌으면 되커밋한 뒤 클라우드플레어에 올린다.

**시크릿 두 개가 있어야 실제로 올라간다.** 없으면 워크플로가 빨간불로 선다.
설정 방법과 현재 막혀 있는 지점은 `docs/DEPLOY.md` 에 있다.
