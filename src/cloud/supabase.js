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
// 잠금. 지금은 클라우드를 쓰지 않는다.
//
// 원래 이 자리는 '안 쓰는 기능' 이 아니라 **켜져 있으면 기록을 지우는
// 기능** 이었다: 옛 applyCloudProfile 이 서버 행으로 프로필을 통째로
// 갈아 끼웠는데, profiles 테이블에 xp·achievements·totalCalories·
// totalWorkoutSeconds 칼럼이 없어서 로그인하면 그 값들이 0 이 됐다.
//
// (2026-09-16) src/app.js 에 mergeCloudProfile()/syncProfileFromCloud() 를
// 넣어 이 문제를 고쳤다 — 이제 로그인은 덮어쓰지 않고 로컬·서버 값을
// 필드별로 합친다(숫자는 max, 배열은 합집합). 그래도 아직 false 인 이유는
// 서버 profiles 테이블에 그 필드들을 담을 칼럼 자체가 없기 때문이다 —
// docs/sql/2026-09-cloud-profile-columns.sql 을 Supabase SQL Editor 에서
// 먼저 실행해야 한다. 그 전에 켜면 sync/login 이 조용히 반쪽으로 동작한다
// (예외는 잡히니 앱이 죽지는 않지만, 새 필드들이 서버에 저장·복원되지 않는다).
//
// 이 기기에 예전 로그인 흔적이 남아 있으면 앱을 여는 것만으로
// checkSupabaseSession 이 같은 길을 탄다. 문을 여기 하나로 모아 둔 이유가
// 그것이다 — 부르는 쪽 열 몇 군데에 if 를 뿌리면 언젠가 한 곳을 빠뜨린다.
//
// 되살리는 법: 위 SQL 을 실행했다는 걸 확인한 뒤, 이 상수를 true 로.
const CLOUD_ENABLED = false;

const URL = 'https://pdmjlleaheqyldhitkty.supabase.co';
// publishable(anon) 키. 공개하라고 만든 키라 저장소에 있어도 정상이다.
// 다만 이 키만으로 남의 기록을 읽을 수 없게 하는 것은 서버의 RLS 정책이다 —
// 그게 꺼져 있으면 profiles 테이블이 통째로 열린다.
const KEY = 'sb_publishable_dUj4X1NhnU95YihrUzmkWg_kuJGy1eW';

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
