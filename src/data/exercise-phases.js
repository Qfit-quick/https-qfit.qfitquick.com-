// 동작을 국면으로 쪼갠 코칭.
//
// 왜 국면으로 쪼개는가: "무릎이 발끝을 넘지 않게" 같은 한 줄 팁은 **언제**
// 그래야 하는지를 안 말한다. 스쿼트에서 정말 중요한 것은 '고관절을 무릎보다
// 먼저 접는다' 인데, 그건 내려가기 시작하는 0.3초 안에서만 유효한 말이다.
// 그래서 시연 영상의 그 구간만 잘라 붙이고, 그 구간에서만 할 말을 적는다.
//
// t0/t1 은 **그 클립 안의 초**다. 클립을 다시 인코딩하거나 갈아 끼우면
// 여기 숫자가 통째로 거짓말이 되므로, 클립을 바꿀 때는 반드시 같이 잰다.
// 재는 법은 scripts/phases.mjs 에 있다(국면마다 대표 프레임을 뽑아 준다).
//
// 구간은 **한 회(rep)만** 담는다. 클립은 3~4회를 반복해 찍혀 있는데, 그중
// 자세가 가장 안정된 회를 골랐다 — 첫 회는 자세를 잡느라, 마지막 회는
// 지쳐서 흐트러진 것이 많다. 푸쉬업 클립처럼 앞머리에 걸어 들어오는
// 장면이 있는 것도 있어서, 어느 회를 쓸지는 클립마다 다르다.
//
// 움직임이 없거나(플랭크) 너무 빠른(제자리 달리기·배밀기) 동작은 국면을
// 시간으로 못 나눈다. 그런 것은 **몸의 점검 지점**으로 나눈다 — 화면은
// 같은 장면이 흐르고, 글이 볼 곳을 가리킨다. 억지로 0.15초를 잘라 봐야
// 눈으로 좇을 수 없는 깜빡임이 될 뿐이다.
//
// 세 언어를 다 채운다. `npm run i18n` 이 {ko,en,zh} 덩어리의 빠진 자리를 센다.

