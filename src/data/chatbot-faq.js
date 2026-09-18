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
  {
    keywords: ['코치', 'coach'],
    answer: { ko: '성격이 다른 코치 5명 중 하나를 골라 운동 중 응원 말을 들을 수 있어요. 설정에서 바꿀 수 있어요.', en: 'Pick one of 5 coaches with different personalities to cheer you on during workouts — change it anytime in Settings.', zh:'可以从5位性格不同的教练中选一位，训练时听他的加油语，设置里随时可换。' },
  },

  // 2026-09-18 확장("챗봇이 아직 부족한 것 같아") — 더보기·설정 안의
  // 기능들이 하나도 안 걸리고 있었다. app/index.html 의 settings-screen ·
  // plan-screen · challenge-screen 을 다시 훑어서 실제 있는 기능만 적었다.
  {
    keywords: ['배경음악', '효과음', 'bgm', 'sfx', '소리설정'],
    answer: { ko: '설정 > 소리·진동에서 배경음악과 효과음을 각각 켜고 끌 수 있어요.', en: 'In Settings > Sound & Vibration, you can turn background music and sound effects on or off separately.', zh:'在设置>声音与振动里，可以分别开关背景音乐和音效。' },
  },
  {
    keywords: ['진동', 'vibration', 'vibrate'],
    answer: { ko: '설정 > 소리·진동에서 진동을 켜면 소리를 꺼도 박자를 느낄 수 있어요.', en: 'Turn on vibration in Settings so you can still feel the rhythm even with sound off.', zh:'在设置里开启振动，静音时也能感受到节奏。' },
  },
  {
    keywords: ['코치목소리', '코치보이스', '낮은톤', '높은톤'],
    answer: { ko: '설정 > 소리·진동에서 코치 목소리를 낮은 톤/높은 톤 중 고를 수 있어요.', en: "In Settings, you can pick the coach's voice — a lower or higher tone.", zh:'在设置里可以选择教练的声音——低音或高音。' },
  },
  {
    keywords: ['다크모드', '화면색상', 'darkmode', 'theme'],
    answer: { ko: '설정 > 표시에서 화면 색상을 조정할 수 있어요. 기본은 기기 설정을 그대로 따라가요.', en: "You can adjust the screen's color theme in Settings > Display — it follows your device setting by default.", zh:'在设置>显示里可以调整配色，默认跟随设备系统设置。' },
  },
  {
    keywords: ['글자크기', 'fontsize'],
    answer: { ko: '설정 > 표시에서 글자 크기를 조정할 수 있어요.', en: 'You can adjust the text size in Settings > Display.', zh:'在设置>显示里可以调整字体大小。' },
  },
  {
    keywords: ['내보내기', 'csv', 'export'],
    answer: { ko: '설정 > 계정의 "기록 내보내기"에서 운동 기록을 CSV 파일로 받을 수 있어요.', en: 'Use "Export records" in Settings > Account to download your workout history as a CSV file.', zh:'在设置>账户的"导出记录"里，可以把训练记录下载为CSV文件。' },
  },
  {
    keywords: ['데이터삭제', '전체삭제', 'wipe'],
    answer: { ko: '설정 > 계정의 "데이터 삭제"에서 모든 기록을 지울 수 있어요. 되돌릴 수 없으니 신중하게 눌러주세요.', en: '"Delete data" in Settings > Account erases all your records — this can\'t be undone.', zh:'设置>账户里的"删除数据"会清除所有记录，无法恢复，请谨慎操作。' },
  },
  {
    keywords: ['프리미엄', 'premium'],
    answer: { ko: '설정 맨 위 "프리미엄" 줄을 누르면 프리미엄 전용 동작 등을 미리 볼 수 있어요.', en: 'Tap the "Premium" row at the top of Settings to preview premium-only exercises and features.', zh:'点击设置最上方的"高级会员"一栏，可以预览高级专属动作等内容。' },
  },
  {
    keywords: ['홈화면추가', '앱설치', 'install'],
    answer: { ko: '설정에서 "홈 화면에 추가"를 누르면 앱처럼 더 빠르게 열 수 있어요. 이미 설치되어 있으면 이 줄은 안 보여요.', en: 'Tap "Add to Home Screen" in Settings to open Q-fit like a real app — this row is hidden once it\'s already installed.', zh:'在设置里点"添加到主屏幕"，就能像真正的App一样快速打开。已安装的话这一栏不会显示。' },
  },
  {
    keywords: ['루틴', '저장한루틴'],
    answer: { ko: '완주한 운동 조합을 "내 루틴"으로 저장해 두면, 더보기 > 내 루틴에서 그대로 다시 시작할 수 있어요.', en: 'Save a completed combo as one of "My Routines" — restart it anytime from More > My Routines.', zh:'把完成过的动作组合保存为"我的常规"，之后可以在更多>我的常规里直接重新开始。' },
  },
  {
    keywords: ['목표화면', '내계획', '주간운동', '식단짜기', '내숫자'],
    answer: { ko: '신체정보를 넣으면 "목표" 탭에서 오늘 계획 · 주간 운동 · 식단 · 내 숫자(필요 열량 등)를 볼 수 있어요.', en: 'Once you enter your body info, the "Goals" tab shows today\'s plan, a weekly workout plan, a diet plan, and your numbers (like daily calorie needs).', zh:'填写身体信息后，"目标"标签会显示今日计划、每周训练、饮食计划和你的各项数值(如每日所需热量)。' },
  },
  {
    keywords: ['도전', '챌린지', 'challenge'],
    answer: { ko: '"도전" 탭에서 턱걸이 · 플란체 · 핸드스탠드 · 머슬업 · 프론트레버 · 딥스 · 사이드스플릿, 7개 장기 챌린지의 진행 상황을 주차별로 기록할 수 있어요.', en: 'The "Challenge" tab tracks weekly progress on 7 long-term skill goals: pull-up, planche, handstand, muscle-up, front lever, dips, and side split.', zh:'"挑战"标签可以按周记录7项长期目标的进度：引体向上、俯卧撑支撑(Planche)、倒立、双力臂、前水平、双杠臂屈伸、横叉。' },
  },
  {
    keywords: ['신체정보', '키체중'],
    answer: { ko: '더보기 > 신체정보에서 키 · 체중 · 나이를 넣으면 칼로리 계산과 "목표" 탭 계획이 더 정확해져요.', en: 'Enter your height, weight, and age under More > Body Info to make calorie estimates and the Goals plan more accurate.', zh:'在更多>身体信息里填写身高、体重、年龄，卡路里估算和"目标"计划会更准确。' },
  },
  {
    keywords: ['친구초대', '초대', 'invite'],
    answer: { ko: '로그인한 뒤 더보기에서 친구를 초대하면, 친구가 내 링크로 가입해 3분 운동을 끝냈을 때 나와 친구 모두 한정판 뱃지를 받아요.', en: "After logging in, invite a friend from the More screen — once they sign up with your link and finish a 3-minute workout, you both get a limited badge.", zh:'登录后可以在"更多"里邀请好友，好友用你的链接注册并完成一次3分钟训练后，双方都会获得限定徽章。' },
  },
  {
    keywords: ['준비운동', '워밍업', 'warmup'],
    answer: { ko: '설정 > 운동에서 "준비운동 먼저 하기"를 켜면 시작할 때마다 약 1분 준비운동이 먼저 나와요. 부상 위험을 줄여줘요.', en: 'Turn on "Warm up first" in Settings > Workout to get a ~1-minute warm-up before every session — it cuts injury risk.', zh:'在设置>训练里开启"先热身"，每次开始前都会先做约1分钟热身，能降低受伤风险。' },
  },
  {
    keywords: ['기본세트', '세트수'],
    answer: { ko: '설정 > 운동에서 기본 세트 수를 정해두면, 시작 화면에서 세트 수가 미리 채워져 있어요.', en: 'Set your default number of sets in Settings > Workout so the start screen is pre-filled with it.', zh:'在设置>训练里设定默认组数，开始页面就会自动帮你填好。' },
  },
];

