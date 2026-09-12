// 챌린지 트래커 7개 트랙의 Phase·주차 기록 데이터(2026-09-13).
//
// 사용자가 만든 독립 HTML(qfit-challenge-tracker.html)의 PHASES/LOGS/
// TRACKS 데이터를 그대로 옮겼다 — 세트·횟수·주차 배정 등 숫자를 하나도
// 안 바꿨다. 운동 이름·목표 문구·비고는 challengeGloss.js 와 같은 이유로
// 한국어 전용으로 두고 STATIC_UI 에 옮기지 않았다(칼리스테닉스 전문
// 용어 104개+@를 오역 위험 없이 영어·중국어로 옮기려면 별도 검수가
// 필요하다 — 지금은 한국어만 정확하게 유지하는 쪽을 택했다).
//
// exercises 배열의 각 행은 [운동이름, 세트/횟수, 비고, 아이콘키] 순서다
// (아이콘키는 challengeIcons.js 의 CHALLENGE_ICONS 를 가리킨다).

export var PULLUP_PHASES = [
  { range: [1, 3], title: '기초 다지기 (매달리기 단계)',
    goal: '데드행 40~60초, 등 당기는 근육 활성화 패턴 익히기',
    exercises: [
      ['데드행(수동적 매달리기)', '3 x 최대시간', '그립 강화, 어깨 이완 상태 유지', 'hang'],
      ['액티브 행(어깨 으쓱 내린 채 매달리기)', '3 x 15~20초', '스캡션 디프레션 감각 익히기', 'hangActive'],
      ['인버티드 로우', '3 x 8~12회', '수평 당기기로 등 근력 베이스', 'row'],
      ['랫풀다운 / 밴드 스트레이트암 풀다운', '3 x 12~15회', '광배근 활성화', 'pulldown'],
      ['데드행 스캡션 풀(어깨만 위아래)', '3 x 10회', '견갑골 안정화', 'hangActive']
    ] },
  { range: [4, 6], title: '네거티브 & 밴드 보조',
    goal: '네거티브 풀업 5초 이상 컨트롤, 밴드로 3~5회',
    exercises: [
      ['네거티브 풀업', '4 x 3~5회', '내려오는 데 5초 이상', 'pull'],
      ['밴드 보조 풀업(굵은 밴드)', '3 x 5~8회', '턱까지 겨우 올라가는 두께 선택', 'pull'],
      ['점프 풀업', '3 x 6~8회', '네거티브와 결합', 'pull'],
      ['인버티드 로우(발 위치 높여 난이도↑)', '3 x 10~12회', '', 'row'],
      ['이두 컬 / 페이스풀', '3 x 12회', '보조근 강화, 부상 예방', 'curl']
    ] },
  { range: [7, 9], title: '밴드 약화 & 첫 풀업 시도',
    goal: '얇은 밴드로 5~8회, 무보조 첫 1~3개',
    exercises: [
      ['밴드 보조 풀업(얇은 밴드)', '3 x 6~8회', '밴드 두께 한 단계 낮춤', 'pull'],
      ['무보조 풀업 시도', '3 x 최대개수', '0개여도 OK, 매 세션 기록', 'pull'],
      ['네거티브 풀업(연장)', '2 x 3회', '7~10초로', 'pull'],
      ['웨이트 인버티드 로우', '3 x 8회', '가슴에 부하 추가', 'row']
    ] },
  { range: [10, 12], title: '완성 & 볼륨',
    goal: '클린 풀업 5회 이상, 총 볼륨 늘리기',
    exercises: [
      ['무보조 풀업', '5 x 최대개수', 'RPE 8 수준', 'pull'],
      ['클러스터 세트', '1세트', '1개+10초 휴식 x5', 'pull'],
      ['그립 변형(친업/뉴트럴그립)', '2 x 최대개수', '다양한 각도 근력', 'pull'],
      ['행잉 니레이즈', '3 x 10~15회', '턱걸이 상단 잠금 보조', 'legRaiseBent']
    ] }
];

