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
        client = createClient(URL, KEY);
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

/** 이미 받아 둔 경우에만 true. 받으러 가지 않는다. */
export function isSupabaseReady() {
  return CLOUD_ENABLED && !!client;
}

/** 클라우드가 켜져 있나. 화면이 계정 입구를 감출지 정하는 데 쓴다. */
export function isCloudEnabled() {
  return CLOUD_ENABLED;
}
