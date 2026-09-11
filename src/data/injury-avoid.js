// 부위별로 피할 동작.
//
// 새 의학적 판단을 더하는 게 아니라, recovery.js 의 INJURY_GUIDES 가 이미
// '흔한 원인'에 적어 둔 동작들을 코드가 읽을 수 있게 옮긴 것이다. 원문이
// "푸쉬업류"·"푸쉬업 계열"·"스쿼트류"처럼 계열로 묶어 말한 곳만 같은
// 계열의 동작 전부로 펼쳤고, 그 밖에는 원문에 이름이 나온 동작만 담았다.
// 부위 id 는 recovery.js 의 INJURY_GUIDES[].id 와 같다.
//
// 이 목록이 회피 목록의 전부이자 근거다 — recovery.js 의 '흔한 원인'
// 문장이 바뀌면 여기도 같이 바뀌어야 한다.
export const INJURY_AVOID = {
  neck: ['CRUNCH', 'LEGRAISE', 'PLANK', 'BURPEE', 'RUNINPLACE', 'JUMPSQUAT'],
  shoulder: ['PUSHUP', 'PIKEPUSHUP', 'DIAMONDPUSHUP', 'WIDEPUSHUP', 'PLANKPUSHUP', 'PLANK', 'BURPEE', 'ARMYCRAWL'],
  elbow: ['PUSHUP', 'PIKEPUSHUP', 'DIAMONDPUSHUP', 'WIDEPUSHUP', 'PLANKPUSHUP', 'ARMYCRAWL'],
  wrist: ['PUSHUP', 'PIKEPUSHUP', 'DIAMONDPUSHUP', 'WIDEPUSHUP', 'PLANKPUSHUP', 'PLANK', 'ARMYCRAWL'],
  back: ['PLANK', 'ARMYCRAWL', 'LEGRAISE', 'CRUNCH', 'BURPEE', 'JUMPSQUAT'],
  hamstring: ['LUNGE', 'HIPBRIDGE', 'RUNINPLACE', 'BURPEE', 'JUMPSQUAT'],
  knee: ['SQUAT', 'JUMPSQUAT', 'COSSACKSQUAT', 'LUNGE'],
  ankle: ['JUMPSQUAT', 'BURPEE', 'LUNGE', 'RUNINPLACE'],
};
