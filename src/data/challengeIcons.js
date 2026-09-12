// 챌린지 트래커 운동 아이콘 — 관절(어깨/팔꿈치/손목, 골반/무릎/발목) 기반
// 픽토그램(2026-09-13). 정확한 자세 가이드용은 아니고 포즈 종류를 구분하기
// 위한 그림이다. 사용자가 만든 독립 HTML(qfit-challenge-tracker.html)의
// ICONS 객체와 헬퍼 함수를 그대로 옮겼다 — 좌표·구성 전부 원본과 동일하다.
//
// stroke="currentColor" 를 쓰는 자리는 이 아이콘을 쓰는 쪽(CSS의 color)이
// 색을 정하고, 소품(봉·벽·바닥선)만 별도 색(var(--accent))으로 고정한다 —
// 원본은 --gold-1 이었는데 이 앱에 이미 있는 골드 토큰(--accent)로 바꿨다.
// ES 모듈이라 seg/dot/figure 같은 짧은 함수 이름도 다른 파일과 겹칠 일이
// 없다(파일마다 스코프가 갈린다).

function seg(a, b, c) {
  return '<path d="M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1] + ' L' + c[0] + ' ' + c[1] +
    '" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>';
}
function torsoLine(a, b) {
  return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] +
    '" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>';
}
function dot(p, r) {
  return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r || 3) + '" fill="currentColor"/>';
}
function barProp(y, x1, x2) {
  return '<line x1="' + (x1 || 12) + '" y1="' + y + '" x2="' + (x2 || 88) + '" y2="' + y +
    '" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" opacity="0.9"/>';
}
function wallProp(x, y1, y2) {
  return '<line x1="' + x + '" y1="' + (y1 || 2) + '" x2="' + x + '" y2="' + (y2 || 96) +
    '" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" opacity="0.9"/>';
}
function groundProp(y, x1, x2) {
  return '<line x1="' + (x1 || 5) + '" y1="' + y + '" x2="' + (x2 || 95) + '" y2="' + y +
    '" stroke="currentColor" stroke-width="2" stroke-dasharray="2 4" opacity="0.35"/>';
}
function barsProp(y1, y2, x1, x2) {
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y2 +
    '" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" opacity="0.9"/>' +
    '<line x1="' + x2 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
    '" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" opacity="0.9"/>';
}

function figure(p) {
  var out = [];
  (p.propsBefore || []).forEach(function (s) { out.push(s); });
  out.push(seg(p.legL[0], p.legL[1], p.legL[2]));
  out.push(seg(p.legR[0], p.legR[1], p.legR[2]));
  out.push(seg(p.armL[0], p.armL[1], p.armL[2]));
  out.push(seg(p.armR[0], p.armR[1], p.armR[2]));
  out.push(torsoLine(p.torso[0], p.torso[1]));
  out.push(dot(p.head, 7));
  out.push(dot(p.armL[2]));
  out.push(dot(p.armR[2]));
  out.push(dot(p.legL[2]));
  out.push(dot(p.legR[2]));
  (p.propsAfter || []).forEach(function (s) { out.push(s); });
  return '<svg viewBox="0 0 100 100">' + out.join('') + '</svg>';
}

// 옆모습(측면) 포즈용 — 팔 1개, 다리 1~2개만 그려서 겹침 없이 실루엣이 뚜렷하게
function figureProfile(p) {
  var out = [];
  (p.propsBefore || []).forEach(function (s) { out.push(s); });
  out.push(seg(p.leg[0], p.leg[1], p.leg[2]));
  if (p.leg2) out.push(seg(p.leg2[0], p.leg2[1], p.leg2[2]));
  out.push(seg(p.arm[0], p.arm[1], p.arm[2]));
  out.push(torsoLine(p.torso[0], p.torso[1]));
  out.push(dot(p.head, 7));
  out.push(dot(p.arm[2]));
  out.push(dot(p.leg[2]));
  if (p.leg2) out.push(dot(p.leg2[2]));
  (p.propsAfter || []).forEach(function (s) { out.push(s); });
  return '<svg viewBox="0 0 100 100">' + out.join('') + '</svg>';
}

