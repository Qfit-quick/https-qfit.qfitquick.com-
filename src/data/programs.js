// 목적별 다주 프로그램(2026-09-11).
//
// '목표' 탭의 자동 주간 계획(plan.js)과는 완전히 다른 물건이다 — 이쪽은
// 사람이 이름 붙여 고르는, 시작과 끝이 있는 프로그램이다. 그래서 요일마다
// 동작을 하나하나 적지 않는다 — plan.js 의 SPLITS 처럼 '어떤 pool에서
// 어떤 리듬으로' 뽑을지만 적고, 실제 동작은 programDayPlan()(plan.js)이
// 그날 요일을 씨앗으로 결정적으로 뽑는다.
//
// focus 값의 뜻(programDayPlan 이 이 표대로 pool 을 고른다):
//   'full'   — EXERCISES 전체 24개
//   'cardio' — MUSCLE_GROUPS 의 'full'(전신) 묶음 — 제자리달리기·버피 등
//              기능성 유산소 5개. 이름이 겹쳐서 여기서는 'cardio' 라 부른다.
//   'lower' / 'upper' / 'core' — MUSCLE_GROUPS 그대로
//   'diet'   — AI_GOAL_POOLS.diet(고강도 유산소, MET 6.0 이상) 재사용
//   'glute'  — 이 파일 안의 GLUTE_KEYS 직접 지정(부위 특화라 일반 pool
//              로테이션이 안 맞는다 — 힙브릿지가 muscle-groups.js 에서는
//              코어로 분류돼 있어서 'lower' 로는 못 집는다)
//   'hotnight' — 이 파일 안의 HOT_NIGHT_KEYS 직접 지정(누워서/바닥에서
//              하는 하체·둔근 동작만)
//   'rest'   — 쉬는 날
//
// 하이록스·F45 면책: 이 앱은 맨몸운동 24개뿐이라 실제 종목(썰매·로잉 등
// 기구, 스튜디오 서킷 기기)을 그대로 구현할 수 없다. 두 프로그램은 그
// 강도·구성 방식을 맨몸운동으로 옮긴 버전이며, 화면에도 이 사실을 적는다.
//
// bg(2026-09-12, 선택): core/assets.js 의 programBgUrl() 이 가리킬 파일명
// (public/media/programs/). 카드 배경으로 흐리게 깔리는 사진 — 없으면
// 그냥 지금처럼 사진 없는 카드로 나온다. 프로그램마다 사진이 다 준비된
// 게 아니라서 필수 필드가 아니다.

export const GLUTE_KEYS = ['HIPBRIDGE', 'SQUAT', 'LUNGE', 'COSSACKSQUAT'];

// '뜨거운 밤' 전용 — 하체·둔근을 노리되 전부 누워서(또는 바닥에 앉아서)
// 하는 동작만 골랐다(2026-09-12). GLUTE_KEYS 와 다른 점: 저건 서서 하는
// 스쿼트·런지도 섞여 있지만, 이건 매트 위에서 안 일어나도 되는 것만 남긴다.
export const HOT_NIGHT_KEYS = ['HIPBRIDGE', 'LEGRAISE', 'DEADBUG', 'VUP', 'CRUNCH'];

