// Supabase 클라이언트를 '필요할 때만' 만든다.
//
// 예전에는 <head> 에서 CDN UMD 를 동기로 받았다. 두 가지가 나빴다:
//  1. 동기 로드라 그게 끝날 때까지 화면이 안 그려진다. 오프라인이면 타임아웃까지 기다린다.
//  2. 로그인은 선택 기능인데(앱은 기기 저장만으로 완전히 돈다) 로그인을 안 한
//     사람도 약 120KB 를 받았다. 첫 로드에서 두 번째로 큰 덩어리였다.
//
// 이제 동적 import 라 Vite 가 따로 떼어 두고, 아래 조건에서만 받는다:
//  - 이 기기에 로그인 흔적이 있을 때 (부팅 시 세션 확인)
//  - 사용자가 실제로 로그인·회원가입을 누를 때

// ───────────────────────────────────────────────────────────────
// 클라우드 로그인·회원가입(2026-09-16 부터 켜짐).
//
// 예전엔 여기가 잠겨 있었다 — 옛 applyCloudProfile 이 서버 행으로 로컬
// 프로필을 통째로 갈아 끼웠는데, profiles 테이블에 xp·achievements·
// totalCalories·totalWorkoutSeconds 칼럼이 없어서 로그인하면 그 값들이
// 0 이 됐다. src/app.js 의 mergeCloudProfile()/syncProfileFromCloud() 로
// "덮어쓰기"를 "필드별 병합"(숫자는 max, 배열은 합집합)으로 바꾸고,
// docs/sql/2026-09-cloud-profile-columns.sql 로 그 칼럼들을 서버에
// 추가한 뒤에 켰다 — 이제 어느 기기에서 로그인해도 기록이 줄지 않는다.
const CLOUD_ENABLED = true;

const URL = 'https://pdmjlleaheqyldhitkty.supabase.co';
// publishable(anon) 키. 공개하라고 만든 키라 저장소에 있어도 정상이다.
// 다만 이 키만으로 남의 기록을 읽을 수 없게 하는 것은 서버의 RLS 정책이다 —
// 그게 꺼져 있으면 profiles 테이블이 통째로 열린다.
const KEY = 'sb_publishable_dUj4X1NhnU95YihrUzmkWg_kuJGy1eW';

// 접속자 수 집계(src/cloud/presence.js)는 SDK 없이 순수 fetch() 로 RPC 를
// 부른다 — 로그인과 무관하게 모두에게 켜져 있어야 하는 기능인데, 그러자고
// 전부에게 Supabase SDK(약 219KB)를 받게 하면 이 파일 맨 위 주석의 원칙이
// 깨진다. URL·KEY 를 여기 한 곳에서만 내보내 두 파일이 같은 값을 쓰게 한다.
export const SUPABASE_URL = URL;
export const SUPABASE_ANON_KEY = KEY;

let client = null;
let loading = null;

// 주소의 ?code=... 를 SDK 가 세션으로 바꾼 뒤 내는 이벤트. 비밀번호 재설정
// 링크로 돌아온 것인지('PASSWORD_RECOVERY') 일반 로그인인지('SIGNED_IN')는
// 이것만이 알려 준다 — pkce 흐름에선 주소에 type=recovery 가 붙지 않는다.
// SDK 는 이걸 초기화가 끝난 다음 틱에 내므로, 클라이언트를 만들자마자
// 구독해 두지 않으면 놓친다.
let urlAuthEvent = null;
const urlAuthWaiters = [];

/** 이 기기에서 로그인한 적이 있나.
 *  Supabase 는 세션을 localStorage 의 sb-<프로젝트>-auth-token 에 둔다.
 *  이걸 먼저 보면, 로그인한 적 없는 사람은 SDK 를 아예 안 받는다. */
export function hasStoredSession() {
  if (!CLOUD_ENABLED) return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch (e) {
    // 사파리 프라이빗 모드 등에서 localStorage 접근이 막힐 수 있다
  }
  return false;
}

/** 클라이언트를 돌려준다. 못 받으면 null — 부르는 쪽은 그 경우를 견뎌야 한다.
 *  로그인이 안 되는 것과 앱이 안 도는 것은 다른 일이다. */