export var PULLUP_LOGS = [
  { week: 1, label: '데드행 최대시간', unit: '초', type: 'number' },
  { week: 2, label: '데드행 최대시간', unit: '초', type: 'number' },
  { week: 3, label: '데드행 최대시간', unit: '초', type: 'number' },
  { week: 4, label: '네거티브 풀업 컨트롤 시간', unit: '초', type: 'number' },
  { week: 5, label: '밴드 보조 풀업 개수', unit: '회', type: 'number' },
  { week: 6, label: '밴드 보조 풀업 개수', unit: '회', type: 'number' },
  { week: 7, label: '무보조 풀업 최대개수', unit: '회', type: 'number' },
  { week: 8, label: '무보조 풀업 최대개수', unit: '회', type: 'number' },
  { week: 9, label: '무보조 풀업 최대개수', unit: '회', type: 'number' },
  { week: 10, label: '클린 풀업 최대개수', unit: '회', type: 'number' },
  { week: 11, label: '클린 풀업 최대개수', unit: '회', type: 'number' },
  { week: 12, label: '최종 테스트 - 클린 풀업 최대개수', unit: '회', type: 'number' }
];

export var PLANCHE_PHASES = [
  { range: [1, 4], title: 'Phase 1 · 손목/어깨 준비 + 플란체 린 기초',
    goal: '손목 통증 없이 15~20초 유지, 플란체 린 자세 익히기',
    exercises: [
      ['손목 스트레칭(굽힘/폄)', '각 방향 3 x 20초', '매 세션 필수, 절대 생략 X', 'wrist'],
      ['플란체 린', '3 x 10~15초', '어깨는 항상 귀에서 멀리 유지', 'leanTilt'],
      ['스캡션 프로텍션 푸시업', '3 x 10회', '견갑골 전인 근력', 'plank'],
      ['할로우바디 홀드', '3 x 20~30초', '코어 긴장 유지', 'core'],
      ['프론트레버 턱(무릎 굽힘, 낮은 바)', '3 x 8~10초', '전신 긴장 패턴', 'tuckHang']
    ] },
  { range: [5, 8], title: 'Phase 2 · 플란체 린 심화 + 턱 플란체 진입',
    goal: '플란체 린 25~30초, 턱 플란체 자세로 발 잠깐 떼기',
    exercises: [
      ['플란체 린(각도 심화)', '3 x 20~25초', '무게중심 이동에 집중', 'leanTilt'],
      ['턱 플란체 지지(발 잠깐 뜨기)', '5 x 3~5초', '1~2초만 떠도 성공', 'tuckHold'],
      ['슈도 플란체 푸시업', '3 x 6~8회', '플란체 핵심 보조운동', 'leanTilt'],
      ['스트레이트암 플랭크', '3 x 20~30초', '팔꿈치 안정성', 'plank']
    ] },
  { range: [9, 12], title: 'Phase 3 · 턱 플란체 홀드 안정화',
    goal: '턱 플란체 10~15초 안정적으로',
    exercises: [
      ['턱 플란체 홀드', '5 x 8~15초', '폼 무너지면 즉시 내려놓기', 'tuckHold'],
      ['슈도 플란체 푸시업(각도 심화)', '3 x 8회', '', 'leanTilt'],
      ['딥스', '3 x 8~10회', '삼두/가슴 보조근', 'dip'],
      ['고관절 유연성(다리 벌리기)', '2 x 30초', '스트래들 대비, 지금부터 조금씩', 'stretch']
    ] },
  { range: [13, 16], title: 'Phase 4 · 어드밴스드 턱 플란체 진입',
    goal: '어드밴스드 턱(무릎을 가슴에서 떨어뜨린 자세) 첫 시도 ~5초',
    exercises: [
      ['턱 플란체 홀드(볼륨 유지)', '3 x 15초', '기초 체력 유지', 'tuckHold'],
      ['어드밴스드 턱 플란체', '5 x 3~5초', '무릎을 살짝만 떨어뜨린 각도부터', 'tuckHold'],
      ['슈도 플란체 푸시업(어드밴스드 각도)', '3 x 8회', '', 'leanTilt'],
      ['고관절 유연성', '2 x 30~40초', '스트래들 대비 지속', 'stretch']
    ] },
  { range: [17, 20], title: 'Phase 5 · 어드밴스드 턱 심화 + 스트래들 준비',
    goal: '어드밴스드 턱 10초 이상, 스트래들 플란체 린 시작',
    exercises: [
      ['어드밴스드 턱 플란체 홀드', '5 x 8~10초', '메인 세트', 'tuckHold'],
      ['스트래들 플란체 린', '3 x 10~15초', '균형감 익히기', 'straddleHold'],
      ['스트레이트암 플랭크(연장)', '2 x 30~40초', '계속 유지', 'plank']
    ] },
  { range: [21, 24], title: 'Phase 6 · 스트래들 플란체 진입',
    goal: '스트래들 플란체 5~10초 홀드',
    exercises: [
      ['어드밴스드 턱 플란체 홀드', '3 x 10초', '기초 체력 유지', 'tuckHold'],
      ['스트래들 플란체 시도', '5 x 2~5초', '무리하지 말고 조금씩', 'straddleHold'],
      ['고관절 유연성 심화', '2 x 40초', '스트래들 자세 안정에 직결', 'stretch']
    ] }
];