export const PROGRAMS = [
  {
    id: 'hyrox',
    weeks: 3,
    name: { ko: '하이록스 3주', en: 'Hyrox 3-Week', zh: 'Hyrox 3周' },
    tagline: { ko: '고강도 유산소 + 기능성 서킷', en: 'High-intensity cardio + functional circuits', zh: '高强度有氧 + 功能性循环' },
    disclaimer: {
      ko: '실제 하이록스 종목(썰매·로잉 등 기구)이 아니라, 그 강도를 맨몸운동으로 옮긴 버전입니다.',
      en: 'Not the real Hyrox stations (sled, rowing, etc.) — this adapts the intensity using bodyweight moves only.',
      zh: '并非真正的Hyrox比赛项目(雪橇、划船等器械)，而是用徒手动作还原其强度的版本。',
    },
    schedule: ['diet', 'cardio', 'rest', 'diet', 'cardio', 'core', 'rest'],
  },
  {
    id: 'f45',
    weeks: 2,
    name: { ko: 'F45 2주', en: 'F45 2-Week', zh: 'F45 2周' },
    tagline: { ko: '전신 서킷 트레이닝', en: 'Full-body circuit training', zh: '全身循环训练' },
    disclaimer: {
      ko: '실제 F45 스튜디오 기구 서킷이 아니라, 그 방식을 맨몸운동으로 옮긴 버전입니다.',
      en: 'Not the real F45 studio equipment circuit — this adapts the format using bodyweight moves only.',
      zh: '并非真正的F45健身房器械循环，而是用徒手动作还原其形式的版本。',
    },
    schedule: ['full', 'core', 'rest', 'full', 'diet', 'full', 'rest'],
  },
  {
    id: 'diet3',
    weeks: 3,
    name: { ko: '다이어트 3주', en: '3-Week Fat Loss', zh: '3周减脂' },
    tagline: { ko: '체지방 감량에 초점을 둔 고강도 유산소 위주', en: 'High-intensity cardio focused on fat loss', zh: '以减脂为核心的高强度有氧' },
    schedule: ['diet', 'core', 'diet', 'rest', 'diet', 'cardio', 'rest'],
  },
  {
    id: 'muscle3',
    weeks: 3,
    name: { ko: '근성장 3주', en: '3-Week Muscle Build', zh: '3周增肌' },
    tagline: { ko: '상체·하체·코어를 나눠 자극하고 쉬는 날로 회복', en: 'Split upper/lower/core work with rest days to recover', zh: '分开刺激上肢、下肢、核心，并安排休息日恢复' },
    schedule: ['upper', 'lower', 'rest', 'core', 'upper', 'lower', 'rest'],
  },
  {
    id: 'lower3',
    weeks: 3,
    name: { ko: '하체 3주', en: '3-Week Lower Body', zh: '3周下肢' },
    tagline: { ko: '하체 위주, 중간에 코어 하루로 균형', en: 'Lower-body focused, with a core day for balance', zh: '以下肢为主，中间穿插核心日保持平衡' },
    schedule: ['lower', 'rest', 'lower', 'core', 'lower', 'rest', 'lower'],
  },
  {
    id: 'arm3',
    weeks: 3,
    name: { ko: '팔뚝살 3주', en: '3-Week Arm Slimming', zh: '3周瘦手臂' },
    tagline: { ko: '상체 근력 + 고강도 유산소로 팔 라인 정리', en: 'Upper-body strength + high-intensity cardio to tone the arms', zh: '上肢力量 + 高强度有氧，塑造手臂线条' },
    schedule: ['upper', 'diet', 'rest', 'upper', 'diet', 'upper', 'rest'],
  },
  {
    id: 'glute2',
    weeks: 2,
    name: { ko: '엉덩이 2주', en: '2-Week Glutes', zh: '2周臀部' },
    tagline: { ko: '힙브릿지·스쿼트·런지 등 둔근 위주 동작만 모았어요', en: 'Hip bridges, squats, lunges — glute-focused moves only', zh: '臀桥、深蹲、弓步等以臀部为主的动作' },
    schedule: ['glute', 'rest', 'glute', 'glute', 'rest', 'glute', 'rest'],
    bg: 'glute2.webp',
  },
  {
    id: 'hotnight',
    weeks: 2,
    name: { ko: '뜨거운 밤 2주', en: 'Hot Night 2-Week', zh: '火热之夜 2周' },
    tagline: { ko: '누워서 하는 하체·둔근 동작만 모았어요 — 매트만 있으면 됩니다', en: 'Lying-down lower-body and glute moves only — just need a mat', zh: '只挑选躺着做的下肢与臀部动作 — 有垫子就够了' },
    schedule: ['hotnight', 'rest', 'hotnight', 'hotnight', 'rest', 'hotnight', 'rest'],
  },
];
