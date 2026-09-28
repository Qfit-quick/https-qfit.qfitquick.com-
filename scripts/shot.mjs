// 화면을 찍는다. 라이트·다크 두 벌.
//
// ⚠ 클래스만 토글해서 찍지 말 것.
// 화면 열여섯 개가 전부 DOM 에 있으므로 .active 를 옮기면 그림은 나온다.
// 그런데 그 화면을 채우는 render 함수는 안 돈다 — 기록 화면을 그렇게 찍었더니
// 뱃지 막대가 꽉 차 있고 아바타가 비어 있어서, 멀쩡한 것을 고칠 뻔했다.
// (실제 값은 막대 0%, 아바타 "1" 이었다.)
// 그래서 앱이 실제로 쓰는 길로 눌러서 들어간다.
import fs from 'node:fs';
import { launch, IPHONE_12, DEFAULT_URL, seedCheckin, dismissGate } from './_browser.mjs';

const URL = process.env.SHOT_URL || DEFAULT_URL;
const OUT = 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

// 화면마다 "홈에서 여기까지 어떻게 가는가". 못 가는 곳은 null.
const PATHS = {
  'start-screen': [],
  'settings-screen': ['#open-settings-btn'],
  'legal-screen': ['#open-settings-btn', '#settings-legal-btn'],
  'account-screen': ['#open-account-btn'],
  // 회복·영상 도감·기록·루틴·계획·신체정보는 전부 더보기 메뉴 안이다
  // (설정·계정과 달리 홈 헤더에 없다). 더보기로 들어가는 문은
  // '#open-more-btn' 이 아니라 탭바의 "더보기" 다 — '#open-more-btn' 은
  // 예전 문구("내 기록 · 루틴 더보기")가 남긴 hidden 버튼이라, 탭이
  // via 로 그걸 JS 로만 눌러 재사용할 뿐 실제로는 화면에 없다. 여기서
  // 그 자리를 실제 마우스 클릭으로 누르려 하면 Playwright 가 "안 보이는
  // 요소"라 매번 조용히 실패하고, 안 가진 화면과 똑같이 가짜 렌더로
  // 찍혀서 몇 년째 아무도 몰랐다(2026-09-27 재검토에서 발견) — 반드시
  // 탭바 쪽으로 들어간다.
  'recovery-screen': ['.tab[data-screen="more-screen"]', '#open-recovery-btn'],
  'video-gallery-screen': ['.tab[data-screen="more-screen"]', '#open-video-gallery-btn'],
  'more-screen': ['.tab[data-screen="more-screen"]'],
  'records-screen': ['.tab[data-screen="more-screen"]', '#open-records-btn'],
  'routines-screen': ['.tab[data-screen="more-screen"]', '#open-routines-btn'],
  'setup-screen': ['#one-min-start-btn', '#mode-pick-btn', '#mode-random'],
  'manual-select-screen': ['#one-min-start-btn', '#mode-pick-btn', '#mode-manual'],
  'ai-quiz-screen': ['#one-min-start-btn', '#mode-ai-btn'],
  // 저장은 나이·키·몸무게가 다 있어야 넘어간다(src/ui/plan.js 의
  // saveBodyForm) — 안 채우고 누르면 토스트만 뜨고 제자리라 이것도
  // 가짜 렌더로 찍혀 왔다(2026-09-27 재검토에서 발견). scripts/plan.mjs 가
  // 쓰는 값과 맞춘다.
  'plan-screen': [
    '.tab[data-screen="more-screen"]', '#open-body-btn',
    { fill: '#body-age', value: '30' },
    { fill: '#body-height', value: '175' },
    { fill: '#body-weight', value: '78' },
    '#body-activity button:nth-child(2)', '#body-goal button:nth-child(1)',
    '#body-save-btn',
  ],
  'body-screen': ['.tab[data-screen="more-screen"]', '#open-body-btn'],
  // today-card-open 은 2026-09-27에 없어졌다(홈 카드가 Q-Mission으로
  // 바뀜) — 탭바의 "체크" 로 연다.
  'log-screen': ['.tab[data-screen="log-screen"]'],
  'q-mission-screen': ['#qmission-card-open'],
  // 어르신·재활 모드(2026-09-27) — recovery-screen 의 대상별 가이드
  // 첫 항목(SPECIAL_GUIDES[0], "노인을 위한 운동") 안에 있다. 그 카드는
  // 아코디언이라 펼치기 전엔 시작 버튼이 display:none 이다 — 펼치는
  // 클릭을 빼먹으면 다음 클릭이 조용히 실패하고 스크린샷은 대체(가짜)
  // 렌더로 찍힌다(2026-09-27 발견).
  'senior-run-screen': ['.tab[data-screen="more-screen"]', '#open-recovery-btn', '#special-list .injury-accordion:first-child .injury-summary', '#senior-mode-start-btn'],
  // 운동·결과는 한 판을 돌려야 나온다. scripts/flow.mjs 가 그 길을 간다.
  'game-screen': null,
  'result-screen': null,
  // 시작 관문. .screen 이 아니라 덮개라서 아래의 '못 가면 토글' 길로는 못
  // 찍는다 — 대신 설문을 미리 지나 두지 않고 열면 그것이 곧 첫 화면이다.
  gate: [],
};

const screens = process.env.SHOT_ONLY
  ? process.env.SHOT_ONLY.split(',')
  : Object.keys(PATHS);
const themes = process.env.SHOT_THEME ? [process.env.SHOT_THEME] : ['light', 'dark'];

const browser = await launch();
let faked = 0;

for (const theme of themes) {
  for (const id of screens) {
    const page = await browser.newPage({ ...IPHONE_12, colorScheme: theme });
    // 관문(하루 첫 설문)은 앱을 덮는다. 미리 지나 두지 않으면 열여섯 장이
    // 전부 같은 질문 화면으로 찍힌다. 관문 자체는 아래에서 따로 한 장 찍는다.
    if (id !== 'gate') await page.addInitScript(seedCheckin);
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    if (id !== 'gate') await dismissGate(page);

    const path = PATHS[id];
    let note = '';

    if (path) {
      for (const step of path) {
        if (typeof step === 'string') await page.click(step).catch(() => {});
        else await page.fill(step.fill, step.value).catch(() => {});
        await page.waitForTimeout(320);
      }
    }

    // 관문은 화면(.screen)이 아니라 덮개다. 뜬 것만 확인하고 바로 찍는다.
    const reached = id === 'gate'
      ? await page.evaluate(() => !!document.getElementById('gate'))
      : await page.evaluate(
        (sid) => document.querySelector('.screen.active')?.id === sid,
        id
      );

    if (!reached) {
      // 길이 없는 화면은 어쩔 수 없이 토글한다. 다만 그 사실을 파일 이름에 남긴다 —
      // 안 남기면 렌더 안 된 그림을 진짜 화면으로 착각한다.
      await page.evaluate((sid) => {
        const el = document.getElementById(sid);
        if (!el) return;
        document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
        el.classList.add('active');
      }, id);
      await page.waitForTimeout(250);
      note = '-미렌더';
      faked++;
    }

    const file = `${OUT}/${theme}-${id}${note}.png`;
    await page.screenshot({ path: file });
    console.log(`  ${file}`);
    await page.close();
  }
}

await browser.close();
console.log(`\n${themes.length}개 테마 × ${screens.length}개 화면`);
if (faked) {
  console.log(`⚠ ${faked}장은 눌러서 못 가고 클래스만 토글했다(-미렌더).`);
  console.log('  그 그림의 숫자·목록은 실제 화면과 다를 수 있다.');
}
