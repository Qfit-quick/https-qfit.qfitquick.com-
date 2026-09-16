// 로그인 여부와 무관한, 이 기기 하나를 가리키는 익명 id.
//
// 접속자 수 집계(cloud/presence.js)와 푸시 구독(notify/reminder.js) 둘 다
// "누구"가 아니라 "몇 대"를 세는 기능이라 로그인 계정과 엮을 필요가 없다 —
// 오히려 로그인을 안 한 사람도 두 기능 다 써야 하므로 여기서 따로 둔다.
// 개인정보가 아니라 무작위 문자열이라 서버에 그대로 저장해도 된다.

const KEY = 'qfit_device_id_v1';

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (id) return id;
    id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : fallbackId();
    localStorage.setItem(KEY, id);
    return id;
  } catch (e) {
    // localStorage 가 막힌 환경(사파리 프라이빗 모드 등) — 매 호출마다 새로
    // 만들어지지만, 이 기능들은 "대략 몇 명"을 보여주는 통계라 죽지 않는 것이
    // 정확한 것보다 중요하다.
    return fallbackId();
  }
}

function fallbackId() {
  return 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
