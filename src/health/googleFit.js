// Google Fit 연동(2026-09-24) — 만보기가 "화면을 열어 둔 동안"만 재는
// 문제(ui/log.js 의 stepMeasureSession 주석 참고)를 안드로이드에서만
// 실제로 없앤다. 이 앱이 걸음을 직접 세지 않는다 — 폰이 이미 백그라운드로
// 돌리고 있는 구글의 걸음 센서(Google Fit) 기록을 읽어 올 뿐이다.
//
// iOS 는 이 방법 자체가 없다 — 애플이 HealthKit 을 웹에 전혀 열어주지
// 않는다(네이티브 앱 전용 API). 그래서 isGoogleFitAvailable() 이
// 안드로이드만 통과시킨다 — iOS 는 지금처럼 수동 입력 그대로 둔다
// (2026-09-24 결정, "안드로이드는 Google Fit, iOS는 수동 유지").
//
// 로그인(cloud/supabase.js)과는 완전히 별개의 OAuth 다 — 이 기능 하나만
// 위한 읽기 전용 권한(fitness.activity.read)만 요청한다. 액세스 토큰은
// 메모리에만 둔다(localStorage 에 안 남긴다) — 화면을 새로 열 때마다
// requestAccessToken({prompt:''})로 조용히 다시 받는다. 전에 동의했으면
// 보통 팝업 없이 바로 된다 — 구글이 이 브라우저의 동의 상태를 기억한다.
//
// ⚠ CLIENT_ID 를 채워야 동작한다. 비워 두면(기본값) isGoogleFitAvailable()
// 이 항상 false 라 연동 버튼 자체가 안 보인다 — 설정 전에도 안전하게
// 배포할 수 있다. Google Cloud Console 에서 만드는 법은 docs/DEPLOY.md 의
// "Google Fit 연동" 항목 참고.
const CLIENT_ID = ''; // TODO: Google Cloud Console 웹 애플리케이션 OAuth 클라이언트 ID

const SCOPE = 'https://www.googleapis.com/auth/fitness.activity.read';
const CONNECTED_KEY = 'qfit_googlefit_connected_v1';
const STEP_SOURCE = 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps';

let tokenClient = null;
let gisLoadPromise = null;

export function isGoogleFitAvailable() {
  return !!CLIENT_ID && /android/i.test(navigator.userAgent || '');
}

export function isGoogleFitConnected() {
  if (!isGoogleFitAvailable()) return false;
  try { return localStorage.getItem(CONNECTED_KEY) === '1'; }
  catch (e) { return false; }
}

function loadGis() {
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('google identity services 를 못 불러왔다'));
    document.head.appendChild(s);
  });
  return gisLoadPromise;
}

// tokenClient 는 한 번만 만들고 계속 재사용한다 — 매번 새로 만들면 구글이
// 매번 새 앱처럼 취급해 조용한 재발급(prompt:'')이 잘 안 먹는다.
function requestToken(opts) {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: () => {}, // 아래서 호출마다 덮어쓴다
      });
    }
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      resolve(resp.access_token);
    };
    tokenClient.requestAccessToken(opts);
  });
}

/** 처음 연동한다 — 동의 화면이 뜬다. 성공해야만 연동 상태를 저장한다. */
export async function connectGoogleFit() {
  await loadGis();
  const token = await requestToken({ prompt: 'consent' });
  try { localStorage.setItem(CONNECTED_KEY, '1'); } catch (e) { /* 무시 */ }
  return token;
}

export function disconnectGoogleFit() {
  try { localStorage.removeItem(CONNECTED_KEY); } catch (e) { /* 무시 */ }
}

async function silentToken() {
  await loadGis();
  return requestToken({ prompt: '' });
}

/**
 * 오늘 걸음 수를 Google Fit 에서 가져온다. 연동 안 돼 있으면 null.
 * 조용한 재발급이 실패하면(동의가 풀렸거나 세션이 끊겼으면) 연동 상태를
 * 스스로 지운다 — 화면에는 다시 '연동하기' 버튼이 뜬다. 네트워크 오류
 * 등 일시적인 실패는 연동을 끊지 않고 그냥 null 만 돌려준다(다음에 다시
 * 시도하면 된다).
 */
export async function fetchTodaySteps() {
  if (!isGoogleFitConnected()) return null;

  let token;
  try {
    token = await silentToken();
  } catch (e) {
    disconnectGoogleFit();
    return null;
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;

  try {
    const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta', dataSourceId: STEP_SOURCE }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: start,
        endTimeMillis: end,
      }),
    });
    if (res.status === 401 || res.status === 403) { disconnectGoogleFit(); return null; }
    if (!res.ok) return null;
    const data = await res.json();
    let steps = 0;
    (data.bucket || []).forEach((b) => {
      (b.dataset || []).forEach((ds) => {
        (ds.point || []).forEach((p) => {
          (p.value || []).forEach((v) => { steps += v.intVal || 0; });
        });
      });
    });
    return steps;
  } catch (e) {
    console.error('Google Fit steps fetch failed:', e);
    return null;
  }
}