export var PLANCHE_LOGS = [
  { week: 1, label: '플란체 린 최대시간', unit: '초', type: 'number' },
  { week: 2, label: '플란체 린 최대시간', unit: '초', type: 'number' },
  { week: 3, label: '플란체 린 최대시간', unit: '초', type: 'number' },
  { week: 4, label: '플란체 린 최대시간', unit: '초', type: 'number' },
  { week: 5, label: '턱 플란체 지지(발 뜬 시간)', unit: '초', type: 'number' },
  { week: 6, label: '턱 플란체 지지(발 뜬 시간)', unit: '초', type: 'number' },
  { week: 7, label: '턱 플란체 지지(발 뜬 시간)', unit: '초', type: 'number' },
  { week: 8, label: '턱 플란체 지지(발 뜬 시간)', unit: '초', type: 'number' },
  { week: 9, label: '턱 플란체 홀드', unit: '초', type: 'number' },
  { week: 10, label: '턱 플란체 홀드', unit: '초', type: 'number' },
  { week: 11, label: '턱 플란체 홀드', unit: '초', type: 'number' },
  { week: 12, label: '턱 플란체 홀드(체크포인트)', unit: '초', type: 'number' },
  { week: 13, label: '어드밴스드 턱 첫 시도', unit: '', type: 'boolean' },
  { week: 14, label: '어드밴스드 턱 홀드', unit: '초', type: 'number' },
  { week: 15, label: '어드밴스드 턱 홀드', unit: '초', type: 'number' },
  { week: 16, label: '어드밴스드 턱 홀드', unit: '초', type: 'number' },
  { week: 17, label: '어드밴스드 턱 홀드', unit: '초', type: 'number' },
  { week: 18, label: '스트래들 플란체 린 시간', unit: '초', type: 'number' },
  { week: 19, label: '스트래들 플란체 린 시간', unit: '초', type: 'number' },
  { week: 20, label: '스트래들 플란체 린 시간', unit: '초', type: 'number' },
  { week: 21, label: '스트래들 플란체 첫 시도', unit: '', type: 'boolean' },
  { week: 22, label: '스트래들 플란체 홀드', unit: '초', type: 'number' },
  { week: 23, label: '스트래들 플란체 홀드', unit: '초', type: 'number' },
  { week: 24, label: '최종 테스트(어드밴스드 턱/스트래들 홀드)', unit: '', type: 'text' }
];

