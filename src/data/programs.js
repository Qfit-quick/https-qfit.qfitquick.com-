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

// '스파이더맨 Cindy' 1주(2026-09-19) — 크로스핏 벤치마크 WOD 'Cindy'를
// 그대로 옮겼다: 20분 AMRAP(정해진 시간 안에 최대한 많이 반복)로 풀업
// 5·푸쉬업 10·스쿼트 15 를 한 바퀴로 계속 돈다. 위 프로그램들처럼 요일마다
// 다른 초점을 골라 pool 에서 동작을 뽑는 게 아니라 매일 똑같은 고정
// 서킷이라 schedule/focus 로 표현할 수 없다 — programDayPlan() 은 이
// 프로그램을 보지 않고, ui/amrap.js 가 amrap 필드를 직접 읽어 돈다.
//
// PULLUP 은 EXERCISES(exercises.js, 기구 없는 맨몸운동 24종)에 없다 —
// 철봉이 있어야 하는 유일한 동작이라 이 앱의 '기구 없이' 전제와 안 맞고,
// EXERCISES 에 넣으면 다른 모든 프로그램·계획의 무작위 로테이션에도
// 섞여 나간다. 그래서 이 배열 안에서만 쓰는 가벼운 항목이고, 영상 대신
// challengeIcons.js 의 픽토그램을 쓴다(ui/amrap.js). sub 는 철봉이
// 없을 때 대신할 동작 — 이미 있는 BURPEE 를 그대로 쓴다.
export const CINDY_MOVES = [
  { key: 'PULLUP', reps: 5, sub: 'BURPEE',
    label: { ko: '풀업', en: 'Pull-up', zh: '引体向上' } },
  { key: 'PUSHUP', reps: 10 },
  { key: 'SQUAT', reps: 15 },
];

// QCE(Qfit Championship Event) 실전 서킷(2026-09-19, 2026-09-21 8종목 갱신) —
// 대회 기획 문서 "3. 큐핏 대회 프로그램 설계"의 8개 스테이션을 연습용으로
// 옮겼다. Cindy(amrap)와 다른 점: 이건 '반복'이 아니라 '한 바퀴'다 — 8개를
// 순서대로 한 번씩 지나가고 걸린 시간을 잰다(실제 대회의 '완주 기록'과
// 같은 개념). 그래서 type 을 'circuit' 으로 따로 두고, ui/circuit.js 가 이
// 필드를 읽어 스테이션을 순서대로 넘기며 스톱워치(0초부터 올라감)를 돈다.
//
// 실제 QCE 대회(qceRulebook.js)와 두 곳이 다르다 — 셔틀런은 왕복 트랙,
// 베어크롤은 바닥 이동 공간이 있어야 하는데 이 앱은 손 안에서 하는
// 연습용이라 그 둘만 제자리 달리기·마운틴클라이머로 대체했다. 나머지
// 여섯은 대회와 완전히 같다.
//
// PLANKJACK·JUMPLUNGE 는 PULLUP(위 CINDY_MOVES 주석 참고)과 같은 이유로
// EXERCISES 24종에 없다 — 이 자리 하나 쓰자고 시연 영상을 새로 찍어야
// 하는데 없어서, ui/circuit.js 가 영상 대신 challengeIcons.js 의 픽토그램을
// 쓴다. label 을 여기 직접 적어 두는 것도 PULLUP과 같은 이유 — EXERCISES 에
// 없으니 그쪽에서 이름을 못 가져온다.
export const QCE_STATIONS = [
  { key: 'RUNINPLACE', mode: 'time', target: 45 },
  { key: 'BURPEE', mode: 'reps', target: 15 },
  { key: 'JUMPSQUAT', mode: 'reps', target: 20 },
  { key: 'PUSHUP', mode: 'reps', target: 15 },
  { key: 'MOUNTAINCLIMBER', mode: 'time', target: 30 },
  { key: 'PLANKJACK', mode: 'reps', target: 20, met: 6.5,
    label: { ko: '플랭크잭', en: 'Plank Jack', zh: '平板开合跳' } },
  { key: 'JUMPLUNGE', mode: 'reps', target: 20, met: 8.0,
    label: { ko: '점프런지', en: 'Jump Lunge', zh: '跳跃弓步' } },
  { key: 'VUP', mode: 'reps', target: 20 },
];

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
    bg: 'diet3.webp',
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
    bg: 'lower3.webp',
  },
  {
    id: 'arm3',
    weeks: 3,
    name: { ko: '팔뚝살 3주', en: '3-Week Arm Slimming', zh: '3周瘦手臂' },
    tagline: { ko: '상체 근력 + 고강도 유산소로 팔 라인 정리', en: 'Upper-body strength + high-intensity cardio to tone the arms', zh: '上肢力量 + 高强度有氧，塑造手臂线条' },
    schedule: ['upper', 'diet', 'rest', 'upper', 'diet', 'upper', 'rest'],
    bg: 'arm3.webp',
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
    id: 'cindy1',
    weeks: 1,
    type: 'amrap',
    name: { ko: '스파이더맨 Cindy 1주', en: 'Spider-Man Cindy 1-Week', zh: '蜘蛛侠 Cindy 1周' },
    tagline: { ko: '20분 AMRAP · 풀업 5·푸쉬업 10·스쿼트 15를 계속 반복', en: '20-min AMRAP: 5 pull-ups, 10 push-ups, 15 squats on repeat', zh: '20分钟AMRAP：引体5·俯卧撑10·深蹲15循环' },
    disclaimer: {
      ko: '철봉이 없으면 화면에서 풀업 대신 버피로 바꿀 수 있습니다.',
      en: 'No pull-up bar? You can swap in burpees from the workout screen.',
      zh: '没有单杠？可以在训练画面中换成波比跳。',
    },
    amrap: { capMin: 20, moves: CINDY_MOVES },
    schedule: ['amrap', 'amrap', 'amrap', 'amrap', 'amrap', 'amrap', 'amrap'],
  },
  {
    id: 'qce1',
    weeks: 1,
    type: 'circuit',
    name: { ko: 'QCE 실전 서킷', en: 'QCE Race Circuit', zh: 'QCE 实战循环' },
    tagline: { ko: '8개 스테이션 한 바퀴 · 완주 기록 재기', en: '8 stations, one lap — time your finish', zh: '8个站点一圈 · 记录完赛时间' },
    disclaimer: {
      ko: '실제 QCE 대회 8종목 중 셔틀런·베어크롤은 공간 제약으로 제자리 달리기·마운틴클라이머로 대체했고, 나머지 6종목은 대회와 같습니다.',
      en: 'Shuttle run and bear crawl are swapped for run-in-place and mountain climbers due to space limits; the other 6 stations match the real QCE competition.',
      zh: '受空间限制，将穿梭跑和熊爬替换为原地跑和登山跑，其余6个项目与真实QCE比赛相同。',
    },
    circuit: { stations: QCE_STATIONS },
    schedule: ['circuit', 'circuit', 'circuit', 'circuit', 'circuit', 'circuit', 'circuit'],
  },
  {
    id: 'hotnight',
    weeks: 2,
    name: { ko: '뜨거운 밤 2주', en: 'Hot Night 2-Week', zh: '火热之夜 2周' },
    tagline: { ko: '연인과 뜨겁게 — 침대 위에서도 할 수 있는 동작만 모았어요', en: 'Get hot with your partner — moves you can do right in bed', zh: '与恋人一起升温 — 床上就能完成的动作' },
    schedule: ['hotnight', 'rest', 'hotnight', 'hotnight', 'rest', 'hotnight', 'rest'],
  },
];
