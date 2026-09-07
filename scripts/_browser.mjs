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
