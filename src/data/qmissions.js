// Q-Mission 데이터(2026-09-27, 2026-09-28 재구성) — 운동 밖의 작은 선행을
// 기록하는 카테고리 5개와 그 안의 미션 목록. "선행 점수" 로 사람을 평가하지
// 않는다 — 완료하면 그냥 기록되고 끝이다 — 완료했다고 칭찬·평가하는
// 토스트 같은 것도 안 띄운다.
//
// 카테고리 순서가 곧 화면에 나오는 순서다. 늘릴 때는 category 키가
// QM_CATEGORIES 에 먼저 있어야 한다(미션 쪽에서 category 오타가 나도
// 조용히 안 보이는 대신 눈에 띄게 하려면 여기 목록과 대조해서 검사할
// 자리가 필요한데, 지금은 항목 수가 적어 손으로 맞춘다).
// 이모티콘은 안 쓴다(2026-09-27 요청) — 이 앱은 이미 한 번 이모지를
// 걷어낸 적이 있다(커밋 18479d2, "화면 CSS 전면 재작성: 이모지 제거").
// 카테고리는 아이콘 대신 이름표(.qm-cat-tag, screens.css)로만 구분한다.
export const QM_CATEGORIES = [
  { key: 'env', label: { ko: '환경', en: 'Environment', zh: '环境' } },
  { key: 'people', label: { ko: '사람', en: 'People', zh: '人际' } },
  { key: 'community', label: { ko: '지역사회', en: 'Community', zh: '社区' } },
  { key: 'health', label: { ko: '건강', en: 'Health', zh: '健康' } },
  { key: 'growth', label: { ko: '성장·나눔', en: 'Growth & sharing', zh: '成长与分享' } },
];

// 하루 완료당 +Q. 값 자체보다 "기록됐다"가 중요하다는 게 이 기능의
// 원래 취지라 하나로 통일한다 — 미션마다 배점을 다르게 매기면 그 순간부터
// "어떤 선행이 더 가치있나"를 매기는 것이 된다.
export const QM_POINTS_PER_MISSION = 10;
// 하루에 추천하는 미션 개수 — 운동 관련(health) 1개 + 그 밖의 카테고리에서
// 일반 2개(2026-09-27 요청 "운동 관련 하나 일반 하나"). 이 앱은 운동 앱이라
// 매일 최소 하나는 몸을 직접 움직이는 미션이 끼게 한다 — 나머지 자리는
// 순수하게 무작위라 다양성을 잃지 않는다.
export const QM_DAILY_PICK_COUNT = 3;
export const QM_DAILY_HEALTH_PICK_COUNT = 1;

