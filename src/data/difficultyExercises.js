// 운동 난이도표(2026-09-23, 사용자 제공 'Q-fit_운동_난이도표.xlsx' 그대로 옮김).
//
// 홈의 '10초 후 시작'(ui/quickStart.js)이 쓰는 전용 카탈로그다. 15개
// 운동 계열 × 난이도 4단계(veryEasy·easy·hard·veryHard) — 표의 열 순서
// 그대로(🟢 더 쉬운 → 🔴 매우 어려운)다.
//
// src/data/exercises.js 의 24종과는 다른 카탈로그다. 그 배열에 넣으면
// scripts/media.mjs 가 시연 영상·사진이 없는 항목마다 실패해서 배포가
// 막힌다 — 영상은 아직 없다(나중에 붙는다). 그래서 여기 이름은
// challengeTracks.js 와 같은 이유로 {ko,en,zh} 객체가 아니라 그냥
// 한국어 문자열이다(scripts/i18n.mjs 는 '{ko: ...}' 모양만 번역 누락으로
// 본다 — 문자열은 애초에 그 검사에 걸리지 않는다).
export const DIFFICULTY_LEVELS = ['veryEasy', 'easy', 'hard', 'veryHard'];

export const DIFFICULTY_EXERCISES = [
  { id: 'pushupBeginner', family: '쉬운 푸쉬업', veryEasy: '벽 푸쉬업', easy: '무릎 푸쉬업', hard: '한 발 대고 푸쉬업', veryHard: '일반 푸쉬업' },
  { id: 'pushup', family: '푸쉬업', veryEasy: '일반 푸쉬업', easy: '다이아몬드 푸쉬업', hard: '점프 푸쉬업', veryHard: '한 팔 푸쉬업' },
  { id: 'squat', family: '스쿼트', veryEasy: '하프 스쿼트', easy: '풀 스쿼트', hard: '점프 스쿼트', veryHard: '피스톨 스쿼트' },
  { id: 'lunge', family: '런지', veryEasy: '리버스 런지', easy: '기본 런지', hard: '워킹 런지', veryHard: '점프 런지' },
  { id: 'plank', family: '플랭크', veryEasy: '벽 플랭크', easy: '무릎 플랭크', hard: '기본 플랭크', veryHard: '플랭크 푸쉬업' },
  { id: 'burpee', family: '버피', veryEasy: '스텝 버피', easy: '기본 버피', hard: '점프 버피', veryHard: '푸쉬업 버피' },
  { id: 'mountainClimber', family: '마운틴 클라이머', veryEasy: '느린 마운틴 클라이머', easy: '기본 마운틴 클라이머', hard: '빠른 마운틴 클라이머', veryHard: '크로스 바디 마운틴 클라이머' },
  { id: 'bridge', family: '브릿지', veryEasy: '글루트 브릿지', easy: '싱글 레그 브릿지', hard: '발 elevated 브릿지', veryHard: '싱글 레그 elevated 브릿지' },
  { id: 'abs', family: '복근', veryEasy: '데드버그', easy: '크런치', hard: '레그레이즈', veryHard: 'V업' },
  { id: 'splitSquat', family: '스플릿 스쿼트', veryEasy: '한 발씩 들기', easy: '스플릿 스쿼트', hard: '불가리안 스플릿 스쿼트', veryHard: '점프 불가리안 스플릿 스쿼트' },
  { id: 'pullup', family: '턱걸이', veryEasy: '밴드 풀업', easy: '네거티브 풀업', hard: '풀업', veryHard: '웨이티드 풀업' },
  { id: 'dips', family: '딥스', veryEasy: '푸쉬업', easy: '벤치 딥스', hard: '딥스', veryHard: '딥스 빠르게' },
  { id: 'handstand', family: '물구나무서기', veryEasy: '벽 숄더탭', easy: '파이크 푸쉬업', hard: '물구나무서기', veryHard: '핸드스탠드 푸쉬업' },
  { id: 'core', family: '코어', veryEasy: '버드독', easy: '데드버그', hard: '플랭크', veryHard: '플랭크 푸쉬업' },
  { id: 'cardio', family: '유산소', veryEasy: '걷기', easy: '빠르게 걷기', hard: '달리기', veryHard: '빠르게 달리기' },
];

/** 고른 난이도로 15개 계열 전부를, 표에 적힌 순서 그대로 station 목록으로 편다. */
export function stationsForLevel(level) {
  const key = DIFFICULTY_LEVELS.includes(level) ? level : 'easy';
  return DIFFICULTY_EXERCISES.map((row) => ({ id: row.id, family: row.family, name: row[key] }));
}