export var HANDSTAND_PHASES = [
  { range: [1, 3], title: '벽 지지 기초 (체스트-투-월)',
    goal: '손목 통증 없이 벽 지지 물구나무 30초',
    exercises: [
      ['손목 스트레칭(굽힘/폄)', '각 방향 3 x 20초', '매 세션 필수', 'wrist'],
      ['체스트-투-월 핸드스탠드 홀드', '4 x 15~20초', '가슴이 벽 쪽, 몸 일직선', 'handstandWall'],
      ['파이크 푸시업', '3 x 8~10회', '어깨 프레스 힘 기초', 'pike'],
      ['할로우바디 홀드', '3 x 20~30초', '코어 긴장 유지', 'core']
    ] },
  { range: [4, 6], title: '백-투-월 킥업',
    goal: '백투월 자세 1분 유지, 킥업 감각 익히기',
    exercises: [
      ['백-투-월 핸드스탠드 홀드', '4 x 20~30초', '등이 벽 쪽, 발끝만 살짝 터치', 'handstandWall'],
      ['킥업 연습(한 발로 차올리기)', '5 x 5회 시도', '벽에 발 닿는 순간까지만', 'handstandWall'],
      ['파이크 푸시업(각도 심화)', '3 x 10회', '', 'pike'],
      ['손목 웨이트 시프트(손 짚고 체중 이동)', '3 x 10회', '균형 감각', 'wrist']
    ] },
  { range: [7, 9], title: '프리스탠딩 진입',
    goal: '벽 없이 5초 유지',
    exercises: [
      ['핸드스탠드 태핑(벽에서 살짝 떨어져 연습)', '5 x 30초', '넘어지는 연습도 안전하게', 'handstandWall'],
      ['프리스탠딩 킥업 시도', '10회 시도', '실패해도 매 세션 기록', 'handstandFree'],
      ['숄더 프레스(파이크 or 필라테스링)', '3 x 8회', '프레스 힘 보강', 'plank'],
      ['코어(L싯 홀드)', '3 x 10~15초', '자세 안정에 직결', 'core']
    ] },
  { range: [10, 12], title: '홀드 연장',
    goal: '프리스탠딩 15~30초',
    exercises: [
      ['프리스탠딩 핸드스탠드 홀드', '5 x 최대시간', '메인 세트', 'handstandFree'],
      ['밸런스 보정 드릴(손가락 미세조정)', '3 x 20초', '', 'handstandWall'],
      ['핸드스탠드 푸시업(네거티브)', '3 x 3~5회', '다음 단계 준비', 'handstandFree']
    ] }
];

export var HANDSTAND_LOGS = [
  { week: 1, label: '벽 지지(체스트투월) 홀드시간', unit: '초', type: 'number' },
  { week: 2, label: '벽 지지(체스트투월) 홀드시간', unit: '초', type: 'number' },
  { week: 3, label: '벽 지지(체스트투월) 홀드시간', unit: '초', type: 'number' },
  { week: 4, label: '백투월 홀드시간', unit: '초', type: 'number' },
  { week: 5, label: '백투월 홀드시간', unit: '초', type: 'number' },
  { week: 6, label: '백투월 홀드시간', unit: '초', type: 'number' },
  { week: 7, label: '프리스탠딩 시도 중 최고 유지시간', unit: '초', type: 'number' },
  { week: 8, label: '프리스탠딩 시도 중 최고 유지시간', unit: '초', type: 'number' },
  { week: 9, label: '프리스탠딩 시도 중 최고 유지시간', unit: '초', type: 'number' },
  { week: 10, label: '프리스탠딩 홀드시간', unit: '초', type: 'number' },
  { week: 11, label: '프리스탠딩 홀드시간', unit: '초', type: 'number' },
  { week: 12, label: '최종 테스트 - 프리스탠딩 홀드시간', unit: '초', type: 'number' }
];

export var MUSCLEUP_PHASES = [
  { range: [1, 2], title: '폭발력 & false grip',
    goal: '체스트투바 풀업 3회, false grip 매달리기 10초',
    exercises: [
      ['체스트-투-바 풀업', '4 x 3~5회', '최대한 폭발적으로', 'pull'],
      ['false grip 데드행', '4 x 8~10초', '처음엔 손목이 아플 수 있음', 'hangActive'],
      ['딥스', '3 x 8~10회', '트랜지션 이후 구간 근력', 'dip'],
      ['익스플로시브 인버티드 로우', '3 x 8회', '폭발력 전이', 'row']
    ] },
  { range: [3, 4], title: '밴드 머슬업 트랜지션',
    goal: '밴드 보조 머슬업 3~5회',
    exercises: [
      ['밴드 보조 머슬업(굵은 밴드)', '4 x 3~5회', '트랜지션 느낌 익히기', 'pull'],
      ['false grip 풀업', '3 x 5회', 'false grip 유지한 채 당기기', 'pull'],
      ['딥스(볼륨↑)', '3 x 10회', '', 'dip'],
      ['체스트투바 풀업', '3 x 5회', '계속 유지', 'pull']
    ] },
  { range: [5, 6], title: '트랜지션 드릴',
    goal: '낮은 바/링에서 트랜지션 단독 연습',
    exercises: [
      ['낮은바 지지 트랜지션 드릴(발 지지)', '5 x 5회', '팔꿈치 돌리는 감각', 'pull'],
      ['밴드 머슬업(얇은 밴드로 교체)', '3 x 3~5회', '밴드 약화', 'pull'],
      ['딥스(중량 추가 시도)', '3 x 8회', '', 'dip']
    ] },
  { range: [7, 8], title: '무보조 시도',
    goal: '첫 무보조 머슬업 성공',
    exercises: [
      ['무보조 머슬업 시도', '5 x 최대개수(0개도 OK)', '매 세션 기록', 'pull'],
      ['밴드 머슬업(백업용)', '2 x 5회', '실패 시 보완 세트', 'pull'],
      ['딥스+풀업 슈퍼세트', '3라운드', '전체 볼륨 유지', 'dip']
    ] }
];