export async function getSupabase() {
  if (!CLOUD_ENABLED) return null;
  if (client) return client;
  if (!loading) {
    loading = import('@supabase/supabase-js')
      .then(({ createClient }) => {
        // flowType: 'pkce' (2026-10-01, 소셜 로그인 추가하며 명시) —
        // supabase-js 기본값은 'implicit' 라, OAuth 로 돌아올 때 주소
        // 해시에 #access_token=... 을 바로 붙인다. 이 앱은 화면 이동도
        // 해시(#q-mission-screen 등)로 하므로 그 둘이 부딪힌다. pkce 는
        // 대신 ?code=... 를 '쿼리'로 돌려주니 해시와 안 겹친다.
        client = createClient(URL, KEY, { auth: { flowType: 'pkce' } });
        client.auth.onAuthStateChange((event) => {
          if (event !== 'SIGNED_IN' && event !== 'PASSWORD_RECOVERY') return;
          if (urlAuthEvent) return;
          urlAuthEvent = event;
          urlAuthWaiters.splice(0).forEach((resolve) => resolve(event));
        });
        return client;
      })
      .catch((e) => {
        console.error('supabase 를 불러오지 못했습니다:', e);
        loading = null; // 다음에 다시 시도할 수 있게
        return null;
      });
  }
  return loading;
}

/** 소셜 로그인(구글/카카오/네이버)에서 막 돌아온 주소인가 — pkce 흐름은
 *  주소 쿼리에 ?code=... 만 남긴다. 이 기기에 로그인 흔적이 없어도(첫
 *  로그인) SDK 를 받아야 그 code 를 세션으로 바꿀 수 있다.
 *
 *  state 는 보지 않는다(2026-10-01). 예전엔 code 와 state 가 둘 다
 *  있어야 true 였는데, state 는 Supabase 와 카카오·네이버 사이에서만
 *  오가고 Supabase 가 이 앱으로 돌려보낼 땐 code 만 붙인다 — 그래서
 *  이게 늘 false 였고, 첫 로그인 기기는 SDK 를 받지도 않은 채 code 를
 *  버리고 첫 화면에 머물렀다. supabase-js 도 code 하나만 본다. */
export function hasOAuthCodeReturn() {
  if (!CLOUD_ENABLED) return false;
  try {
    return /[?&]code=/.test(location.search);
  } catch (e) {
    return false;
  }
}

/** 주소의 code 를 세션으로 바꾼 직후의 이벤트를 기다린다 —
 *  'PASSWORD_RECOVERY' | 'SIGNED_IN' | null(시간 안에 안 오면). */
export function waitForUrlAuthEvent(ms = 2000) {
  if (urlAuthEvent) return Promise.resolve(urlAuthEvent);
  return new Promise((resolve) => {
    urlAuthWaiters.push(resolve);
    setTimeout(() => resolve(urlAuthEvent), ms);
  });
}

/** 이 브라우저에 진행 중인 pkce 요청(code_verifier)이 남아 있나.
 *  없는데 주소에 code 가 왔다면 — 메일 앱이 다른 브라우저로 인증·재설정
 *  링크를 열었거나, 인앱 브라우저에서 시작해 바깥 브라우저로 넘어온
 *  경우다. 그 code 는 이 브라우저에선 절대 세션이 될 수 없다. */
export function hasPendingPkceVerifier() {
  return PKCE_VERIFIER_AT_BOOT;
}

// 부팅 순간에 한 번만 본다 — SDK 는 code 교환을 마치면(성공하든 실패하든)
// verifier 를 지우므로, 나중에 보면 '원래 없었다'와 구분이 안 된다.
// '-flows-code-verifier' 는 진행 중인 요청 목록(배열)이라 비어도 "[]" 로
// 남는다 — 그건 verifier 가 아니다.
const PKCE_VERIFIER_AT_BOOT = (() => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('sb-') || !k.endsWith('-code-verifier')) continue;
      if (k.endsWith('-flows-code-verifier')) continue;
      if (localStorage.getItem(k)) return true;
    }
  } catch (e) {}
  return false;
})();

/** 이미 받아 둔 경우에만 true. 받으러 가지 않는다. */
export function isSupabaseReady() {
  return CLOUD_ENABLED && !!client;
}

/** 클라우드가 켜져 있나. 화면이 계정 입구를 감출지 정하는 데 쓴다. */
export function isCloudEnabled() {
  return CLOUD_ENABLED;
}
