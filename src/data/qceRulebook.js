// QCE 경기 규칙 요약 — 동작 기준(Movement Standard) & 반칙 처리(2026-09-19).
//
// 앱 안에서 보여주는 요약판이다. start·valid·noRep 은 전문 판정 용어라
// challengeGloss.js 와 같은 이유로 한국어로만 둔다 — 오역 위험 없이
// 영어·중국어로 옮기려면 별도 검수가 필요해서, 지금은 한국어만 정확하게
// 유지하는 쪽을 택했다(2026-09-19 결정). 더 자세한 버전(심판 인증 절차
// 포함)은 Claude Docs 문서로 따로 관리한다.
//
// 다만 동작 '이름'(label)은 이 판정 용어와 달리 오역 위험이 낮은 고유
// 명사라 다른 화면의 운동 이름과 똑같이 3개 언어를 채운다.
//
// key 는 exercises.js 의 동작 key 를 그대로 가리킨다 — 이름·아이콘은
// programs.js 가 EXERCISES 에서 가져와 붙인다. 다만 SHUTTLERUN·BEARCRAWL·
// PLANKJACK·JUMPLUNGE 는 EXERCISES 에 없다(programs.js 의 QCE_STATIONS
// 주석 참고 — 앞의 둘은 트랙·바닥 이동 공간이 필요해 이 앱의 연습
// 서킷은 대신 제자리 달리기·마운틴클라이머를 쓰고, 뒤의 둘은 시연
// 영상이 아직 없다) — 그래서 label 을 이 표에 직접 적어 둔다.
export const QCE_MOVEMENT_STANDARDS = [
  { key: 'SHUTTLERUN', target: '4회 왕복',
    label: { ko: '셔틀런', en: 'Shuttle Run', zh: '穿梭跑' },
    start: '출발선에 선 자세',
    valid: '지정된 반환점까지 달려가 손으로 바닥(또는 라인)을 짚고 돌아오기를 4회 왕복',
    noRep: '반환점에 손이 닿지 않거나 왕복 횟수를 다 채우지 못함' },
  { key: 'BURPEE', target: '15회',
    start: '선 자세',
    valid: '스쿼트 → 플랭크 → 가슴이 바닥에 닿거나 팔이 완전히 펴짐 → 점프해 두 손이 머리 위로',
    noRep: '점프 시 두 발이 바닥에서 안 떨어지거나 자세가 무너짐' },
  { key: 'JUMPSQUAT', target: '20회',
    start: '선 자세, 발은 어깨너비',
    valid: '무릎이 발끝과 같은 방향을 유지하며 앉았다 폭발적으로 뛰어올라 부드럽게 착지',
    noRep: '점프 시 두 발이 바닥에서 안 떨어지거나 착지할 때 무릎이 안쪽으로 무너짐' },
  { key: 'PUSHUP', target: '15회',
    start: '팔 완전히 편 플랭크 자세',
    valid: '가슴이 기준선까지 내려갔다 팔을 다시 편다',
    noRep: '기준 깊이 미달, 또는 팔꿈치를 완전히 잠가버림' },
  { key: 'BEARCRAWL', target: '20초',
    label: { ko: '베어크롤', en: 'Bear Crawl', zh: '熊爬' },
    start: '손과 발로 바닥을 짚은 자세, 엉덩이는 낮게',
    valid: '무릎이 바닥에 닿지 않게 유지하며 손발을 번갈아 짚어 전진',
    noRep: '무릎이 바닥에 닿거나 엉덩이가 지나치게 솟음' },
  { key: 'PLANKJACK', target: '20회',
    label: { ko: '플랭크잭', en: 'Plank Jack', zh: '平板开合跳' },
    start: '팔 완전히 편 플랭크 자세',
    valid: '플랭크 자세를 유지한 채 두 발을 동시에 바깥으로 벌렸다가 다시 모은다',
    noRep: '엉덩이가 솟거나 처져 몸이 일직선을 벗어남' },
  { key: 'JUMPLUNGE', target: '20회',
    label: { ko: '점프런지', en: 'Jump Lunge', zh: '跳跃弓步' },
    start: '한쪽 발을 앞으로 내민 런지 자세',
    valid: '런지 자세에서 뛰어올라 공중에서 앞뒤 다리를 바꿔 반대쪽 런지로 착지(좌우 합산)',
    noRep: '착지할 때 앞무릎이 발끝을 크게 넘거나 균형을 잃고 무너짐' },
  { key: 'VUP', target: '20회',
    start: '누운 자세, 팔다리를 편 상태',
    valid: '팔다리를 동시에 들어올려 상체와 하체가 만나는 V자 자세를 만들었다 내린다',
    noRep: '반동을 사용하거나 상체·하체가 기준 높이까지 올라오지 않음' },
];

export const QCE_PENALTY_RULES = [
  { case: '심판 지시 불이행(자세 교정 요구 무시 등)', result: '감점' },
  { case: '부정행위(타인 대신 출발, 기록 조작 등)', result: '실격(DQ)' },
];