// 2026-09-17 요청("큐핏에 해당하는 내용은 뭐든 검색하면 자연스럽게
// 안내") — 업적은 achievements.js 의 check() 가 함수라 글로 옮겨 적어야
// 한다. id 로 achievements.js 와 잇는다(같은 이유로 두 곳에 안 두는
// 원칙과 다르게, 이건 애초에 글로 된 원본이 없어서 여기서 새로 쓴다).
export const ACHIEVEMENT_HINTS = {
  first: { ko: '운동을 한 번이라도 완주하면 얻어요.', en: 'Finish just one workout to earn it.', zh:'完成一次训练即可获得。' },
  streak3: { ko: '3일 연속으로 운동하면 얻어요.', en: 'Work out 3 days in a row to earn it.', zh:'连续训练3天即可获得。' },
  time10: { ko: '운동 시간을 합쳐서 10분을 채우면 얻어요.', en: 'Earn it once your total workout time reaches 10 minutes.', zh:'累计训练时长达到10分钟即可获得。' },
  total100: { ko: '운동을 100번 완주하면 얻어요.', en: 'Complete 100 workout sessions to earn it.', zh:'累计完成100次训练即可获得。' },
  cal1000: { ko: '태운 칼로리를 합쳐서 1000kcal를 채우면 얻어요.', en: 'Burn a cumulative 1000 kcal to earn it.', zh:'累计消耗1000千卡即可获得。' },
  comeback: { ko: '며칠 쉬었다가 다시 돌아오면 얻어요.', en: 'Come back after taking a break to earn it.', zh:'休息几天后回归训练即可获得。' },
};

/** 문장 안에 키워드가 있나. 공백을 지우고 소문자로 맞춰 비교한다 —
 *  "몇 분" 과 "몇분" 을 같은 것으로 본다. */
export function matchesKeyword(text, keyword) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  return norm(text).includes(norm(keyword));
}
