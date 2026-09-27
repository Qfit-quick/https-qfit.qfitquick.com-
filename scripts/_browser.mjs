// 검사 스크립트들이 공유하는 브라우저 설정.
//
// dev 서버가 자체 서명 인증서로 HTTPS 를 쓰므로 크로미움을 두 겹으로 열어 줘야 한다:
//   - ignoreHTTPSErrors  : 페이지 이동
//   - --ignore-certificate-errors : 서비스 워커 스크립트 요청
// 앞의 것만 주면 페이지는 뜨는데 SW 등록만 조용히 실패한다. 그러면
// "오프라인이 안 되는데 화면은 멀쩡한" 상태를 검사로는 못 잡는다.
import { chromium } from 'playwright';

export const DEFAULT_URL = process.env.QFIT_URL || 'http://localhost:5173/';

export const launch = () =>
  chromium.launch({ args: ['--ignore-certificate-errors'] });

// 기준 기기: 아이폰 12 (390×664, 사파리 크롬 제외)
export const IPHONE_12 = {
  viewport: { width: 390, height: 664 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  ignoreHTTPSErrors: true,
};

// 하루 첫 설문(시작 관문)을 미리 지나 둔다.
//
// 관문은 앱을 덮고 있어서, 이게 없으면 **검사 열 개가 전부** "화면이 없다"
// 로 실패한다. 실제로 그렇게 됐다 — 기능이 아니라 검사가 먼저 깨진다.
//
// 답을 지어 넣는 것이라 관문 자체는 이 길로 검사할 수 없다. 관문을 보려면
// skipGate: false 로 열면 된다(scripts/shot.mjs 가 그렇게 한 장 찍는다).
//
// **이것만으로는 관문이 안 없어진다.** 명언 카드는 mood·drive 를 미리
// 채워도 매번 새로 뽑혀 뜬다("하루에 한 번"이 아니라 "열 때마다") — 그
// 카드를 실제로 눌러야 관문이 걷힌다. 안 그러면 `#one-min-start-btn` 같은
// 첫 버튼조차 관문에 가려 클릭이 조용히 실패하고, 검사는 "화면을 못
// 찾았다"가 아니라 그냥 아무 일도 안 일어난 것처럼 보인다 — 아래
// dismissGate 를 goto 직후에 반드시 같이 부른다.
export const seedCheckin = () => {
  try {
    const d = new Date();
    const key =
      d.getFullYear() +
      '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
    const log = JSON.parse(localStorage.getItem('qfit_daylog_v1') || '{}');
    log[key] = Object.assign({}, log[key], { mood: 'good', drive: 'ok' });
    localStorage.setItem('qfit_daylog_v1', JSON.stringify(log));
  } catch (e) {
    // 저장소가 막혀 있으면 관문이 뜬다. 검사가 그 이유로 실패하는 것은 맞다.
  }
};

export const context = async (browser, over = {}) => {
  const { skipGate = true, ...rest } = over;
  const ctx = await browser.newContext({ ...IPHONE_12, ...rest });
  if (skipGate) await ctx.addInitScript(seedCheckin);
  return ctx;
};

// seedCheckin 이 채운 mood·drive 뒤에 뜨는 명언 카드를 눌러 관문을 마저
// 걷는다. goto 로 페이지를 새로 열 때마다(스크립트 안에서 여러 번 열 수도
// 있다) 호출한다. 카드가 없으면(이미 걷혔거나, 관문 자체를 검사하는
// 스크립트라 seedCheckin 을 안 썼거나) 조용히 넘어간다.
export const dismissGate = async (page) => {
  try {
    await page.click('#gate-quote-card', { timeout: 1500 });
  } catch (e) {
    // 없으면 그걸로 된 것 — 이 함수가 실패해야 할 이유가 아니다.
  }
};
