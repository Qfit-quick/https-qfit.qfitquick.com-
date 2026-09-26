// 어르신·재활 모드 픽트그램(2026-09-27) — 영상 대신 쓴다.
//
// 새로 촬영하지 않고는 이 9종 동작의 영상을 만들 수 없다(src/data/
// seniorExercises.js 머리 주석 참고). 사진 한 장도 이 앱 원칙상 안 된다
// (CLAUDE.md "정지된 사진 한 장은 무슨 동작인지 못 알려 준다") — 그래서
// 항공기 안전수칙 카드처럼, 동작 하나를 화살표 붙은 선그림 한 장으로
// 압축해 보여준다. 전부 같은 좌표계(뷰박스 0 0 100 100, 옆모습 실루엣)를
// 재사용해서, 아홉 장이 서로 다른 손이 그린 것처럼 안 보이게 했다.
//
// stroke 는 currentColor 라 라이트·다크 테마를 그대로 따라간다 — 색을
// 여기서 정하지 않는다.
const HEAD = '<circle cx="50" cy="22" r="9" fill="currentColor"/>';
// 의자 다리(짧은 세로선 둘)는 뺐다 — 앉은 다리(무릎 든 자세 등)와 자꾸
// 겹쳐서 그림이 지저분해졌다(2026-09-27). 등받이 하나 + 좌석 하나로도
// "의자에 앉아 있다"는 충분히 읽힌다.
const CHAIR = '<line x1="26" y1="78" x2="74" y2="78"/><line x1="70" y1="44" x2="70" y2="78"/>';
const SEATED_BASE = HEAD + '<line x1="50" y1="31" x2="50" y2="78"/>';
const SEATED_LEG_DOWN = '<line x1="44" y1="78" x2="44" y2="95"/><line x1="44" y1="95" x2="56" y2="95"/>';

// 화살표 하나 — 반복 동작임을 알려 준다(굽었다 폈다, 좌우로 등).
const arrow = (x1, y1, x2, y2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#senior-arrow)"/>`;
// 곡선 화살표(돌리기·기울이기처럼 둥근 궤적).
const curveArrow = (d) => `<path d="${d}" marker-end="url(#senior-arrow)"/>`;

const PICTOGRAMS = {
  // 의자 잡고 앉았다 일어나기 — 앉은 모습(진하게) + 선 모습(흐리게) + 위로 화살표.
  sitStand:
    CHAIR +
    SEATED_BASE + SEATED_LEG_DOWN +
    '<g opacity="0.35">' +
    '<circle cx="50" cy="9" r="9" fill="currentColor"/>' +
    '<line x1="50" y1="18" x2="50" y2="60" /><line x1="50" y1="60" x2="44" y2="94" /><line x1="50" y1="60" x2="56" y2="94" />' +
    '</g>' +
    arrow(50, 68, 50, 40),

  // 벽 짚고 팔굽혀펴기 — 벽(오른쪽 세로선) 짚고 기울인 선 모습.
  wallPushup:
    '<line x1="88" y1="4" x2="88" y2="96"/>' +
    '<circle cx="46" cy="18" r="9" fill="currentColor"/>' +
    '<line x1="49" y1="26" x2="60" y2="60"/>' +
    '<line x1="60" y1="60" x2="55" y2="94"/>' +
    '<line x1="60" y1="60" x2="67" y2="94"/>' +
    '<line x1="50" y1="32" x2="82" y2="40"/>' +
    curveArrow('M 50 45 Q 66 30 82 40'),

  // 앉아서 제자리 걷기 — 한쪽 무릎 든 다리(위쪽 화살표) + 반대쪽은 바닥에.
  seatedMarch:
    CHAIR + SEATED_BASE +
    '<line x1="50" y1="78" x2="38" y2="62"/><line x1="38" y1="62" x2="38" y2="82"/>' +
    '<line x1="58" y1="90" x2="70" y2="90"/><line x1="58" y1="78" x2="58" y2="90"/>' +
    curveArrow('M 30 74 Q 26 66 34 58'),

  // 앉아서 발목 위아래로 — 발끝에 위아래 화살표.
  anklePump:
    CHAIR + SEATED_BASE + SEATED_LEG_DOWN +
    arrow(50, 100, 50, 88) + arrow(50, 90, 50, 100),

  // 앉아서 양팔 들어올리기 — 팔이 앞으로 뻗어 있고 위로 살짝 곡선 화살표.
  armRaise:
    CHAIR + SEATED_BASE + SEATED_LEG_DOWN +
    '<line x1="50" y1="36" x2="76" y2="34"/>' +
    curveArrow('M 50 55 Q 64 40 76 34'),

  // 앉아서 무릎 펴기 — 한쪽 다리가 앞으로 곧게 뻗음.
  kneeExtension:
    CHAIR + SEATED_BASE +
    '<line x1="50" y1="78" x2="20" y2="74"/>' +
    curveArrow('M 44 90 Q 30 84 22 76') +
    SEATED_LEG_DOWN,

  // 어깨 천천히 돌리기 — 머리·몸통 옆에 둥근 화살표를 따로 띄운다(머리와
  // 겹치면 모자처럼 보인다, 2026-09-27 확인).
  shoulderRoll:
    CHAIR + SEATED_BASE + SEATED_LEG_DOWN +
    curveArrow('M 58 32 A 11 11 0 1 1 68 48'),

  // 목 좌우로 천천히 기울이기 — 머리를 옆으로 기울여 그리고 좌우 화살표.
  neckTilt:
    '<line x1="50" y1="40" x2="50" y2="78"/>' +
    '<circle cx="40" cy="20" r="9" fill="currentColor" transform="rotate(-18 40 20)"/>' +
    '<line x1="46" y1="27" x2="50" y2="40"/>' +
    arrow(28, 18, 18, 22) + arrow(72, 18, 82, 22),

  // 앉아서 상체 살짝 틀기 — 어깨선이 비스듬하고 좌우 곡선 화살표.
  torsoTwist:
    CHAIR + HEAD +
    '<line x1="38" y1="30" x2="62" y2="36"/><line x1="50" y1="33" x2="50" y2="78"/>' +
    SEATED_LEG_DOWN +
    curveArrow('M 30 28 Q 24 34 30 40') + curveArrow('M 70 40 Q 76 34 70 28'),
};

const WRAP_OPEN =
  '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<defs><marker id="senior-arrow" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">' +
  '<path d="M0,0 L8,4 L0,8 Z" fill="currentColor" stroke="none"/></marker></defs>';
const WRAP_CLOSE = '</svg>';

/** 픽트그램 키 → 완성된 <svg> 마크업(innerHTML 로 그대로 꽂는다). */
export function seniorPictogramMarkup(key) {
  const body = PICTOGRAMS[key];
  if (!body) return '';
  return WRAP_OPEN + body + WRAP_CLOSE;
}