export var MUSCLEUP_LOGS = [
  { week: 1, label: '체스트투바 풀업 개수', unit: '회', type: 'number' },
  { week: 2, label: 'false grip 매달리기 시간', unit: '초', type: 'number' },
  { week: 3, label: '밴드 머슬업 개수', unit: '회', type: 'number' },
  { week: 4, label: '밴드 머슬업 개수', unit: '회', type: 'number' },
  { week: 5, label: '트랜지션 드릴 성공 횟수', unit: '회', type: 'number' },
  { week: 6, label: '얇은 밴드 머슬업 개수', unit: '회', type: 'number' },
  { week: 7, label: '무보조 머슬업 첫 시도', unit: '', type: 'boolean' },
  { week: 8, label: '최종 테스트 - 무보조 머슬업 개수', unit: '회', type: 'number' }
];

export var FRONTLEVER_PHASES = [
  { range: [1, 4], title: '턱 프론트레버',
    goal: '턱 프론트레버 10초',
    exercises: [
      ['스트레이트암 풀다운(밴드/케이블)', '3 x 10~12회', '광배근-어깨 협응', 'pulldown'],
      ['턱 프론트레버 홀드(무릎 완전히 당김)', '5 x 5~8초', '', 'tuckHang'],
      ['할로우바디 홀드', '3 x 20~30초', '코어', 'core'],
      ['백레버 턱(선택, 반대 방향 밸런스)', '3 x 5초', '선택사항', 'backLeverTuck']
    ] },
  { range: [5, 8], title: '어드밴스드 턱',
    goal: '어드밴스드 턱 프론트레버 5~8초',
    exercises: [
      ['어드밴스드 턱 프론트레버(무릎 살짝 떨어뜨림)', '5 x 5~8초', '', 'tuckHang'],
      ['턱 프론트레버(볼륨 유지)', '3 x 10초', '', 'tuckHang'],
      ['스트레이트암 풀다운(부하↑)', '3 x 10회', '', 'pulldown'],
      ['행잉 레그레이즈', '3 x 10~12회', '코어 보강', 'legRaise']
    ] },
  { range: [9, 12], title: '원레그 진입',
    goal: '원레그 프론트레버 5초',
    exercises: [
      ['원레그 프론트레버(한 다리만 펴기)', '5 x 3~5초', '양쪽 번갈아', 'straddleHold'],
      ['어드밴스드 턱 프론트레버(연장)', '3 x 8~10초', '', 'tuckHang'],
      ['스트레이트암 플랭크류 보강', '2 x 30초', '', 'plank']
    ] },
  { range: [13, 16], title: '원레그 심화 & 스트래들 시도',
    goal: '원레그 8~10초, 스트래들 프론트레버 진입 시도',
    exercises: [
      ['원레그 프론트레버(연장)', '5 x 8~10초', '', 'straddleHold'],
      ['스트래들 프론트레버 시도', '3 x 2~5초', '완주 못해도 정상', 'straddleHold'],
      ['풀 프론트레버 행잉(짧게)', '2 x 시도', '풀은 이후 장기 목표', 'straddleHold']
    ] }
];

