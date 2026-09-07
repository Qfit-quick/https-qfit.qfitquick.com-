// 화면을 찍는다. 라이트·다크 두 벌.
//
// ⚠ 클래스만 토글해서 찍지 말 것.
// 화면 열여섯 개가 전부 DOM 에 있으므로 .active 를 옮기면 그림은 나온다.
// 그런데 그 화면을 채우는 render 함수는 안 돈다 — 기록 화면을 그렇게 찍었더니
// 뱃지 막대가 꽉 차 있고 아바타가 비어 있어서, 멀쩡한 것을 고칠 뻔했다.
// (실제 값은 막대 0%, 아바타 "1" 이었다.)
// 그래서 앱이 실제로 쓰는 길로 눌러서 들어간다.
import fs from 'node:fs';
import { launch, IPHONE_12, DEFAULT_URL, seedCheckin } from './_browser.mjs';

const URL = process.env.SHOT_URL || DEFAULT_URL;
const OUT = 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

// 화면마다 "홈에서 여기까지 어떻게 가는가". 못 가는 곳은 null.
const PATHS = {
  'start-screen': [],
  'settings-screen': ['#open-settings-btn'],
  'account-screen': ['#open-account-btn'],
  'recovery-screen': ['#open-recovery-btn'],
  'video-gallery-screen': ['#open-video-gallery-btn'],
  'more-screen': ['#open-more-btn'],
  'records-screen': ['#open-more-btn', '#open-records-btn'],
  'routines-screen': ['#open-more-btn', '#open-routines-btn'],
  'setup-screen': ['#one-min-start-btn', '#mode-random'],
  'manual-select-screen': ['#one-min-start-btn', '#mode-manual'],
  'ai-quiz-screen': ['#one-min-start-btn', '#mode-ai-btn'],
  'plan-screen': ['#open-more-btn', '#open-body-btn', '#body-save-btn'],
  'body-screen': ['#open-more-btn', '#open-body-btn'],
  'log-screen': ['#today-card-open'],
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

    const path = PATHS[id];
    let note = '';

    if (path) {
      for (const sel of path) {
        await page.click(sel).catch(() => {});
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