// 2026-09-28 재구성 — "재미없다·실질적으로 도움 안 된다"는 지적에 따라
// 카테고리당 6개(총 30개)에서 10개(총 50개)로 늘리면서 아래 기준으로
// 골라냈다. 하루 3개를 무작위로 뽑는 구조라, 풀이 작으면 며칠 안 가
// 똑같은 조합만 반복해서 본다 — 늘린 것 자체가 "다양성" 요청에 대한
// 답이다.
//
//   1. 구체적이고 스스로 판단 가능할 것 — "도움이 필요한 사람에게 도움
//      주기"처럼 언제 완료됐다고 봐야 할지 모호한 것은 버렸다.
//   2. 오늘 할 수 있을 것 — "지역 스포츠 행사 참여하기"처럼 그런 행사가
//      열리는 날에만 할 수 있는 것은 버렸다. 랜덤으로 뽑혔는데 애초에
//      할 수 없는 날이 많으면 그 기능 자체가 무의미해진다.
//   3. 다른 미션과 안 겹칠 것 — "친구와 함께 운동하기"(사람)가
//      "친구에게 같이 운동하자고 제안하기"(건강)와, "공공장소
//      정리하기"(지역사회)가 "길에 있는 쓰레기 3개 줍기"(환경)와 사실상
//      같은 행동이라 한쪽만 남겼다.
//   4. 이 앱(운동 앱)이 이미 추적하는 것과 안 겹칠 것 — "오늘 운동하기"는
//      이 앱의 본 기능과 순환 참조라 빼고, 그 자리에 이 앱이 안 보는
//      수면·수분·화면습관 같은 걸 넣었다.
export const QM_MISSIONS = [
  // 환경
  { key: 'ENV_LITTER3', category: 'env', label: { ko: '길에 있는 쓰레기 3개 줍기', en: 'Pick up 3 pieces of litter', zh: '捡起路边3件垃圾' } },
  { key: 'ENV_TUMBLER', category: 'env', label: { ko: '텀블러 사용하기', en: 'Use a reusable tumbler', zh: '使用随行杯' } },
  { key: 'ENV_RECYCLE', category: 'env', label: { ko: '분리배출 제대로 하기', en: 'Sort recycling properly', zh: '认真做好垃圾分类' } },
  { key: 'ENV_WALK_NEARBY', category: 'env', label: { ko: '가까운 거리는 걸어가기', en: 'Walk instead of ride for short trips', zh: '短途选择步行' } },
  { key: 'ENV_BAG', category: 'env', label: { ko: '장바구니 챙겨서 장보기', en: 'Bring your own shopping bag', zh: '自带购物袋去买东西' } },
  { key: 'ENV_UNPLUG', category: 'env', label: { ko: '안 쓰는 플러그 뽑아두기', en: "Unplug devices you're not using", zh: '拔掉不用的电器插头' } },
  { key: 'ENV_REUSE_CONTAINER', category: 'env', label: { ko: '포장 주문할 때 다회용기 요청하기', en: 'Ask for a reusable container when ordering takeout', zh: '打包时要求使用可重复容器' } },
  { key: 'ENV_WATER_SAVE', category: 'env', label: { ko: '양치할 때 물 잠그기', en: 'Turn off the tap while brushing your teeth', zh: '刷牙时随手关水龙头' } },
  { key: 'ENV_TEMP', category: 'env', label: { ko: '냉난방 온도 1도 조절해서 에너지 아끼기', en: 'Adjust the thermostat by one degree to save energy', zh: '把空调温度调高或调低一度以节能' } },
  { key: 'ENV_PLANT_CARE', category: 'env', label: { ko: '화분이나 식물에 물 주기', en: 'Water a plant', zh: '给植物浇水' } },

  // 사람
  { key: 'PPL_GREET', category: 'people', label: { ko: '주변 사람에게 먼저 인사하기', en: 'Greet someone first', zh: '主动向身边的人打招呼' } },
  { key: 'PPL_CHECK_FRIEND', category: 'people', label: { ko: '친구에게 안부 묻기', en: 'Check in on a friend', zh: '问候一位朋友' } },
  { key: 'PPL_CONTACT_FAMILY', category: 'people', label: { ko: '가족에게 연락하기', en: 'Reach out to family', zh: '联系家人' } },
  { key: 'PPL_THANKS', category: 'people', label: { ko: '누군가에게 감사 표현하기', en: 'Express thanks to someone', zh: '向某人表达感谢' } },
  { key: 'PPL_COMPLIMENT', category: 'people', label: { ko: '진심 어린 칭찬 한마디 건네기', en: 'Give someone a genuine compliment', zh: '真诚地夸奖一个人' } },
  { key: 'PPL_SEAT', category: 'people', label: { ko: '대중교통에서 자리 양보하기', en: 'Offer your seat on public transit', zh: '在公共交通上让座' } },
  { key: 'PPL_HOLD_DOOR', category: 'people', label: { ko: '뒷사람을 위해 문 잡아주기', en: 'Hold the door open for the person behind you', zh: '为后面的人扶住门' } },
  { key: 'PPL_LISTEN', category: 'people', label: { ko: '누군가의 이야기를 끝까지 들어주기', en: "Listen to someone's story without interrupting", zh: '耐心听完某人把话说完' } },
  { key: 'PPL_OLD_FRIEND', category: 'people', label: { ko: '한동안 연락 못한 사람에게 먼저 연락하기', en: "Reach out first to someone you haven't talked to in a while", zh: '主动联系一位许久没联系的人' } },
  { key: 'PPL_HELP_CARRY', category: 'people', label: { ko: '무거운 짐 든 사람 도와주기', en: 'Help someone carrying something heavy', zh: '帮拿着重物的人一把' } },

  // 지역사회
  { key: 'COM_VOLUNTEER', category: 'community', label: { ko: '지역 봉사활동 참여하기', en: 'Join a local volunteer activity', zh: '参加本地志愿活动' } },
  { key: 'COM_FACILITY', category: 'community', label: { ko: '동네 체육시설 이용하기', en: 'Use a neighborhood sports facility', zh: '使用社区体育设施' } },
  { key: 'COM_LOCAL_SHOP', category: 'community', label: { ko: '지역 소상공인 이용하기', en: 'Support a local small business', zh: '光顾本地小商户' } },
  { key: 'COM_REPORT', category: 'community', label: { ko: '동네에 필요한 시설·문제 제보하기', en: 'Report a local issue or need', zh: '反映社区需要改善的问题' } },
  { key: 'COM_REVIEW', category: 'community', label: { ko: '자주 가는 동네 가게에 좋은 리뷰 남기기', en: 'Leave a good review for a local shop you like', zh: '给常去的本地店铺写一条好评' } },
  { key: 'COM_BLOOD', category: 'community', label: { ko: '헌혈하기', en: 'Donate blood', zh: '献血' } },
  { key: 'COM_LIBRARY', category: 'community', label: { ko: '도서관 같은 공공시설 이용하기', en: 'Use a public facility like a library', zh: '使用图书馆等公共设施' } },
  { key: 'COM_DONATE', category: 'community', label: { ko: '소액이라도 기부하기', en: 'Make a small donation', zh: '哪怕金额不大也进行一次捐赠' } },
  { key: 'COM_NEIGHBOR_HELP', category: 'community', label: { ko: '이웃의 작은 부탁 들어주기(택배 대신 받기 등)', en: 'Do a small favor for a neighbor (like receiving a package)', zh: '帮邻居一个小忙(比如代收快递)' } },
  { key: 'COM_LOCAL_ORG', category: 'community', label: { ko: '지역 모임이나 동호회에 참여하기', en: 'Join a local club or community group', zh: '参加本地社团或兴趣小组' } },

  // 건강
  { key: 'HTH_WALK30', category: 'health', label: { ko: '30분 걷기', en: 'Walk for 30 minutes', zh: '步行30分钟' } },
  { key: 'HTH_STRETCH', category: 'health', label: { ko: '충분히 스트레칭하기', en: 'Stretch properly', zh: '充分拉伸' } },
  { key: 'HTH_STAIRS', category: 'health', label: { ko: '엘리베이터 대신 계단 이용하기', en: 'Take the stairs instead of the elevator', zh: '用楼梯代替电梯' } },
  { key: 'HTH_MOVE_BREAK', category: 'health', label: { ko: '오래 앉아 있었다면 잠깐 움직이기', en: 'Move a bit after sitting too long', zh: '久坐后活动一下' } },
  { key: 'HTH_INVITE_WORKOUT', category: 'health', label: { ko: '친구에게 같이 운동하자고 제안하기', en: 'Invite a friend to work out', zh: '邀请朋友一起运动' } },
  { key: 'HTH_WATER', category: 'health', label: { ko: '물 충분히 마시기', en: 'Drink enough water', zh: '喝足够的水' } },
  { key: 'HTH_SLEEP_EARLY', category: 'health', label: { ko: '오늘은 일찍 잠자리에 들기', en: 'Go to bed early tonight', zh: '今晚早点睡' } },
  { key: 'HTH_BREAKFAST', category: 'health', label: { ko: '아침 챙겨 먹기', en: 'Eat breakfast', zh: '好好吃一顿早餐' } },
  { key: 'HTH_SCREEN_BEFORE_BED', category: 'health', label: { ko: '자기 전 스마트폰 멀리하기', en: 'Put your phone away before bed', zh: '睡前远离手机' } },
  { key: 'HTH_MEDITATE', category: 'health', label: { ko: '5분 동안 심호흡하거나 명상하기', en: 'Take 5 minutes to breathe deeply or meditate', zh: '花5分钟深呼吸或冥想' } },

  // 성장·나눔
  { key: 'GRW_SHARE_INFO', category: 'growth', label: { ko: '운동 정보 하나 공유하기', en: 'Share a piece of fitness info', zh: '分享一条运动信息' } },
  { key: 'GRW_GIVE_ITEM', category: 'growth', label: { ko: '사용하지 않는 물건 나눔하기', en: 'Give away something you no longer use', zh: '分享一件不再使用的物品' } },
  { key: 'GRW_RECOMMEND', category: 'growth', label: { ko: '책이나 좋은 콘텐츠 추천하기', en: 'Recommend a book or good content', zh: '推荐一本书或好内容' } },
  { key: 'GRW_CHEER', category: 'growth', label: { ko: "누군가의 활동을 응원하기", en: "Cheer on someone else's effort", zh: '为别人的努力加油' } },
  { key: 'GRW_LEARN_NOTE', category: 'growth', label: { ko: '오늘 배운 것 한 가지 메모하기', en: 'Write down one thing you learned today', zh: '记下今天学到的一件事' } },
  { key: 'GRW_READ', category: 'growth', label: { ko: '책 10쪽 읽기', en: 'Read 10 pages of a book', zh: '读10页书' } },
  { key: 'GRW_GRATITUDE', category: 'growth', label: { ko: '감사한 일 한 가지 적어보기', en: "Write down one thing you're grateful for", zh: '写下一件值得感恩的事' } },
  { key: 'GRW_NEW_TRY', category: 'growth', label: { ko: '평소 안 해본 것 하나 시도해보기', en: "Try something you haven't done before", zh: '尝试一件平时没做过的事' } },
  { key: 'GRW_GOAL_CHECK', category: 'growth', label: { ko: '이번 주 목표 하나 점검하기', en: "Check in on one of this week's goals", zh: '检视一个本周的目标' } },
  { key: 'GRW_DIGITAL_DETOX', category: 'growth', label: { ko: '디지털 기기 없이 20분 보내기', en: 'Spend 20 minutes without any digital devices', zh: '不使用任何电子设备度过20分钟' } },
];