export const EXERCISE_PHASES = {
  // ── 스쿼트 (clip-1, 2번째 회) ────────────────────────
  SQUAT: [
    { t0: 1.40, t1: 1.78,
      name: { ko: '준비 자세', en: 'Set-up', zh: '准备姿势' },
      form: {
        ko: '발은 어깨너비, 발끝은 살짝 바깥으로 벌립니다. 가슴을 들고 배에 힘을 준 채로 시작합니다.',
        en: 'Feet shoulder-width, toes turned slightly out. Chest up, brace your abs before you move.',
        zh: '双脚与肩同宽，脚尖略向外。挺胸收腹，先绷紧再动。',
      },
      breath: {
        ko: '내려가기 직전에 숨을 크게 들이마셔 배를 채웁니다.',
        en: 'Take a big breath into your belly just before you descend.',
        zh: '下蹲前先深吸一口气，让腹部充满。',
      } },
    { t0: 1.78, t1: 2.25,
      name: { ko: '내려가기', en: 'Descent', zh: '下蹲' },
      form: {
        ko: '무릎보다 고관절을 먼저 접습니다. 엉덩이를 뒤로 빼면 무릎은 알아서 앞으로 나옵니다 — 무릎부터 굽히면 무릎만 쓰는 운동이 됩니다.',
        en: 'Hinge at the hips before the knees. Send your hips back and the knees follow on their own — leading with the knees turns it into a knee-only movement.',
        zh: '先折髋，再屈膝。臀部向后坐，膝盖自然向前 — 先屈膝就变成只练膝盖了。',
      },
      breath: {
        ko: '들이마신 숨을 참은 채로 내려갑니다. 그 압력이 허리를 잡아 줍니다.',
        en: 'Hold that breath as you lower — the pressure is what supports your lower back.',
        zh: '憋住这口气往下蹲，这股腹压正是护腰的关键。',
      } },
    { t0: 2.25, t1: 2.58,
      name: { ko: '최저점', en: 'Bottom', zh: '最低点' },
      form: {
        ko: '허벅지가 바닥과 나란해지는 깊이까지. 무릎이 안쪽으로 모이지 않게 발끝 방향으로 밀어 벌립니다.',
        en: 'Down until your thighs are parallel to the floor. Push your knees out over your toes so they never cave inward.',
        zh: '下蹲到大腿与地面平行。膝盖朝脚尖方向外推，不要内扣。',
      },
      breath: {
        ko: '여기서는 숨을 쉬지 않습니다. 반동 없이 반 박자만 멈춥니다.',
        en: "Don't breathe here. Pause for half a beat — no bouncing.",
        zh: '这里不换气。停半拍，不要借反弹。',
      } },
    { t0: 2.58, t1: 3.00,
      name: { ko: '올라오기', en: 'Ascent', zh: '起身' },
      form: {
        ko: '발바닥 전체로 바닥을 밀어냅니다. 엉덩이와 가슴이 같은 속도로 올라와야 합니다 — 엉덩이만 먼저 솟으면 허리 운동이 됩니다.',
        en: 'Drive the whole foot into the floor. Hips and chest must rise together — if the hips shoot up first it becomes a lower-back exercise.',
        zh: '整个脚掌蹬地。臀和胸要同速上升 — 臀部先起来就变成练腰了。',
      },
      breath: {
        ko: '제일 힘든 구간을 지나면서 입으로 후 하고 내쉽니다.',
        en: 'Blow the air out through your mouth as you pass the hardest point.',
        zh: '过了最吃力的那一段，用嘴呼气。',
      } },
    { t0: 3.00, t1: 3.32,
      name: { ko: '마무리', en: 'Lockout', zh: '站直' },
      form: {
        ko: '다 서면 엉덩이를 한 번 조입니다. 다만 무릎을 꽉 펴서 잠그지는 마십시오.',
        en: 'Squeeze your glutes at the top — but stop short of locking the knees out hard.',
        zh: '站直后夹一下臀，但不要把膝盖完全绷死。',
      },
      breath: {
        ko: '남은 숨을 다 내쉬고, 다음 회를 위해 다시 들이마십니다.',
        en: 'Finish the exhale, then take the next breath in for the following rep.',
        zh: '把气呼尽，再为下一次吸满。',
      } },
  ],

  // ── 버피 (clip-2, 2번째 회) ──────────────────────────
  BURPEE: [
    { t0: 3.05, t1: 3.45,
      name: { ko: '준비', en: 'Set-up', zh: '准备' },
      form: {
        ko: '발은 어깨너비로 서고 시선은 앞을 봅니다. 다음 동작이 많으므로 시작 전에 배에 힘을 한 번 줍니다.',
        en: 'Stand shoulder-width, eyes forward. A lot happens next, so brace your abs before you start.',
        zh: '双脚与肩同宽，目视前方。后面动作很多，开始前先收紧核心。',
      },
      breath: {
        ko: '한 회가 길어서 숨이 금방 찹니다. 시작 전에 크게 한 번 들이마셔 두십시오.',
        en: 'One rep is long and you run out of air fast — take one big breath in before you start.',
        zh: '一次动作很长，很快就会喘。开始前先深吸一口。',
      } },
    { t0: 3.45, t1: 3.95,
      name: { ko: '앉으며 손 짚기', en: 'Squat & hands down', zh: '下蹲撑地' },
      form: {
        ko: '허리를 굽혀 손을 뻗지 말고, 무릎을 굽혀 앉으면서 손을 바닥에 놓습니다. 손은 어깨 바로 아래입니다.',
        en: "Don't bend at the waist to reach the floor — squat down and place your hands under your shoulders.",
        zh: '不要弯腰去够地面，屈膝下蹲把手放到肩膀正下方。',
      },
      breath: {
        ko: '앉으면서 짧게 내쉽니다.',
        en: 'Short exhale as you drop.',
        zh: '下蹲时短促呼气。',
      } },
    { t0: 3.95, t1: 4.55,
      name: { ko: '발 뒤로 차기', en: 'Kick back to plank', zh: '双腿后蹬' },
      form: {
        ko: '두 발을 한 번에 뒤로 보냅니다. 발이 닿는 순간 몸이 머리부터 발끝까지 일직선이어야 합니다 — 허리가 아래로 꺼지면 여기서 허리를 다칩니다.',
        en: 'Send both feet back at once. The moment they land, your body must be one straight line — a sagging lower back is where burpees hurt people.',
        zh: '双脚同时后蹬。落地瞬间身体要成一条直线 — 塌腰就是波比跳伤腰的地方。',
      },
      breath: {
        ko: '차는 순간에는 숨을 참습니다. 그래야 몸통이 무너지지 않습니다.',
        en: 'Hold your breath through the kick-back — that is what keeps your trunk from collapsing.',
        zh: '后蹬瞬间屏住呼吸，躯干才不会垮掉。',
      } },
    { t0: 4.55, t1: 5.45,
      name: { ko: '가슴 내렸다 밀기', en: 'Push-up', zh: '俯卧撑' },
      form: {
        ko: '팔꿈치를 몸통에서 45도쯤 벌린 채 가슴을 내립니다. 힘들면 이 푸쉬업 한 번은 빼도 됩니다 — 자세가 무너진 채 하는 것보다 낫습니다.',
        en: 'Lower your chest with elbows about 45° from your body. If it is too hard, skip this push-up — better than grinding it out with broken form.',
        zh: '手肘与身体约成45度，把胸口放低。太吃力就跳过这个俯卧撑，好过姿势崩掉硬做。',
      },
      breath: {
        ko: '내려갈 때 들이마시고, 밀어 올리며 내쉽니다.',
        en: 'Breathe in on the way down, out as you press up.',
        zh: '下放时吸气，推起时呼气。',
      } },
    { t0: 5.45, t1: 5.90,
      name: { ko: '발 당기기', en: 'Feet back in', zh: '收腿' },
      form: {
        ko: '두 발을 손 옆까지 한 번에 당겨 옵니다. 발이 손에서 너무 멀면 다음 점프가 안 나옵니다.',
        en: 'Jump both feet back up beside your hands. Land them short of your hands and the jump never happens.',
        zh: '双脚一次收到手掌两侧。收得太远，接下来的跳就跳不起来。',
      },
      breath: {
        ko: '당기면서 짧게 들이마십니다.',
        en: 'Quick breath in as you pull the feet in.',
        zh: '收腿时快速吸气。',
      } },
    { t0: 5.90, t1: 6.35,
      name: { ko: '일어서서 점프', en: 'Stand & jump', zh: '起身跳起' },
      form: {
        ko: '엉덩이로 밀어 일어나면서 그대로 뛰어오릅니다. 착지할 때는 무릎을 살짝 굽혀 소리 없이 받습니다.',
        en: 'Drive up through the hips and carry it straight into the jump. Land with soft knees — quietly.',
        zh: '用臀部发力起身，顺势跳起。落地时微屈膝，落得无声。',
      },
      breath: {
        ko: '뛰어오르면서 세게 내쉽니다. 착지하고 나서 다음 회를 위해 들이마십니다.',
        en: 'Blow out hard as you jump. Breathe in again once you have landed.',
        zh: '跳起时用力呼气，落地后再吸气准备下一次。',
      } },
  ],

  // ── 런지 (clip-3, 걸어 나가는 런지) ──────────────────
  LUNGE: [
    { t0: 4.80, t1: 5.14,
      name: { ko: '앞으로 내딛기', en: 'Step out', zh: '向前迈步' },
      form: {
        ko: '한 발을 크게 앞으로 내딛습니다. 좁게 딛으면 앞무릎만 접히고, 너무 넓으면 뒷다리가 당깁니다 — 서 있을 때 보폭의 두 배쯤이 기준입니다.',
        en: 'Take a long step forward. Too short and only the front knee bends; too long and the back leg pulls — about double your walking stride.',
        zh: '向前迈一大步。步子太小只会屈前膝，太大后腿会被拉扯 — 大约是走路步幅的两倍。',
      },
      breath: {
        ko: '내딛기 직전에 들이마십니다.',
        en: 'Breathe in just before the step.',
        zh: '迈步前先吸气。',
      } },
    { t0: 5.14, t1: 5.42,
      name: { ko: '내려가기', en: 'Descent', zh: '下蹲' },
      form: {
        ko: '앞으로 기울지 말고 몸을 그대로 **수직으로** 내립니다. 상체가 앞으로 넘어가면 앞무릎이 발끝을 넘어가 무릎에 부담이 몰립니다.',
        en: 'Drop straight down, not forward. Lean the torso ahead and the front knee slides past the toes, loading the joint.',
        zh: '身体垂直下沉，不要前倾。上身前倾会让前膝超过脚尖，压力全压在关节上。',
      },
      breath: {
        ko: '숨을 참은 채로 내려갑니다.',
        en: 'Hold the breath as you lower.',
        zh: '屏住呼吸下沉。',
      } },
    { t0: 5.42, t1: 5.70,
      name: { ko: '최저점', en: 'Bottom', zh: '最低点' },
      form: {
        ko: '뒷무릎이 바닥에 닿기 직전에 멈춥니다. 이때 앞무릎과 뒷무릎이 둘 다 90도면 무게가 두 다리에 반씩 실립니다.',
        en: 'Stop just before the back knee touches down. Both knees at 90° means the load is split evenly between the legs.',
        zh: '后膝快碰地时停住。前后膝都成90度，重量才平均分在两条腿上。',
      },
      breath: {
        ko: '멈춘 동안에도 숨은 참고 있습니다. 균형을 잡는 데 그 압력이 필요합니다.',
        en: 'Stay holding the breath — you need that pressure to keep your balance here.',
        zh: '停顿时仍然屏气，这股压力帮你稳住平衡。',
      } },
    { t0: 5.70, t1: 6.02,
      name: { ko: '올라오기', en: 'Ascent', zh: '起身' },
      form: {
        ko: '앞발 **뒤꿈치**로 바닥을 밀어 올라옵니다. 앞꿈치로 밀면 무릎이 먼저 펴지면서 다시 무릎 운동이 됩니다.',
        en: 'Push up through the front heel. Pushing off the ball of the foot straightens the knee first and it becomes a knee exercise again.',
        zh: '用前脚的脚跟蹬地起身。用前脚掌蹬会先伸膝，又变成练膝盖了。',
      },
      breath: {
        ko: '밀어 올리면서 내쉽니다.',
        en: 'Exhale as you drive up.',
        zh: '起身时呼气。',
      } },
    { t0: 6.02, t1: 6.42,
      name: { ko: '마무리', en: 'Finish', zh: '收势' },
      form: {
        ko: '뒷발을 앞으로 모으거나, 그대로 반대 발을 내딛어 이어 갑니다. 상체는 끝까지 곧게 세운 채입니다.',
        en: 'Bring the back foot up, or step straight through with the other leg. Keep the torso upright the whole way.',
        zh: '把后脚收上来，或直接换另一条腿继续。全程保持上身直立。',
      },
      breath: {
        ko: '다 내쉬고, 반대쪽을 위해 다시 들이마십니다.',
        en: 'Finish the exhale and breathe in again for the other side.',
        zh: '呼尽后再吸气，准备换边。',
      } },
  ],

  // ── 점프스쿼트 (clip-4) ──────────────────────────────
  JUMPSQUAT: [
    { t0: 2.86, t1: 3.14,
      name: { ko: '준비 자세', en: 'Set-up', zh: '准备姿势' },
      form: {
        ko: '스쿼트와 같은 자세에서 시작합니다. 다만 뛰어야 하므로 발은 조금 더 좁게, 어깨너비 정도로 둡니다.',
        en: 'Start from the same stance as a squat, but a touch narrower — shoulder-width — because you have to jump.',
        zh: '起始姿势和深蹲一样，只是因为要起跳，双脚稍窄一点，与肩同宽。',
      },
      breath: {
        ko: '뛰기 전에 크게 들이마셔 둡니다.',
        en: 'Take a big breath in before the jump.',
        zh: '起跳前先深吸一口气。',
      } },
    { t0: 3.14, t1: 3.42,
      name: { ko: '내려앉기', en: 'Dip', zh: '下蹲' },
      form: {
        ko: '스쿼트만큼 깊이 앉지 않습니다. 반쯤만 내려가는 것이 더 높이 뜁니다 — 깊이 앉으면 힘이 아래에서 다 새어 나갑니다.',
        en: 'Do not go as deep as a squat. A half depth jumps higher — going deep bleeds the power away at the bottom.',
        zh: '不要蹲到深蹲那么低。半蹲跳得更高 — 蹲太深力量在底部就散掉了。',
      },
      breath: {
        ko: '들이마신 숨을 참은 채로 내려갑니다.',
        en: 'Hold that breath as you dip.',
        zh: '憋住气往下蹲。',
      } },
    { t0: 3.42, t1: 3.70,
      name: { ko: '최저점', en: 'Bottom', zh: '最低点' },
      form: {
        ko: '여기서 멈추지 않습니다. 내려간 힘을 그대로 위로 되돌려야 하므로, 최저점은 지나가는 자리이지 머무는 자리가 아닙니다.',
        en: 'Do not pause here. The downward energy has to turn straight around — the bottom is a place you pass through, not sit in.',
        zh: '这里不要停。向下的力量要直接反弹向上 — 最低点是经过的位置，不是停留的位置。',
      },
      breath: {
        ko: '숨은 계속 참고 있습니다.',
        en: 'Still holding the breath.',
        zh: '继续屏住呼吸。',
      } },
    { t0: 3.70, t1: 4.02,
      name: { ko: '점프', en: 'Jump', zh: '起跳' },
      form: {
        ko: '발끝까지 밀어 몸을 완전히 폅니다. 무릎만 펴는 것이 아니라 엉덩이·무릎·발목 셋이 같이 펴져야 높이 뜹니다.',
        en: 'Extend all the way onto your toes. Hips, knees and ankles must all open together — not just the knees.',
        zh: '一直蹬到脚尖，身体完全伸展。髋、膝、踝三个关节一起打开才跳得高。',
      },
      breath: {
        ko: '뛰어오르는 순간 세게 내쉽니다.',
        en: 'Blow out hard at the moment you leave the ground.',
        zh: '离地瞬间用力呼气。',
      } },
    { t0: 4.02, t1: 4.38,
      name: { ko: '착지', en: 'Landing', zh: '落地' },
      form: {
        ko: '앞꿈치부터 닿고 뒤꿈치로 이어 받으며 무릎을 굽혀 충격을 흡수합니다. 이 동작에서 다치는 곳은 거의 착지입니다 — 소리가 크면 잘못 받은 것입니다.',
        en: 'Land toes first, roll to the heel, and bend the knees to absorb it. Almost every injury in this move happens on landing — if it is loud, you took it wrong.',
        zh: '前脚掌先落地，再过渡到脚跟，屈膝缓冲。这个动作的伤几乎都发生在落地 — 声音大就是没接好。',
      },
      breath: {
        ko: '착지하고 나서 다음 회를 위해 들이마십니다.',
        en: 'Breathe in after you land, ready for the next rep.',
        zh: '落地后吸气，准备下一次。',
      } },
  ],

  // ── 플랭크 (clip-5) ──────────────────────────────────
  //
  // 버티기 동작이라 시간으로 나눌 국면이 없다 — 아무것도 안 움직이는 것이
  // 이 동작이다. 그래서 몸의 점검 지점으로 나눈다. 화면은 계속 같은 자세이고,
  // 글이 지금 어디를 확인할 차례인지 가리킨다.
  PLANK: [
    { t0: 0.60, t1: 1.90,
      name: { ko: '팔꿈치와 어깨', en: 'Elbows & shoulders', zh: '手肘与肩膀' },
      form: {
        ko: '팔꿈치는 어깨 **바로 아래**입니다. 앞으로 나가 있으면 어깨가 늘어나 버티는 힘이 어깨에 걸리고, 뒤에 있으면 몸이 앞으로 미끄러집니다.',
        en: 'Elbows directly under the shoulders. Too far forward and the shoulders take the load; too far back and you slide forward.',
        zh: '手肘要在肩膀正下方。太靠前，负担压在肩上；太靠后，身体会向前滑。',
      },
      breath: {
        ko: '자리를 잡고 나서 한 번 크게 들이마시고 시작합니다.',
        en: 'Once you are set, take one full breath in and begin.',
        zh: '摆好位置后，先深吸一口气再开始。',
      } },
    { t0: 1.90, t1: 3.20,
      name: { ko: '허리와 골반', en: 'Hips & lower back', zh: '腰与骨盆' },
      form: {
        ko: '엉덩이를 살짝 안으로 말아 넣어 허리의 오목한 곳을 없앱니다. 엉덩이가 처지면 허리로 버티는 것이고, 너무 솟으면 쉬고 있는 것입니다.',
        en: 'Tuck the pelvis slightly to flatten the arch in your lower back. Hips sagging means your spine is holding you up; hips piked means you are resting.',
        zh: '骨盆略微内收，抹平腰部的凹陷。塌腰是用腰在撑，臀部抬太高是在偷懒。',
      },
      breath: {
        ko: '숨을 참지 마십시오. 배에 힘을 준 채로도 얕게 계속 쉴 수 있습니다.',
        en: 'Do not hold your breath. You can keep breathing shallowly with the abs braced.',
        zh: '不要憋气。收紧腹部的同时依然可以浅浅地持续呼吸。',
      } },
    { t0: 3.20, t1: 4.50,
      name: { ko: '다리와 발', en: 'Legs & feet', zh: '腿与脚' },
      form: {
        ko: '무릎을 꽉 펴고 허벅지에 힘을 줍니다. 발은 어깨너비보다 좁을수록 어렵습니다 — 처음에는 조금 벌려서 시작하십시오.',
        en: 'Straighten the knees and squeeze the thighs. The closer your feet, the harder it gets — start with them slightly apart.',
        zh: '绷直膝盖，夹紧大腿。双脚越窄越难 — 刚开始可以稍微分开一点。',
      },
      breath: {
        ko: '내쉴 때 배가 풀리지 않게 합니다. 힘은 계속 준 채로 공기만 나갑니다.',
        en: 'Do not let the brace go when you exhale — only the air leaves, the tension stays.',
        zh: '呼气时腹部不要松掉，只是把气排出，张力保持不变。',
      } },
    { t0: 4.50, t1: 5.80,
      name: { ko: '목과 시선', en: 'Neck & gaze', zh: '颈部与视线' },
      form: {
        ko: '고개를 들지 말고 바닥 한 뼘 앞을 봅니다. 앞을 보려고 고개를 들면 목이 꺾인 채로 버티게 됩니다.',
        en: 'Look at the floor a hand-span ahead instead of lifting your head. Craning to look forward holds your neck in extension the whole time.',
        zh: '不要抬头，看向前方一掌远的地面。抬头看前方会让颈椎一直处于折角状态。',
      },
      breath: {
        ko: '코로 들이마시고 입으로 천천히 내쉬면 버티는 시간이 늘어납니다.',
        en: 'In through the nose, slowly out through the mouth — it stretches how long you last.',
        zh: '用鼻子吸气、嘴巴慢慢呼气，能撑得更久。',
      } },
    { t0: 5.80, t1: 7.60,
      name: { ko: '버티는 동안', en: 'While you hold', zh: '保持期间' },
      form: {
        ko: '시간을 늘리는 것보다 **무너지기 전에 끝내는 것**이 낫습니다. 엉덩이가 처지기 시작하면 그 순간이 그날의 한계입니다.',
        en: 'Ending before the form breaks beats adding seconds. The moment the hips start to sag, that was your limit today.',
        zh: '在姿势垮掉之前结束，好过硬撑时间。臀部开始下沉的那一刻就是今天的极限。',
      },
      breath: {
        ko: '숨을 참으면 30초를 못 버팁니다. 네 셀 동안 들이마시고 네 셀 동안 내쉬는 박자를 유지하십시오.',
        en: "Hold your breath and you will not last 30 seconds. Keep a rhythm — in for four, out for four.",
        zh: '憋气撑不过30秒。保持节奏：吸四拍，呼四拍。',
      } },
  ],

  // ── 크런치 (clip-6) ──────────────────────────────────
  CRUNCH: [
    { t0: 5.10, t1: 5.35,
      name: { ko: '누운 자세', en: 'Start position', zh: '仰卧起始' },
      form: {
        ko: '무릎을 세우고 허리는 바닥에 붙입니다. 손은 가슴에 얹거나 귀 옆에 살짝 대는 정도로 두십시오 — 깍지 껴서 머리를 받치면 당기게 됩니다.',
        en: 'Knees bent, lower back pressed to the floor. Rest your hands on your chest or lightly by your ears — laced behind the head invites pulling.',
        zh: '屈膝，腰部贴地。双手放胸前或轻搭耳侧 — 十指交叉抱头就会去拉脖子。',
      },
      breath: {
        ko: '시작 전에 들이마십니다.',
        en: 'Breathe in before you start.',
        zh: '开始前先吸气。',
      } },
    { t0: 5.35, t1: 5.85,
      name: { ko: '말아 올리기', en: 'Curl up', zh: '卷起' },
      form: {
        ko: '상체를 통째로 드는 것이 아니라 등뼈를 한 마디씩 **말아** 올립니다. 어깨뼈가 바닥에서 떨어지는 정도면 충분합니다.',
        en: 'Roll the spine up one segment at a time rather than lifting the whole torso. Shoulder blades clearing the floor is enough.',
        zh: '不是把整个上身抬起来，而是脊柱一节一节地卷。肩胛骨离地就够了。',
      },
      breath: {
        ko: '말아 올리면서 내쉽니다. 내쉬는 힘 자체가 복근을 조여 줍니다.',
        en: 'Exhale as you curl — the act of breathing out tightens the abs for you.',
        zh: '卷起时呼气，呼气本身就会帮你收紧腹部。',
      } },
    { t0: 5.85, t1: 6.15,
      name: { ko: '최고점', en: 'Top', zh: '最高点' },
      form: {
        ko: '맨 위에서 반 박자 멈추고 배를 한 번 더 조입니다. 턱과 가슴 사이에 주먹 하나가 들어갈 만큼 벌려 두십시오.',
        en: 'Pause half a beat at the top and squeeze the abs once more. Keep a fist of space between chin and chest.',
        zh: '在最高点停半拍，再收一次腹。下巴和胸口之间留一个拳头的距离。',
      },
      breath: {
        ko: '다 내쉰 상태로 멈춥니다.',
        en: 'Pause with the air already out.',
        zh: '在气呼尽的状态下停住。',
      } },
    { t0: 6.15, t1: 6.60,
      name: { ko: '천천히 내리기', en: 'Lower slowly', zh: '缓慢下放' },
      form: {
        ko: '올라간 속도의 두 배로 천천히 내려옵니다. 툭 떨어뜨리면 절반을 버리는 셈입니다 — 복근은 내려올 때 더 많이 씁니다.',
        en: 'Come down twice as slowly as you went up. Dropping wastes half the rep — the abs work harder on the way down.',
        zh: '下放速度是卷起的两倍慢。直接躺回去等于浪费一半 — 腹肌在下放时用得更多。',
      },
      breath: {
        ko: '내려오면서 들이마십니다. 완전히 눕기 전에 다음 회를 시작합니다.',
        en: 'Breathe in on the way down, and start the next rep before you are fully flat.',
        zh: '下放时吸气，还没完全躺平就开始下一次。',
      } },
  ],

  // ── 레그레이즈 (clip-7) ──────────────────────────────
  LEGRAISE: [
    { t0: 3.70, t1: 3.95,
      name: { ko: '준비 자세', en: 'Start position', zh: '起始姿势' },
      form: {
        ko: '누워서 손바닥을 엉덩이 밑에 깔면 허리가 뜨지 않습니다. 다리는 곧게 펴 모아 둡니다.',
        en: 'Lie down and slide your palms under your hips — that keeps the lower back down. Legs straight and together.',
        zh: '仰卧，把手掌垫在臀部下方，腰就不会拱起。双腿伸直并拢。',
      },
      breath: {
        ko: '들어올리기 전에 들이마십니다.',
        en: 'Breathe in before you lift.',
        zh: '上抬前先吸气。',
      } },
    { t0: 3.95, t1: 4.45,
      name: { ko: '들어 올리기', en: 'Raise', zh: '上抬' },
      form: {
        ko: '반동 없이 아랫배 힘으로만 올립니다. 다리를 흔들어 올리면 허리가 따라 들리면서 복근 대신 고관절 굴곡근이 일합니다.',
        en: 'Lift with the lower abs, no swing. Kick the legs up and your back lifts with them — the hip flexors take over from the abs.',
        zh: '不要借力甩腿，用下腹发力上抬。甩腿会带起腰部，变成髋屈肌在做功。',
      },
      breath: {
        ko: '올리면서 내쉽니다.',
        en: 'Exhale as you raise.',
        zh: '上抬时呼气。',
      } },
    { t0: 4.45, t1: 4.90,
      name: { ko: '최고점', en: 'Top', zh: '最高点' },
      form: {
        ko: '다리가 바닥과 수직이 되면 거기까지입니다. 더 넘기면 엉덩이가 들리면서 복근에서 힘이 빠집니다.',
        en: 'Stop when the legs are vertical. Going past that lifts your hips and the tension drains out of the abs.',
        zh: '双腿与地面垂直就到位了。再往过去会带起臀部，腹部的张力就没了。',
      },
      breath: {
        ko: '숨을 다 내쉰 채로 반 박자 멈춥니다.',
        en: 'Pause half a beat with the air out.',
        zh: '呼尽气后停半拍。',
      } },
    { t0: 4.90, t1: 5.45,
      name: { ko: '천천히 내리기', en: 'Lower slowly', zh: '缓慢下放' },
      form: {
        ko: '내려오는 동안 허리가 바닥에서 뜨는지 계속 확인합니다. 뜨기 시작하면 그 높이가 오늘의 한계이니 거기서 멈추고 다시 올리십시오.',
        en: 'Watch whether your lower back peels off the floor as you descend. The height where it starts is your limit today — stop there and go back up.',
        zh: '下放时留意腰部是否离地。开始离地的那个高度就是今天的极限，到那里就停住再抬起。',
      },
      breath: {
        ko: '내리면서 들이마십니다.',
        en: 'Breathe in as you lower.',
        zh: '下放时吸气。',
      } },
    { t0: 5.45, t1: 5.85,
      name: { ko: '바닥 직전 멈춤', en: 'Stop short of the floor', zh: '离地前停住' },
      form: {
        ko: '발뒤꿈치를 바닥에 대지 않고 한 뼘 위에서 멈춥니다. 여기서 쉬어 버리면 복근의 긴장이 끊겨 다음 회가 처음부터 다시 시작됩니다.',
        en: 'Stop a hand-span above the floor instead of touching down. Resting here breaks the tension and the next rep starts from scratch.',
        zh: '脚跟不落地，在离地一掌高处停住。在这里休息会断掉腹部张力，下一次等于从头再来。',
      },
      breath: {
        ko: '들이마신 채로 멈췄다가 그대로 다시 올립니다.',
        en: 'Pause with the air in, then go straight back up.',
        zh: '吸着气停住，然后直接再抬起。',
      } },
  ],

  // ── 힙브릿지 (clip-8) ────────────────────────────────
  HIPBRIDGE: [
    { t0: 10.00, t1: 10.30,
      name: { ko: '준비 자세', en: 'Start position', zh: '起始姿势' },
      form: {
        ko: '무릎을 세우고 발뒤꿈치를 엉덩이 쪽으로 당겨 놓습니다. 발이 멀면 허벅지 뒤가, 가까우면 엉덩이가 일합니다 — 손끝이 뒤꿈치에 닿을 정도가 기준입니다.',
        en: 'Knees up, heels pulled in toward your hips. Feet far away works the hamstrings, close works the glutes — aim for fingertips just touching your heels.',
        zh: '屈膝，脚跟收向臀部。脚放远练腘绳肌，放近练臀 — 指尖刚好碰到脚跟为准。',
      },
      breath: {
        ko: '들어올리기 전에 들이마십니다.',
        en: 'Breathe in before you lift.',
        zh: '上抬前先吸气。',
      } },
    { t0: 10.30, t1: 10.62,
      name: { ko: '엉덩이 들어올리기', en: 'Drive up', zh: '抬臀' },
      form: {
        ko: '허리로 밀어 올리지 말고 **엉덩이를 조이는 힘**으로 올립니다. 발뒤꿈치로 바닥을 누른다고 생각하면 저절로 둔근이 먼저 켜집니다.',
        en: 'Lift by squeezing the glutes, not by arching the back. Think about pressing through your heels and the glutes fire first on their own.',
        zh: '不要用腰去顶，而是靠夹臀发力。想着用脚跟压地，臀部自然会先启动。',
      },
      breath: {
        ko: '올리면서 내쉽니다.',
        en: 'Exhale as you drive up.',
        zh: '抬起时呼气。',
      } },
    { t0: 10.62, t1: 10.95,
      name: { ko: '최고점', en: 'Top', zh: '最高点' },
      form: {
        ko: '무릎·엉덩이·어깨가 한 줄이 되면 거기까지입니다. 더 올리면 허리만 꺾이는 것이지 엉덩이가 더 일하는 것이 아닙니다.',
        en: 'Knees, hips and shoulders in one line — that is the top. Higher only arches the lower back; it does not add glute work.',
        zh: '膝、髋、肩成一条直线就到位。再高只是把腰折起来，臀部并没有多做功。',
      },
      breath: {
        ko: '다 내쉰 채로 엉덩이를 한 번 더 조이며 멈춥니다.',
        en: 'Pause with the air out and squeeze the glutes once more.',
        zh: '呼尽气停住，再夹一次臀。',
      } },
    { t0: 10.95, t1: 11.35,
      name: { ko: '내려오기', en: 'Lower', zh: '下放' },
      form: {
        ko: '등 위쪽부터 차례로 바닥에 내려놓습니다. 엉덩이는 바닥에 완전히 닿기 직전에 멈추면 긴장이 안 끊깁니다.',
        en: 'Set down from the upper back first. Stop just before the hips touch and the tension never lets go.',
        zh: '从上背开始依次放回地面。臀部在快碰地时停住，张力就不会断。',
      },
      breath: {
        ko: '내려오면서 들이마십니다.',
        en: 'Breathe in on the way down.',
        zh: '下放时吸气。',
      } },
  ],

  // ── 푸쉬업 (clip-9, 걸어 들어온 뒤 2번째 회) ─────────
  PUSHUP: [
    { t0: 4.80, t1: 5.05,
      name: { ko: '준비 자세', en: 'Start position', zh: '起始姿势' },
      form: {
        ko: '손은 어깨보다 살짝 넓게, 머리부터 발뒤꿈치까지 한 줄입니다. 엉덩이가 솟거나 처지지 않았는지 먼저 확인하십시오.',
        en: 'Hands slightly wider than the shoulders, body in one line from head to heels. Check the hips are neither piked nor sagging before you move.',
        zh: '双手略宽于肩，从头到脚跟成一条直线。先确认臀部没有抬高也没有下沉。',
      },
      breath: {
        ko: '내려가기 전에 들이마십니다.',
        en: 'Breathe in before you lower.',
        zh: '下放前先吸气。',
      } },
    { t0: 5.05, t1: 5.45,
      name: { ko: '내려가기', en: 'Descent', zh: '下放' },
      form: {
        ko: '팔꿈치를 옆으로 활짝 벌리지 말고 몸통에서 45도쯤에 둡니다. 90도로 벌리면 어깨 관절 앞쪽이 눌립니다.',
        en: 'Keep the elbows about 45° from your body, not flared straight out. At 90° the front of the shoulder joint gets pinched.',
        zh: '手肘与身体约成45度，不要完全外展。张到90度会挤压肩关节前侧。',
      },
      breath: {
        ko: '숨을 참은 채로 내려갑니다. 몸통이 한 줄로 유지되는 것은 그 압력 덕입니다.',
        en: 'Lower with the breath held — that pressure is what keeps the body in one line.',
        zh: '憋着气下放，正是这股压力让身体保持一条直线。',
      } },
    { t0: 5.45, t1: 5.75,
      name: { ko: '최저점', en: 'Bottom', zh: '最低点' },
      form: {
        ko: '가슴이 주먹 하나 높이까지 내려옵니다. 바닥에 눕지 말고, 배부터 닿는다면 엉덩이가 처진 것입니다.',
        en: 'Chest down to about a fist off the floor. Do not rest on the ground — if your belly touches first, the hips have sagged.',
        zh: '胸口下降到离地约一拳。不要趴到地上，如果肚子先碰地，说明臀部塌了。',
      },
      breath: {
        ko: '여기서 쉬지 않습니다. 숨은 참은 채 바로 되돌립니다.',
        en: 'No resting here — still holding the breath, reverse straight away.',
        zh: '这里不要停。继续屏气，直接往回推。',
      } },
    { t0: 5.75, t1: 6.05,
      name: { ko: '밀어 올리기', en: 'Press up', zh: '推起' },
      form: {
        ko: '가슴과 엉덩이가 같이 올라와야 합니다. 엉덩이가 뒤처지면 허리가 꺾이고, 먼저 올라오면 힘이 팔에 안 실립니다.',
        en: 'Chest and hips must rise together. Hips lagging arches the back; hips leading takes the load off your arms.',
        zh: '胸和臀要一起上来。臀部落后会塌腰，臀部先起来则手臂吃不到力。',
      },
      breath: {
        ko: '밀어 올리면서 내쉽니다.',
        en: 'Exhale as you press.',
        zh: '推起时呼气。',
      } },
    { t0: 6.05, t1: 6.30,
      name: { ko: '마무리', en: 'Top', zh: '收势' },
      form: {
        ko: '위에서 팔을 다 펴되 팔꿈치를 꽉 잠그지는 마십시오. 어깨를 앞으로 살짝 밀어 등을 넓게 펴 주면 다음 회가 안정됩니다.',
        en: 'Straighten the arms at the top without hard-locking the elbows. Push the shoulders slightly forward to spread the upper back and the next rep is steadier.',
        zh: '顶端把手臂伸直，但不要把肘完全锁死。肩膀略向前推、把上背撑开，下一次会更稳。',
      },
      breath: {
        ko: '다 내쉬고 다시 들이마십니다.',
        en: 'Finish the exhale, then breathe in again.',
        zh: '呼尽后再吸气。',
      } },
  ],

  // ── 파이크푸쉬업 (clip-10) ───────────────────────────
  PIKEPUSHUP: [
    { t0: 4.90, t1: 5.20,
      name: { ko: '역V 만들기', en: 'Build the pike', zh: '摆出倒V' },
      form: {
        ko: '엉덩이를 최대한 높이 들어 몸을 뒤집힌 V 로 만듭니다. 엉덩이가 낮으면 그냥 푸쉬업이 되어 어깨가 아니라 가슴이 일합니다.',
        en: 'Push the hips as high as you can into an inverted V. A low hip position turns it back into a push-up and the chest takes over from the shoulders.',
        zh: '臀部尽量抬高，身体摆成倒V。臀位太低就变成普通俯卧撑，练的是胸而不是肩。',
      },
      breath: {
        ko: '자세를 잡고 나서 들이마십니다.',
        en: 'Set the position, then breathe in.',
        zh: '摆好姿势后吸气。',
      } },
    { t0: 5.20, t1: 5.55,
      name: { ko: '머리 내리기', en: 'Lower the head', zh: '头部下压' },
      form: {
        ko: '머리를 손 사이가 아니라 **손보다 조금 앞쪽** 바닥으로 내립니다. 손 사이로 내리면 어깨가 아니라 삼두만 쓰게 됩니다.',
        en: 'Lower the head to a spot slightly ahead of your hands, not between them. Straight down between the hands makes it a triceps move instead of a shoulder one.',
        zh: '头部下压到双手稍前方的位置，而不是两手之间。压在两手之间就只练到三头，练不到肩。',
      },
      breath: {
        ko: '숨을 참은 채로 내려갑니다.',
        en: 'Hold the breath as you lower.',
        zh: '憋着气往下。',
      } },
    { t0: 5.55, t1: 5.80,
      name: { ko: '최저점', en: 'Bottom', zh: '最低点' },
      form: {
        ko: '정수리가 바닥에 살짝 닿을 듯한 높이까지. 목을 눌러 체중을 싣지 마십시오 — 무게는 손에 남아 있어야 합니다.',
        en: 'Down until the crown of your head almost brushes the floor. Never rest weight on your neck — the load stays in your hands.',
        zh: '下降到头顶快要碰地。不要把体重压在颈部 — 重量必须留在手上。',
      },
      breath: {
        ko: '멈추는 동안에도 숨은 참고 있습니다.',
        en: 'Keep holding the breath through the pause.',
        zh: '停顿时仍然屏气。',
      } },
    { t0: 5.80, t1: 6.10,
      name: { ko: '밀어 올리기', en: 'Press up', zh: '推起' },
      form: {
        ko: '손바닥으로 바닥을 밀어내면서 어깨를 폅니다. 엉덩이가 앞으로 내려오면 각도가 무너지므로 엉덩이 높이는 그대로 두십시오.',
        en: 'Press the floor away and open the shoulders. Keep the hips high — if they drop forward the angle collapses.',
        zh: '用手掌把地面推开，打开肩膀。臀部保持高位，一旦前落角度就垮了。',
      },
      breath: {
        ko: '밀어 올리며 내쉽니다.',
        en: 'Exhale as you press.',
        zh: '推起时呼气。',
      } },
    { t0: 6.10, t1: 6.35,
      name: { ko: '마무리', en: 'Top', zh: '收势' },
      form: {
        ko: '팔을 다 펴고 다시 역V 로 돌아옵니다. 어렵다면 발을 뒤로 조금 물려 각도를 낮추면 됩니다 — 그것도 같은 운동입니다.',
        en: 'Arms straight, back into the pike. If it is too hard, walk your feet back a little to lower the angle — it is still the same exercise.',
        zh: '手臂伸直，回到倒V。太难就把脚往后挪一点、降低角度 — 那依然是同一个动作。',
      },
      breath: {
        ko: '다 내쉬고 다음 회를 위해 들이마십니다.',
        en: 'Finish the exhale and breathe in for the next rep.',
        zh: '呼尽后为下一次吸气。',
      } },
  ],

  // ── 제자리 달리기 (clip-11) ──────────────────────────
  //
  // 한 걸음이 0.3초쯤이라 걸음을 국면으로 자르면 눈으로 못 좇는다.
  // 대신 볼 곳을 셋으로 나눈다 — 화면은 계속 달리고, 글이 어디를 볼지 짚는다.
  RUNINPLACE: [
    { t0: 4.00, t1: 4.60,
      name: { ko: '무릎 높이', en: 'Knee height', zh: '抬膝高度' },
      form: {
        ko: '무릎을 골반 높이까지 올립니다. 발만 뒤로 차는 것은 제자리 달리기가 아니라 제자리 뜀뛰기입니다 — 무릎이 안 올라오면 배가 일하지 않습니다.',
        en: 'Drive the knees up to hip height. Just flicking the heels back is jogging on the spot, not high knees — without the knee lift the core does nothing.',
        zh: '把膝盖抬到髋部高度。只把脚往后甩是原地跳，不是高抬腿 — 膝盖不上来，核心就没参与。',
      },
      breath: {
        ko: '두 걸음에 들이마시고 두 걸음에 내쉬는 박자를 잡으십시오.',
        en: 'Find a rhythm — in for two steps, out for two steps.',
        zh: '找到节奏：两步吸气，两步呼气。',
      } },
    { t0: 4.60, t1: 5.10,
      name: { ko: '착지', en: 'Landing', zh: '落地' },
      form: {
        ko: '앞꿈치로 가볍게 받습니다. 뒤꿈치부터 쿵 내려놓으면 그 충격이 무릎과 허리로 그대로 올라옵니다.',
        en: 'Land softly on the balls of your feet. Slamming down heel-first sends the shock straight up into the knees and back.',
        zh: '用前脚掌轻轻落地。脚跟重重砸地，冲击会直接传到膝盖和腰。',
      },
      breath: {
        ko: '숨이 차기 시작해도 참지 말고 리듬을 유지하십시오.',
        en: 'When you start to get out of breath, keep the rhythm rather than holding it.',
        zh: '开始喘的时候不要憋气，保持节奏。',
      } },
    { t0: 5.10, t1: 5.60,
      name: { ko: '상체와 팔', en: 'Torso & arms', zh: '上身与手臂' },
      form: {
        ko: '상체는 곧게 세우고 팔은 몸 옆에서 앞뒤로 흔듭니다. 팔이 몸 앞을 가로지르면 몸통이 좌우로 비틀려 힘이 샙니다.',
        en: 'Stay upright and swing the arms front-to-back beside you. Arms crossing the body twist the trunk side to side and leak power.',
        zh: '上身保持直立，手臂在身侧前后摆动。手臂横过身前会让躯干左右扭转，力量就散了。',
      },
      breath: {
        ko: '입으로 짧고 규칙적으로 내쉬는 편이 오래갑니다.',
        en: 'Short, regular exhales through the mouth last longer.',
        zh: '用嘴短促而规律地呼气，能撑得更久。',
      } },
  ],

  // ── 배밀기 (clip-12) ─────────────────────────────────
  ARMYCRAWL: [
    { t0: 6.00, t1: 6.35,
      name: { ko: '자세 낮추기', en: 'Stay low', zh: '压低身体' },
      form: {
        ko: '엉덩이를 낮게 유지합니다. 엉덩이가 솟으면 그냥 네발로 기는 것이 되어 코어가 빠집니다 — 낮을수록 배가 일합니다.',
        en: 'Keep the hips low. Let them rise and it becomes crawling on all fours with the core switched off — the lower you stay, the more your abs work.',
        zh: '保持臀部低位。臀部一抬就变成四肢爬行，核心就不参与了 — 压得越低，腹部越吃力。',
      },
      breath: {
        ko: '낮은 자세에서는 숨이 얕아집니다. 참지 말고 짧게라도 계속 쉬십시오.',
        en: 'Breathing goes shallow down low. Do not hold it — keep breathing, even in short bursts.',
        zh: '低姿势下呼吸会变浅。不要憋气，哪怕短促也要持续呼吸。',
      } },
    { t0: 6.35, t1: 6.75,
      name: { ko: '팔 뻗어 당기기', en: 'Reach & pull', zh: '伸手拉动' },
      form: {
        ko: '한쪽 팔을 앞으로 뻗어 바닥을 잡고 몸을 끌어옵니다. 손목이 어깨보다 앞서 멀리 나가면 체중이 손목에 얹혀 눌립니다.',
        en: 'Reach one arm forward, grip the floor and pull yourself along. Plant the wrist too far ahead of the shoulder and your weight lands on the joint.',
        zh: '一只手向前伸、抓住地面把身体拉过去。手腕落得太靠前，体重就压在腕关节上。',
      },
      breath: {
        ko: '끌어당기는 순간에 내쉽니다.',
        en: 'Exhale on the pull.',
        zh: '拉动的瞬间呼气。',
      } },
    { t0: 6.75, t1: 7.15,
      name: { ko: '반대 무릎 끌어오기', en: 'Drive the opposite knee', zh: '带动对侧膝' },
      form: {
        ko: '뻗은 팔의 **반대쪽** 무릎을 옆구리 쪽으로 끌어옵니다. 같은 쪽 팔다리가 함께 나가면 몸이 좌우로 흔들리며 앞으로 안 나갑니다.',
        en: 'Bring the knee opposite the reaching arm up toward your ribs. Moving the same-side limbs together just rocks you side to side without going anywhere.',
        zh: '把与伸出手臂相对侧的膝盖收向肋侧。同侧手脚一起动只会左右晃，前进不了。',
      },
      breath: {
        ko: '한 번 나아갈 때마다 한 번 내쉬는 박자로 맞추십시오.',
        en: 'Match it up — one exhale for each stride forward.',
        zh: '对上节奏：每前进一次，呼气一次。',
      } },
  ],
};

/** 이 동작에 국면 코칭이 있는가. 없으면 null — 부르는 쪽이 칩 줄을 감춘다. */
export function phasesFor(key) {
  return EXERCISE_PHASES[key] || null;
}
