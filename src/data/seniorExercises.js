// 어르신·재활 모드(2026-09-27)의 동작 9종.
//
// src/data/exercises.js 의 24종과는 다른 카탈로그다 — 전부 의자에 앉거나
// 벽·의자를 짚고 하는 저강도 동작이라 그 24종(전부 바닥 운동)과 안 겹치고,
// 영상도 없다(scripts/media.mjs 가 지키는 "동작은 영상으로 보여준다" 규칙을
// 새로 촬영하지 않고는 못 지킨다 — src/ui/quickStart.js 의 difficultyExercises
// 표와 같은 사정). 대신 pictogram(아래) 을 하나씩 붙인다.
//
// duration 은 전부 고정이다(성장 없음) — 이 모드는 빨리 많이 하는 게
// 아니라 다치지 않고 끝까지 하는 게 목적이라, 공용 미션 엔진의 "라운드마다
// 1.1배씩 길어짐"을 안 쓴다.
export const SENIOR_EXERCISE_DURATION_SEC = 30;
export const SENIOR_REST_DURATION_SEC = 15;

// pictogram: src/ui/seniorPictograms.js 의 키. 실루엣 하나(SEATED/STANDING)에
// 팔다리 궤적만 동작마다 다르게 그린다 — 전부 새로 그리지 않고도 9종을
// 일관된 그림체로 만들 수 있다.
export const SENIOR_EXERCISES = [
  {
    key: 'CHAIR_SIT_STAND',
    pictogram: 'sitStand',
    name: { ko: '의자 잡고 앉았다 일어나기', en: 'Sit-to-stand with a chair', zh: '扶椅起坐' },
    cue: { ko: '의자 앞쪽에 앉아 양손으로 팔걸이나 좌석을 짚고, 천천히 일어났다가 다시 앉기를 반복합니다.', en: 'Sit at the front of a chair, press your hands on the armrests or seat, and slowly stand up and sit back down.', zh: '坐在椅子前部，双手撑住扶手或座面，缓慢起立后再坐下，重复进行。' },
  },
  {
    key: 'WALL_PUSHUP',
    pictogram: 'wallPushup',
    name: { ko: '벽 짚고 팔굽혀펴기', en: 'Wall push-up', zh: '靠墙俯卧撑' },
    cue: { ko: '벽에서 한 걸음 떨어져 서서 양손으로 벽을 짚고, 팔을 굽혔다 펴며 몸을 벽 쪽으로 천천히 기울입니다.', en: 'Stand an arm\'s length from a wall, place both hands on it, and slowly bend and straighten your elbows.', zh:'站在离墙一步远处，双手扶墙，缓慢屈伸手臂让身体靠近墙面再推回。' },
  },
  {
    key: 'SEATED_MARCH',
    pictogram: 'seatedMarch',
    name: { ko: '앉아서 제자리 걷기', en: 'Seated marching', zh: '坐姿原地踏步' },
    cue: { ko: '의자에 허리를 펴고 앉아, 무릎을 한쪽씩 천천히 들어올리며 제자리에서 걷듯이 움직입니다.', en: 'Sit tall in a chair and slowly lift one knee at a time, as if marching in place.', zh: '坐正在椅子上，双膝交替缓慢抬起，像原地踏步一样活动。' },
  },
  {
    key: 'SEATED_ANKLE_PUMP',
    pictogram: 'anklePump',
    name: { ko: '앉아서 발목 위아래로 움직이기', en: 'Seated ankle pumps', zh: '坐姿踝泵' },
    cue: { ko: '의자에 앉아 발뒤꿈치를 바닥에 댄 채, 발끝을 천천히 위아래로 움직여 혈액순환을 돕습니다.', en: 'Sit with heels on the floor and slowly pump your toes up and down to help circulation.', zh: '坐姿，脚跟着地，脚尖缓慢上下活动，有助于血液循环。' },
  },
  {
    key: 'SEATED_ARM_RAISE',
    pictogram: 'armRaise',
    name: { ko: '앉아서 양팔 들어올리기', en: 'Seated arm raises', zh: '坐姿举臂' },
    cue: { ko: '의자에 앉아 양팔을 앞으로 천천히 들어올렸다가, 어깨 높이에서 잠시 멈춘 뒤 다시 내립니다.', en: 'Sit and slowly raise both arms forward to shoulder height, pause, then lower them.', zh: '坐姿，双臂缓慢前举至肩高，稍作停顿后放下。' },
  },
  {
    key: 'SEATED_KNEE_EXTENSION',
    pictogram: 'kneeExtension',
    name: { ko: '앉아서 무릎 펴기', en: 'Seated knee extension', zh: '坐姿伸膝' },
    cue: { ko: '의자에 앉아 한쪽 다리를 천천히 곧게 펴 들어올렸다가, 다시 천천히 내립니다. 양쪽을 번갈아 합니다.', en: 'Sit and slowly straighten one leg out, hold briefly, then lower it. Alternate legs.', zh: '坐姿，一侧腿缓慢伸直抬起，稍停后放下，两侧交替进行。' },
  },
  {
    key: 'SHOULDER_ROLL',
    pictogram: 'shoulderRoll',
    name: { ko: '어깨 천천히 돌리기', en: 'Slow shoulder rolls', zh: '缓慢转肩' },
    cue: { ko: '양쪽 어깨를 귀 쪽으로 들어올렸다가 뒤로, 아래로 천천히 크게 돌려줍니다.', en: 'Lift both shoulders toward your ears, then slowly roll them back and down in a big circle.', zh: '双肩缓慢向耳朵方向抬起，再向后、向下画大圈转动。' },
  },
  {
    key: 'NECK_TILT',
    pictogram: 'neckTilt',
    name: { ko: '목 좌우로 천천히 기울이기', en: 'Slow neck tilts', zh: '缓慢侧倾颈部' },
    cue: { ko: '어깨는 그대로 두고, 고개만 한쪽으로 천천히 기울였다가 반대쪽으로 천천히 넘깁니다.', en: 'Keep your shoulders still and slowly tilt your head to one side, then the other.', zh: '肩膀保持不动，头部缓慢倒向一侧，再倒向另一侧。' },
  },
  {
    key: 'SEATED_TORSO_TWIST',
    pictogram: 'torsoTwist',
    name: { ko: '앉아서 상체 살짝 틀기', en: 'Seated torso twist', zh: '坐姿转体' },
    cue: { ko: '의자에 앉아 허리를 편 채로 상체만 천천히 좌우로 살짝 돌려줍니다. 반동을 주지 않습니다.', en: 'Sit tall and slowly twist your upper body side to side, without any bouncing.', zh: '坐正，上身缓慢左右轻转，不要借助反弹力。' },
  },
];
