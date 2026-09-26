// Q-Mission 데이터(2026-09-27) — 운동 밖의 작은 선행을 기록하는 카테고리 5개와
// 그 안의 미션 목록. "선행 점수" 로 사람을 평가하지 않는다 — 완료하면 그냥
// 기록되고 끝이다(아래 STATIC_UI.qmDoneToast 참고, 칭찬/평가 문구를 안 쓴다).
//
// 카테고리 순서가 곧 화면에 나오는 순서다. 늘릴 때는 category 키가
// QM_CATEGORIES 에 먼저 있어야 한다(미션 쪽에서 category 오타가 나도
// 조용히 안 보이는 대신 눈에 띄게 하려면 여기 목록과 대조해서 검사할
// 자리가 필요한데, 지금은 항목 수가 적어 손으로 맞춘다).
export const QM_CATEGORIES = [
  { key: 'env', icon: '🌱', label: { ko: '환경', en: 'Environment', zh: '环境' } },
  { key: 'people', icon: '🤝', label: { ko: '사람', en: 'People', zh: '人际' } },
  { key: 'community', icon: '🏘️', label: { ko: '지역사회', en: 'Community', zh: '社区' } },
  { key: 'health', icon: '❤️', label: { ko: '건강', en: 'Health', zh: '健康' } },
  { key: 'growth', icon: '📚', label: { ko: '성장·나눔', en: 'Growth & sharing', zh: '成长与分享' } },
];

// 하루 완료당 +Q. 값 자체보다 "기록됐다"가 중요하다는 게 이 기능의
// 원래 취지라 하나로 통일한다 — 미션마다 배점을 다르게 매기면 그 순간부터
// "어떤 선행이 더 가치있나"를 매기는 것이 된다.
export const QM_POINTS_PER_MISSION = 10;
// 하루에 추천하는 미션 개수.
export const QM_DAILY_PICK_COUNT = 3;

export const QM_MISSIONS = [
  // 🌱 환경
  { key: 'ENV_LITTER3', category: 'env', label: { ko: '길에 있는 쓰레기 3개 줍기', en: 'Pick up 3 pieces of litter', zh: '捡起路边3件垃圾' } },
  { key: 'ENV_TUMBLER', category: 'env', label: { ko: '텀블러 사용하기', en: 'Use a reusable tumbler', zh: '使用随行杯' } },
  { key: 'ENV_LESS_DISPOSABLE', category: 'env', label: { ko: '일회용품 하나 줄이기', en: 'Skip one disposable item', zh: '少用一次一次性用品' } },
  { key: 'ENV_WALK_NEARBY', category: 'env', label: { ko: '가까운 거리는 걸어가기', en: 'Walk instead of ride for short trips', zh: '短途选择步行' } },
  { key: 'ENV_RECYCLE', category: 'env', label: { ko: '분리배출 제대로 하기', en: 'Sort recycling properly', zh: '认真做好垃圾分类' } },
  { key: 'ENV_PARK_CLEAN', category: 'env', label: { ko: '공원·산책로 주변 정리하기', en: 'Tidy up a park or trail nearby', zh: '整理公园或步道周边' } },

  // 🤝 사람
  { key: 'PPL_GREET', category: 'people', label: { ko: '주변 사람에게 먼저 인사하기', en: 'Greet someone first', zh: '主动向身边的人打招呼' } },
  { key: 'PPL_CHECK_FRIEND', category: 'people', label: { ko: '친구에게 안부 묻기', en: "Check in on a friend", zh: '问候一位朋友' } },
  { key: 'PPL_CONTACT_FAMILY', category: 'people', label: { ko: '가족에게 연락하기', en: 'Reach out to family', zh: '联系家人' } },
  { key: 'PPL_HELP', category: 'people', label: { ko: '도움이 필요한 사람에게 도움 주기', en: 'Help someone who needs it', zh: '帮助需要帮助的人' } },
  { key: 'PPL_THANKS', category: 'people', label: { ko: '누군가에게 감사 표현하기', en: 'Express thanks to someone', zh: '向某人表达感谢' } },
  { key: 'PPL_WORKOUT_TOGETHER', category: 'people', label: { ko: '친구와 함께 운동하기', en: 'Work out with a friend', zh: '和朋友一起运动' } },

  // 🏘️ 지역사회
  { key: 'COM_SPORTS_EVENT', category: 'community', label: { ko: '지역 스포츠 행사 참여하기', en: 'Join a local sports event', zh: '参加本地体育活动' } },
  { key: 'COM_VOLUNTEER', category: 'community', label: { ko: '지역 봉사활동 참여하기', en: 'Join a local volunteer activity', zh: '参加本地志愿活动' } },
  { key: 'COM_FACILITY', category: 'community', label: { ko: '동네 체육시설 이용하기', en: 'Use a neighborhood sports facility', zh: '使用社区体育设施' } },
  { key: 'COM_LOCAL_SHOP', category: 'community', label: { ko: '지역 소상공인 이용하기', en: 'Support a local small business', zh: '光顾本地小商户' } },
  { key: 'COM_REPORT', category: 'community', label: { ko: '동네에 필요한 시설·문제 제보하기', en: 'Report a local issue or need', zh: '反映社区需要改善的问题' } },
  { key: 'COM_PUBLIC_CLEAN', category: 'community', label: { ko: '공공장소 정리하기', en: 'Tidy up a public space', zh: '整理公共场所' } },

  // ❤️ 건강
  { key: 'HTH_WORKOUT', category: 'health', label: { ko: '오늘 운동하기', en: 'Work out today', zh: '今天运动一下' } },
  { key: 'HTH_WALK30', category: 'health', label: { ko: '30분 걷기', en: 'Walk for 30 minutes', zh: '步行30分钟' } },
  { key: 'HTH_STRETCH', category: 'health', label: { ko: '충분히 스트레칭하기', en: 'Stretch properly', zh: '充分拉伸' } },
  { key: 'HTH_STAIRS', category: 'health', label: { ko: '엘리베이터 대신 계단 이용하기', en: 'Take the stairs instead of the elevator', zh: '用楼梯代替电梯' } },
  { key: 'HTH_MOVE_BREAK', category: 'health', label: { ko: '오래 앉아 있었다면 잠깐 움직이기', en: 'Move a bit after sitting too long', zh: '久坐后活动一下' } },
  { key: 'HTH_INVITE_WORKOUT', category: 'health', label: { ko: '친구에게 같이 운동하자고 제안하기', en: 'Invite a friend to work out', zh: '邀请朋友一起运动' } },

  // 📚 성장·나눔
  { key: 'GRW_SHARE_INFO', category: 'growth', label: { ko: '운동 정보 하나 공유하기', en: 'Share a piece of fitness info', zh: '分享一条运动信息' } },
  { key: 'GRW_TEACH', category: 'growth', label: { ko: '내가 아는 것을 다른 사람에게 알려주기', en: 'Teach someone something you know', zh: '把自己懂的知识教给别人' } },
  { key: 'GRW_GIVE_ITEM', category: 'growth', label: { ko: '사용하지 않는 물건 나눔하기', en: 'Give away something you no longer use', zh: '分享一件不再使用的物品' } },
  { key: 'GRW_RECOMMEND', category: 'growth', label: { ko: '책이나 좋은 콘텐츠 추천하기', en: 'Recommend a book or good content', zh: '推荐一本书或好内容' } },
  { key: 'GRW_CHEER', category: 'growth', label: { ko: '누군가의 활동을 응원하기', en: "Cheer on someone else's effort", zh: '为别人的努力加油' } },
];
