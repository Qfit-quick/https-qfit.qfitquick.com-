// QCE 경기 규칙 요약 — 동작 기준(Movement Standard) & 반칙 처리(2026-09-19).
//
// 앱 안에서 보여주는 요약판이다. 전문 판정 용어라 challengeGloss.js 와 같은
// 이유로 한국어로만 둔다 — 오역 위험 없이 영어·중국어로 옮기려면 별도 검수가
// 필요해서, 지금은 한국어만 정확하게 유지하는 쪽을 택했다(2026-09-19 결정).
// 더 자세한 버전(심판 인증 절차 포함)은 Claude Docs 문서로 따로 관리한다.
//
// key 는 exercises.js 의 동작 key 를 그대로 가리킨다 — 이름·아이콘은
// programs.js 가 EXERCISES 에서 가져와 붙인다.
export const QCE_MOVEMENT_STANDARDS = [
  { key: 'RUNINPLACE', target: '45초',
    start: '선 자세',
    valid: '무릎을 골반 높이까지 들어올리며 제자리에서 뛴다',
    noRep: '무릎이 골반 높이 아래에 머무르거나 제자리를 벗어남' },
  { key: 'BURPEE', target: '15회',
    start: '선 자세',
    valid: '스쿼트 → 플랭크 → 가슴이 바닥에 닿거나 팔이 완전히 펴짐 → 점프해 두 손이 머리 위로',
    noRep: '점프 시 두 발이 바닥에서 안 떨어지거나 자세가 무너짐' },
  { key: 'SQUAT', target: '20회',
    start: '선 자세, 발은 어깨너비',
    valid: '무릎이 발끝과 같은 방향을 유지하며 앉았다 완전히 일어섬',
    noRep: '무릎이 발끝 안쪽으로 무너지거나 깊이가 기준 미달' },
  { key: 'PUSHUP', target: '15회',
    start: '팔 완전히 편 플랭크 자세',
    valid: '가슴이 기준선까지 내려갔다 팔을 다시 편다',
    noRep: '기준 깊이 미달, 또는 팔꿈치를 완전히 잠가버림' },
  { key: 'MOUNTAINCLIMBER', target: '30초',
    start: '플랭크 자세',
    valid: '무릎을 번갈아 가슴 쪽으로 빠르게 당기며 몸은 일직선 유지',
    noRep: '엉덩이가 과도하게 솟거나 무릎이 가슴 근처까지 안 옴' },
  { key: 'PLANK', target: '40초',
    start: '팔꿈치(또는 손) 지지, 몸 일직선',
    valid: '40초간 엉덩이가 오르내리지 않고 자세를 유지',
    noRep: '엉덩이가 처지거나 솟아 자세가 무너짐(그 순간부터 시간 정지)' },
  { key: 'LUNGE', target: '20회',
    start: '선 자세',
    valid: '한 발을 내밀어 앞무릎이 발끝을 넘지 않게 앉았다 일어섬(좌우 합산)',
    noRep: '앞무릎이 발끝을 넘거나 깊이가 얕음' },
  { key: 'CRUNCH', target: '20회',
    start: '누운 자세, 무릎 세움',
    valid: '목이 아닌 복부 힘으로 상체를 말아 올렸다 내린다',
    noRep: '목을 당겨 올리거나 상체가 기준 높이까지 안 말림' },
];

export const QCE_PENALTY_RULES = [
  { case: '심판 지시 불이행(자세 교정 요구 무시 등)', result: '감점' },
  { case: '부정행위(타인 대신 출발, 기록 조작 등)', result: '실격(DQ)' },
];