export var FRONTLEVER_LOGS = [
  { week: 1, label: '턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 2, label: '턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 3, label: '턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 4, label: '턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 5, label: '어드밴스드 턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 6, label: '어드밴스드 턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 7, label: '어드밴스드 턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 8, label: '어드밴스드 턱 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 9, label: '원레그 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 10, label: '원레그 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 11, label: '원레그 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 12, label: '원레그 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 13, label: '스트래들 프론트레버 첫 시도', unit: '', type: 'boolean' },
  { week: 14, label: '원레그 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 15, label: '원레그 프론트레버 홀드', unit: '초', type: 'number' },
  { week: 16, label: '최종 테스트 - 원레그/스트래들 홀드', unit: '', type: 'text' }
];

export var DIPS_PHASES = [
  { range: [1, 3], title: '딥스 폼 다지기',
    goal: '무보조 딥스 5회',
    exercises: [
      ['밴드 보조 딥스', '4 x 8~10회', '', 'dipBand'],
      ['벤치 딥스(발 바닥)', '3 x 10~12회', '보조 운동', 'dip'],
      ['숄더 워밍업(외회전)', '3 x 12회', '부상 예방', 'shoulderRot']
    ] },
  { range: [4, 6], title: '볼륨 & 중량',
    goal: '무보조 딥스 15회 또는 중량 딥스 진입',
    exercises: [
      ['무보조 딥스', '4 x 최대개수', '메인 세트', 'dip'],
      ['중량 딥스(작은 중량)', '3 x 6~8회', '15회 넘으면 중량 고려', 'dip'],
      ['삼두 보강(오버헤드 익스텐션)', '3 x 12회', '', 'overhead']
    ] },
  { range: [7, 9], title: '원암딥스 기초 준비',
    goal: '아처딥스 진입, 싱글암 서포트 홀드 3~5초',
    exercises: [
      ['아처 딥스(한쪽에 체중 치우쳐서)', '4 x 4~6회', '양쪽 번갈아', 'archerDip'],
      ['싱글암 서포트 홀드(한 팔로 버티기)', '5 x 3~5초', '링/평행봉 활용', 'archerDip'],
      ['중량 딥스(볼륨 유지)', '3 x 8회', '', 'dip']
    ] },
  { range: [10, 12], title: '원암딥스 시도',
    goal: '편측 부하 늘리기 (완성은 장기 목표)',
    exercises: [
      ['아처 딥스(더 치우친 각도)', '4 x 4~6회', '', 'archerDip'],
      ['싱글암 서포트 홀드(연장)', '5 x 5~8초', '', 'archerDip'],
      ['원암 딥스 네거티브(가능한 만큼)', '3 x 1~2회', '천천히만, 무리 금지', 'archerDip']
    ] }
];

export var DIPS_LOGS = [
  { week: 1, label: '무보조 딥스 개수', unit: '회', type: 'number' },
  { week: 2, label: '무보조 딥스 개수', unit: '회', type: 'number' },
  { week: 3, label: '무보조 딥스 개수', unit: '회', type: 'number' },
  { week: 4, label: '딥스 개수 또는 중량딥스(kg x 회)', unit: '', type: 'text' },
  { week: 5, label: '딥스 개수 또는 중량딥스(kg x 회)', unit: '', type: 'text' },
  { week: 6, label: '딥스 개수 또는 중량딥스(kg x 회)', unit: '', type: 'text' },
  { week: 7, label: '아처딥스 개수', unit: '회', type: 'number' },
  { week: 8, label: '싱글암 서포트 홀드', unit: '초', type: 'number' },
  { week: 9, label: '싱글암 서포트 홀드', unit: '초', type: 'number' },
  { week: 10, label: '아처딥스 개수', unit: '회', type: 'number' },
  { week: 11, label: '싱글암 서포트 홀드', unit: '초', type: 'number' },
  { week: 12, label: '최종 테스트 - 싱글암 홀드/원암딥스 시도', unit: '', type: 'text' }
];

export var SPLITS_PHASES = [
  { range: [1, 3], title: '기초 가동성',
    goal: '통증 없는 범위에서 매일 스트레칭 루틴 확립',
    exercises: [
      ['버터플라이 스트레칭', '3 x 30초', '', 'butterflyStretch'],
      ['카프라주(개구리) 스트레칭', '3 x 30초', '', 'frogStretch'],
      ['런지 힙플렉서 스트레칭', '각 다리 3 x 30초', '', 'lungeStretch'],
      ['가벼운 사이드런지', '3 x 8회', '동적 가동성', 'lungeStretch']
    ] },
  { range: [4, 6], title: '능동 스트레칭 확장',
    goal: '가동범위 점진적 확장, 바닥과의 거리 측정 시작',
    exercises: [
      ['벽 대고 사이드 스플릿 시도(벽에 다리 지지)', '3 x 30~40초', '', 'lungeStretch'],
      ['능동 다리 들어올리기(사이드)', '3 x 10회', '근력+가동성 동시', 'lungeStretch'],
      ['카프라주 심화', '3 x 40초', '', 'frogStretch']
    ] },
  { range: [7, 9], title: '딥 스트레치 + PNF',
    goal: '바닥과의 거리 추가 단축',
    exercises: [
      ['PNF 스트레칭(수축-이완 기법)', '3 x (6초 수축+20초 이완)', '벽/파트너 활용', 'stretch'],
      ['사이드 스플릿 시도(쿠션/블록 지지)', '3 x 40~60초', '', 'splitAttempt'],
      ['고관절 회전근 스트레칭', '각 방향 3 x 30초', '', 'stretch']
    ] },
  { range: [10, 12], title: '풀 스플릿 진입 시도',
    goal: '통증 없는 최대 범위 — 절대 무리하지 않기',
    exercises: [
      ['사이드 스플릿 시도(지지물 점차 낮추기)', '3 x 최대유지시간', '', 'splitAttempt'],
      ['PNF 스트레칭(심화)', '3세트', '', 'stretch'],
      ['전신 쿨다운 스트레칭', '5분', '', 'splitAttempt']
    ] }
];

export var SPLITS_LOGS = [
  { week: 1, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 2, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 3, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 4, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 5, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 6, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 7, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 8, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 9, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 10, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 11, label: '바닥과의 거리(낮을수록 좋음)', unit: 'cm', type: 'number' },
  { week: 12, label: '최종 테스트 - 바닥과의 거리', unit: 'cm', type: 'number' }
];

export var CHALLENGE_TRACK_ORDER = ['pullup', 'planche', 'handstand', 'muscleup', 'frontlever', 'dips', 'splits'];

export var CHALLENGE_TRACKS = {
  pullup:     { name: '턱걸이',        short: '턱걸이',        totalWeeks: 12, phases: PULLUP_PHASES,     logs: PULLUP_LOGS,
                startKey: 'qfit_challenge_pullup_start',     logsKey: 'qfit_challenge_pullup_logs' },
  planche:    { name: '플란체',        short: '플란체',        totalWeeks: 24, phases: PLANCHE_PHASES,    logs: PLANCHE_LOGS,
                startKey: 'qfit_challenge_planche_start',    logsKey: 'qfit_challenge_planche_logs' },
  handstand:  { name: '핸드스탠드',     short: '물구나무',      totalWeeks: 12, phases: HANDSTAND_PHASES,  logs: HANDSTAND_LOGS,
                startKey: 'qfit_challenge_handstand_start',  logsKey: 'qfit_challenge_handstand_logs' },
  muscleup:   { name: '머슬업',        short: '머슬업',        totalWeeks: 8,  phases: MUSCLEUP_PHASES,   logs: MUSCLEUP_LOGS,
                startKey: 'qfit_challenge_muscleup_start',   logsKey: 'qfit_challenge_muscleup_logs' },
  frontlever: { name: '프론트레버',     short: '프론트레버',    totalWeeks: 16, phases: FRONTLEVER_PHASES, logs: FRONTLEVER_LOGS,
                startKey: 'qfit_challenge_frontlever_start', logsKey: 'qfit_challenge_frontlever_logs' },
  dips:       { name: '딥스·원암딥스',  short: '딥스',          totalWeeks: 12, phases: DIPS_PHASES,       logs: DIPS_LOGS,
                startKey: 'qfit_challenge_dips_start',       logsKey: 'qfit_challenge_dips_logs' },
  splits:     { name: '사이드 스플릿',  short: '스플릿',        totalWeeks: 12, phases: SPLITS_PHASES,     logs: SPLITS_LOGS,
                startKey: 'qfit_challenge_splits_start',     logsKey: 'qfit_challenge_splits_logs' }
};
