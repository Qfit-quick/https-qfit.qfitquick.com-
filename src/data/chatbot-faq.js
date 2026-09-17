// 챗봇의 "앱 사용법" 대답 목록.
//
// 실제 AI 가 아니라 키워드를 맞춰 정해진 답을 돌려주는 안내다(2026-09-17
// 요청). 부위별 대처법·회복 습관은 이미 있는 src/data/recovery.js 를
// src/ui/chatbot.js 가 직접 읽어서 답하므로 여기 다시 적지 않는다 — 같은
// 내용이 두 곳에 있으면 언젠가 한쪽만 고쳐서 서로 어긋난다.
//
// keywords 는 소문자·공백 없이 비교한다(matchesKeyword 참고) — 사용자가
// 띄어쓰기를 다르게 하거나 대소문자를 섞어도 걸리게 하기 위해서다.

export const CHATBOT_FAQ = [
  {
    keywords: ['얼마나걸려', '몇분', '시간', 'howlong', 'minutes'],
    answer: { ko: '1분이면 끝나는 짧은 운동이에요. 세트 수와 강도는 시작 화면에서 직접 고를 수 있어요.', en: 'Sessions are as short as one minute — you can pick the number of sets and intensity on the start screen.', zh:'最短1分钟就能完成。可以在开始页面自己选组数和强度。' },
  },
  {
    keywords: ['회원가입', '로그인', 'signup', 'login', '계정'],
    answer: { ko: '홈 화면 오른쪽 위 "로그인"에서 이메일로 가입하면, 기기를 바꾸거나 앱을 지워도 기록이 이어져요.', en: 'Tap "Log in" at the top of the home screen to sign up with email — your progress then follows you across devices.', zh:'点主页右上角"登录"用邮箱注册，换设备也能保留记录。' },
  },
  {
    keywords: ['칼로리', 'calorie', 'kcal'],
    answer: { ko: '운동 중 움직임과 입력하신 체중을 바탕으로 대략 계산해요. 병원 측정처럼 정확한 값은 아니에요.', en: 'Calories are an estimate based on your workout and the body weight you entered — not a medical-grade measurement.', zh:'根据训练动作和你填写的体重大致估算，不是医用精确数值。' },
  },
  {
    keywords: ['연속', '스트릭', 'streak'],
    answer: { ko: '오늘 운동이나 식단 체크를 하면 연속 기록이 하루 늘어나요. 하루를 완전히 거르면 다음날 1부터 다시 시작해요.', en: 'Checking off a workout or your diet today adds one day to your streak. Missing a full day resets it back to 1.', zh:'今天完成运动或饮食打卡，连续天数就+1；完全错过一天会重新从1开始。' },
  },
  {
    keywords: ['알림', '푸시', 'notification', 'push', '리마인더'],
    answer: { ko: '설정 화면에서 알림을 껐다 켰다 할 수 있어요. 켜 두면 4일 넘게 쉴 때 한 번 알려드려요.', en: 'You can turn notifications on or off in Settings. When on, you get a nudge once after 4 days off.', zh:'可以在设置里开关通知。开启后，超过4天没练会提醒你一次。' },
  },
  {
    keywords: ['xp', '레벨', 'level', '경험치'],
    answer: { ko: '운동을 완주할 때마다 XP를 얻어요. 100XP마다 레벨이 하나 올라가요.', en: 'You earn XP every time you finish a workout — every 100 XP is one level up.', zh:'每完成一次训练就获得经验值(XP)，每100点升一级。' },
  },
  {
    keywords: ['프로그램', 'program'],
    answer: { ko: '여러 날짜로 짜인 운동 프로그램을 홈이나 프로그램 탭에서 골라 시작할 수 있어요.', en: 'You can pick a multi-day workout program from the home screen or the Programs tab.', zh:'可以在主页或"程序"标签里选择多天的训练计划开始。' },
  },
  {
    keywords: ['만보기', '걸음', 'steps', 'pedometer', '만보'],
    answer: { ko: '체크(기록지) 화면에서 걸음 수를 직접 적거나, "측정 시작"을 눌러 이 화면이 열려 있는 동안 대략 셀 수 있어요. 화면을 벗어나면 측정이 멈춰요.', en: 'On the Check-in screen you can type your step count, or tap "Start" to count steps while that screen stays open — it stops if you leave.', zh:'在打卡页面可以直接输入步数，也可以点"开始测量"在页面打开时计步，离开页面会停止。' },
  },
  {
    keywords: ['물', '수분', 'water'],
    answer: { ko: '체크(기록지) 화면의 물병을 눌러서 100mL씩 채울 수 있어요. 하루 권장은 2L예요.', en: 'Tap the bottle on the Check-in screen to log 100mL at a time — the daily target is 2L.', zh:'在打卡页面点水瓶，每次记录100mL，每日目标2L。' },
  },
  {
    keywords: ['안녕', 'hi', 'hello', '하이'],
    answer: { ko: '안녕하세요! 운동·회복·앱 사용법 중 궁금한 걸 물어보세요.', en: 'Hi! Ask me anything about workouts, recovery, or how the app works.', zh:'你好！可以问我训练、恢复或使用方法方面的问题。' },
  },
];

/** 문장 안에 키워드가 있나. 공백을 지우고 소문자로 맞춰 비교한다 —
 *  "몇 분" 과 "몇분" 을 같은 것으로 본다. */
export function matchesKeyword(text, keyword) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  return norm(text).includes(norm(keyword));
}