export var CHALLENGE_ICONS = {

  // 매달리기 계열 — 바에 매달려 팔이 완전히 펴진 자세
  hang: figure({
    head: [50, 22],
    torso: [[50, 30], [50, 58]],
    armL: [[50, 32], [32, 18], [18, 8]],
    armR: [[50, 32], [68, 18], [82, 8]],
    legL: [[50, 58], [44, 76], [40, 94]],
    legR: [[50, 58], [56, 76], [60, 94]],
    propsBefore: [barProp(8)]
  }),

  // 당기기 계열 — 턱이 바 가까이, 팔꿈치가 굽혀진 자세
  pull: figure({
    head: [50, 16],
    torso: [[50, 24], [50, 48]],
    armL: [[50, 26], [30, 20], [18, 9]],
    armR: [[50, 26], [70, 20], [82, 9]],
    legL: [[50, 48], [44, 70], [40, 90]],
    legR: [[50, 48], [56, 70], [60, 90]],
    propsBefore: [barProp(8)]
  }),

  // 로우 계열 — 몸을 눕혀 낮은 바를 향해 당기는 자세 (측면)
  row: figureProfile({
    head: [16, 26],
    torso: [[22, 30], [82, 60]],
    arm: [[22, 32], [13, 22], [8, 12]],
    leg: [[82, 60], [91, 62], [98, 60]],
    propsBefore: [barProp(12, 2, 24)]
  }),

  // 플랭크 계열 — 팔 곧게 펴고 바닥 지지, 몸통 수평 (측면)
  plank: figureProfile({
    head: [10, 36],
    torso: [[16, 39], [80, 48]],
    arm: [[16, 41], [16, 64], [15, 88]],
    leg: [[80, 48], [89, 68], [96, 88]],
    propsBefore: [groundProp(92)]
  }),

  // 플란체 린 계열 — 어깨가 손보다 앞으로, 골반이 높게 뜬 전방 기울임 (측면)
  leanTilt: figureProfile({
    head: [8, 44],
    torso: [[14, 47], [78, 28]],
    arm: [[14, 49], [19, 68], [22, 88]],
    leg: [[78, 28], [88, 44], [96, 55]],
    propsBefore: [groundProp(90)]
  }),

  // 턱 홀드 계열 — 무릎을 가슴 쪽으로 완전히 당긴 지지/매달리기 자세 (측면)
  tuckHold: figureProfile({
    head: [22, 24],
    torso: [[26, 27], [44, 38]],
    arm: [[26, 29], [22, 54], [20, 80]],
    leg: [[44, 38], [30, 22], [34, 36]],
    propsAfter: []
  }),

  // 스트래들 계열 — 다리를 넓게 벌려 수평으로 유지하는 자세 (측면, 다리 2개)
  straddleHold: figureProfile({
    head: [8, 34],
    torso: [[14, 36], [52, 36]],
    arm: [[14, 38], [14, 62], [13, 86]],
    leg: [[52, 36], [76, 16], [97, 6]],
    leg2: [[52, 36], [76, 56], [97, 72]]
  }),

  // 벽 핸드스탠드 — 손 짚고 거꾸로 서서 벽에 발이 가까운 자세 (정면, 뒤집힌 몸)
  handstandWall: figure({
    head: [50, 72],
    torso: [[50, 64], [50, 34]],
    armL: [[50, 64], [38, 80], [30, 94]],
    armR: [[50, 64], [62, 80], [70, 94]],
    legL: [[50, 34], [46, 18], [42, 4]],
    legR: [[50, 34], [54, 18], [58, 4]],
    propsBefore: [groundProp(96), wallProp(80)]
  }),

  // 프리스탠딩 핸드스탠드 — 벽 없이 균형 잡은 거꾸로 서기 (정면)
  handstandFree: figure({
    head: [50, 72],
    torso: [[50, 64], [50, 34]],
    armL: [[50, 64], [40, 80], [32, 94]],
    armR: [[50, 64], [60, 80], [68, 94]],
    legL: [[50, 34], [48, 17], [46, 4]],
    legR: [[50, 34], [52, 17], [54, 4]],
    propsBefore: [groundProp(96)]
  }),

  // 딥스 계열 — 평행봉 지지, 양팔로 체중을 버티는 자세
  dip: figure({
    head: [50, 18],
    torso: [[50, 25], [50, 48]],
    armL: [[50, 27], [36, 35], [28, 42]],
    armR: [[50, 27], [64, 35], [72, 42]],
    legL: [[50, 48], [44, 64], [40, 80]],
    legR: [[50, 48], [58, 66], [64, 82]],
    propsBefore: [barsProp(22, 66, 26, 74)]
  }),

  // 아처/싱글암 딥스 계열 — 한쪽 팔은 지지, 반대쪽 팔은 옆으로 곧게 뻗은 자세
  archerDip: figure({
    head: [50, 18],
    torso: [[50, 25], [50, 48]],
    armL: [[50, 27], [36, 35], [28, 42]],
    armR: [[50, 27], [80, 30], [95, 32]],
    legL: [[50, 48], [44, 64], [40, 80]],
    legR: [[50, 48], [58, 66], [64, 82]],
    propsBefore: [barsProp(22, 66, 26, 74)]
  }),

  // 스트레칭 계열 — 상체를 앞으로 숙이고 다리를 넓게 뻗는 유연성 동작 (측면, 다리 2개)
  stretch: figureProfile({
    head: [86, 20],
    torso: [[80, 24], [46, 52]],
    arm: [[80, 26], [60, 46], [30, 56]],
    leg: [[46, 52], [24, 56], [4, 58]],
    leg2: [[46, 52], [52, 72], [46, 90]],
    propsBefore: [groundProp(92)]
  }),

  // 코어(할로우바디) — 바닥에 누워 어깨/다리를 살짝 띄운 자세 (측면)
  core: figureProfile({
    head: [8, 60],
    torso: [[14, 61], [78, 54]],
    arm: [[14, 62], [7, 68], [2, 73]],
    leg: [[78, 54], [90, 58], [98, 63]],
    propsBefore: [groundProp(82)]
  }),

  // 다리 들어올리기 — 매달린 채 다리를 앞으로 들어올리는 자세
  legRaise: figure({
    head: [50, 20],
    torso: [[50, 27], [50, 50]],
    armL: [[50, 29], [34, 20], [20, 9]],
    armR: [[50, 29], [66, 20], [80, 9]],
    legL: [[50, 50], [62, 52], [78, 48]],
    legR: [[50, 50], [64, 56], [80, 54]],
    propsBefore: [barProp(8)]
  }),

  // 손목 — 손목 스트레칭(손등을 꺾어 바닥 짚는 자세) 클로즈업
  wrist:
    '<svg viewBox="0 0 100 100">' +
    '<line x1="36" y1="90" x2="32" y2="54" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>' +
    '<line x1="32" y1="54" x2="62" y2="30" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>' +
    '<line x1="62" y1="30" x2="76" y2="18" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>' +
    '<line x1="62" y1="30" x2="80" y2="28" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>' +
    '<line x1="62" y1="30" x2="78" y2="40" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="32" cy="54" r="4" fill="currentColor"/>' +
    '</svg>',

  // 능동 매달리기 계열 — 어깨를 아래로 당겨 힘을 쓰는 매달리기(데드행과 구분: 어깨 위에 아래화살표 표시)
  hangActive: figure({
    head: [50, 26],
    torso: [[50, 34], [50, 58]],
    armL: [[50, 36], [32, 18], [18, 8]],
    armR: [[50, 36], [68, 18], [82, 8]],
    legL: [[50, 58], [44, 76], [40, 94]],
    legR: [[50, 58], [56, 76], [60, 94]],
    propsBefore: [barProp(8)],
    propsAfter: ['<path d="M40 20 L40 28 M36 24 L40 30 L44 24" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M60 20 L60 28 M56 24 L60 30 L64 24" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>']
  }),

  // 턱 홀드(매달림) 계열 — 바에 매달린 채 무릎을 당긴 자세 (프론트레버류, 바닥 지지 턱홀드와 구분)
  tuckHang: figureProfile({
    head: [22, 30],
    torso: [[26, 33], [44, 40]],
    arm: [[26, 31], [22, 16], [20, 6]],
    leg: [[44, 40], [30, 24], [34, 38]],
    propsBefore: [barProp(6, 2, 40)]
  }),

  // 다리 굽혀 들어올리기 — 매달린 채 무릎을 접어 들어올리는 자세 (다리 편 레그레이즈와 구분)
  legRaiseBent: figure({
    head: [50, 20],
    torso: [[50, 27], [50, 50]],
    armL: [[50, 29], [34, 20], [20, 9]],
    armR: [[50, 29], [66, 20], [80, 9]],
    legL: [[50, 50], [62, 46], [66, 60]],
    legR: [[50, 50], [66, 50], [70, 64]],
    propsBefore: [barProp(8)]
  }),

  // 어깨 외회전 — 팔꿈치를 옆구리에 붙이고 팔뚝만 바깥으로 돌리는 준비운동
  shoulderRot: figure({
    head: [50, 15],
    torso: [[50, 22], [50, 55]],
    armL: [[50, 26], [38, 38], [30, 32]],
    armR: [[50, 26], [62, 38], [70, 32]],
    legL: [[50, 55], [46, 75], [44, 92]],
    legR: [[50, 55], [54, 75], [56, 92]],
    propsBefore: [groundProp(94)]
  }),

  // 오버헤드 삼두 운동 — 팔을 머리 위로 들고 팔꿈치를 굽혔다 펴는 동작
  overhead: figure({
    head: [50, 15],
    torso: [[50, 22], [50, 55]],
    armL: [[50, 24], [42, 12], [46, 28]],
    armR: [[50, 24], [58, 12], [54, 28]],
    legL: [[50, 55], [46, 75], [44, 92]],
    legR: [[50, 55], [54, 75], [56, 92]],
    propsBefore: [groundProp(94)]
  }),

  // 컬/페이스풀 계열 — 서서 팔꿈치를 굽혀 손을 몸 쪽으로 당기는 동작
  curl: figure({
    head: [50, 15],
    torso: [[50, 22], [50, 55]],
    armL: [[50, 26], [38, 40], [42, 54]],
    armR: [[50, 26], [62, 40], [58, 54]],
    legL: [[50, 55], [46, 75], [44, 92]],
    legR: [[50, 55], [54, 75], [56, 92]],
    propsBefore: [groundProp(94)]
  }),

  // 풀다운 계열 — 앉아서 머리 위 바(또는 밴드)를 가슴 쪽으로 당기는 동작
  pulldown: figure({
    head: [50, 20],
    torso: [[50, 26], [50, 52]],
    armL: [[50, 28], [36, 18], [26, 8]],
    armR: [[50, 28], [64, 18], [74, 8]],
    legL: [[50, 52], [42, 68], [38, 85]],
    legR: [[50, 52], [58, 68], [62, 85]],
    propsBefore: [barProp(6, 20, 80)]
  }),

  // 런지형 스트레칭 — 서서 한쪽 다리를 앞으로 내밀며 늘리는 동작
  lungeStretch: figureProfile({
    head: [30, 15],
    torso: [[32, 20], [42, 45]],
    arm: [[32, 22], [24, 32], [18, 40]],
    leg: [[42, 45], [30, 62], [24, 85]],
    leg2: [[42, 45], [62, 55], [85, 60]],
    propsBefore: [groundProp(90)]
  }),

  // 사이드 스플릿 시도 — 바닥에 앉아 두 다리를 양옆으로 뻗는 동작
  splitAttempt: figureProfile({
    head: [50, 20],
    torso: [[50, 25], [50, 45]],
    arm: [[50, 27], [40, 35], [32, 42]],
    leg: [[50, 45], [25, 50], [4, 52]],
    leg2: [[50, 45], [75, 50], [96, 52]],
    propsBefore: [groundProp(54)]
  }),

  // 파이크 푸시업 — 엉덩이를 아주 높이 들어올린 역V자 자세 (플랭크와 구분)
  pike: figureProfile({
    head: [35, 56],
    torso: [[38, 51], [66, 18]],
    arm: [[38, 53], [36, 70], [35, 88]],
    leg: [[66, 18], [80, 48], [92, 88]],
    propsBefore: [groundProp(92)]
  }),

  // 백레버 턱 — 봉에 매달려 몸의 앞면이 바닥을 향하도록 아치형으로 버티는 자세(턱 프론트레버와 반대 방향)
  backLeverTuck: figureProfile({
    head: [22, 30],
    torso: [[26, 33], [44, 36]],
    arm: [[26, 31], [22, 16], [20, 6]],
    leg: [[44, 36], [40, 54], [26, 52]],
    propsBefore: [barProp(6, 2, 40)]
  }),

  // 밴드 보조 딥스 — 평행봉 + 고무 밴드로 도움을 받는 딥스 (일반 딥스와 구분: 밴드 표시)
  dipBand: figure({
    head: [50, 18],
    torso: [[50, 25], [50, 48]],
    armL: [[50, 27], [36, 35], [28, 42]],
    armR: [[50, 27], [64, 35], [72, 42]],
    legL: [[50, 48], [44, 64], [40, 80]],
    legR: [[50, 48], [58, 66], [64, 82]],
    propsBefore: [barsProp(22, 66, 26, 74)],
    propsAfter: ['<path d="M32 60 Q40 52 32 44 Q24 36 32 28" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round"/>']
  }),

  // 버터플라이 스트레칭 — 앉아서 발바닥을 맞대고 무릎을 벌리는 자세
  butterflyStretch: figure({
    head: [50, 18],
    torso: [[50, 24], [50, 48]],
    armL: [[50, 26], [42, 44], [38, 58]],
    armR: [[50, 26], [58, 44], [62, 58]],
    legL: [[50, 48], [34, 50], [42, 66]],
    legR: [[50, 48], [66, 50], [58, 66]],
    propsBefore: [groundProp(88)]
  }),

  // 카프라주(개구리) 스트레칭 — 손을 짚고 무릎을 넓게 벌려 엎드린 자세
  frogStretch: figure({
    head: [50, 22],
    torso: [[50, 28], [50, 44]],
    armL: [[50, 30], [36, 42], [28, 56]],
    armR: [[50, 30], [64, 42], [72, 56]],
    legL: [[50, 44], [26, 52], [32, 76]],
    legR: [[50, 44], [74, 52], [68, 76]],
    propsBefore: [groundProp(90)]
  })
};

export function getChallengeIcon(key) {
  return CHALLENGE_ICONS[key] || CHALLENGE_ICONS.pull;
}
