// 부위 묶음. keys 는 EXERCISES 의 key 를 가리킨다 — 여기 없는 key 를 적으면
// 그 묶음을 골랐을 때 후보가 조용히 비어 버린다.
// 주간 부위별 비중(FR-12)도 이 표를 기준으로 센다.
export const MUSCLE_GROUPS = [
  { id:'lower', label:{ko:'하체',en:'Lower',zh:'下肢'}, keys:['SQUAT','LUNGE','JUMPSQUAT','CALFRAISE','COSSACKSQUAT'] },
  { id:'upper', label:{ko:'상체',en:'Upper',zh:'上肢'}, keys:['PUSHUP','WIDEPUSHUP','DIAMONDPUSHUP','PIKEPUSHUP','ARMYCRAWL','PLANKPUSHUP','YRAISE'] },
  { id:'core',  label:{ko:'코어',en:'Core',zh:'核心'}, keys:['PLANK','HIGHPLANK','LEGRAISE','CRUNCH','HIPBRIDGE','VUP','DEADBUG','REVERSEPLANK'] },
  { id:'full',  label:{ko:'전신',en:'Full Body',zh:'全身'}, keys:['RUNINPLACE','BURPEE','ARMYCRAWL','MOUNTAINCLIMBER','ARMWALK'] },
];

// 동작 하나가 어느 묶음에 속하는지. 주간 비중(FR-12)이 이걸로 센다.
//
// ⚠ 한 동작이 두 묶음에 들어 있을 수 있다(배밀기는 상체이자 전신).
// 양쪽에 세면 합이 100%를 넘어 비중이라는 말이 거짓이 되므로, 먼저 나오는
// 묶음 하나에만 넣는다. 순서가 곧 우선순위다.
export const EX_TO_GROUP = (() => {
  const map = {};
  for (const g of MUSCLE_GROUPS) {
    for (const k of g.keys) if (!(k in map)) map[k] = g.id;
  }
  return map;
})();
